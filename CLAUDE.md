# Claude Context Visualizer

A web-based inspection tool for Claude Code's configuration and runtime context. Scans and visualizes settings, MCP servers, plugins, skills, hooks, commands, and markdown documentation across global (\~/.claude), project-local, and custom sources.

# CONDUCTOR

You are running inside a **Conductor worktree**. The workspace is a git worktree under `~/conductor/workspaces/puffle-app/`. Everything is already set up:

- `node_modules/` is installed.
- `.env.local` is symlinked — do NOT create or modify it
- Do NOT run any setup, bootstrap, or init commands — the environment is ready to go

### Key things to know

- Conductor uses `@anthropic-ai/claude-agent-sdk` bundled as its own binary at `~/Library/Application Support/com.conductor.app/bin/claude`

- This is **not** the same as running `claude` from the terminal (`~/.local/bin/claude` v2.1.87)

- Skills from `.claude/skills/` directories (filesystem-based discovery), both project level and global.

- Conductor environment variables: `CONDUCTOR_WORKSPACE_PATH`, `CONDUCTOR_ROOT_PATH`, `CONDUCTOR_WORKSPACE_NAME`, `CONDUCTOR_DEFAULT_BRANCH`, `CONDUCTOR_PORT`, `CONDUCTOR_BIN_DIR`

### Conductor workspace structure

- `~/conductor/repos/<repo>/` — Main git repos (source of truth)
- `~/conductor/workspaces/<project>/<worktree>/` — Active git worktrees where agents work
- `~/conductor/archived-contexts/` — Old/completed worktree contexts
- `.context/` directory in each workspace (gitignored) for cross-agent collaboration

### conductor.json

Conductor supports three lifecycle scripts: `setup`, `run`, `archive`.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS v4, Radix UI, shadcn/ui primitives
- **Editor**: Tiptap (rich text markdown editor)
- **Package manager**: bun
- **MCP**: @modelcontextprotocol/sdk for server introspection

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Dev server at http://localhost:3000
bun run build        # Production build
bun run lint         # ESLint
bun run scan         # CLI: scan global context
bun run scan <path>  # CLI: scan project + global context
```

## Project Structure

- `src/app/` — Next.js app router pages and API routes
- `src/app/api/` — Backend endpoints (context, browse, file, mcp-introspect, projects)
- `src/components/` — React UI components (tab views, detail panels, editors)
- `src/components/ui/` — shadcn/ui primitives
- `src/lib/scanner.ts` — Core context scanning logic (the heart of the app)
- `src/lib/types.ts` — Shared TypeScript interfaces
- `src/cli/` — CLI entry points for scanning and MCP introspection

## Architecture

The app has two modes: **web UI** and **CLI**.

**Scanning pipeline** (`src/lib/scanner.ts`): Scans sources in priority order — global settings, client state, installed plugins (with their skills/hooks/commands/agents), session hooks, project-local config (settings, CLAUDE.md with @include support, .mcp.json, skills, commands), shared project settings, and built-in skills extracted from the Claude Code binary.

**Web UI**: Single-page app with tab navigation (Overview, Skills, Hooks, MCP Servers, Plugins, Markdowns, CLAUDE.md). A detail panel slides out to inspect individual items. Supports dark mode.

**API routes**: `/api/context` is the main endpoint that triggers scanning. Other routes handle file browsing, reading/writing files, MCP introspection, and project discovery.

## Conductor Integration

The app is designed to work with the Conductor workflow manager. Conductor organizes projects as:

- `~/conductor/repos/<repo>/` — Main git repos (source of truth). Not all projects live here; some repos exist elsewhere (e.g. `~/Documents/`).
- `~/conductor/workspaces/<project>/<worktree>/` — Active git worktrees where agents work. These always live here regardless of where the main repo is.
- `~/conductor/archived-contexts/` — Old/completed worktree contexts.

**Project discovery** (`/api/projects`): Scans `~/conductor/workspaces/` for worktrees, reads each worktree's `.git` file to resolve the main repo path (which may be in `conductor/repos/` or elsewhere), and groups everything into `ConductorProject` objects (name, mainRepo, worktrees\[\]). Also discovers projects from `~/.claude.json` and `~/.claude/projects/`.

**Project selector UI** (`ProjectSelector.tsx`): Card-based picker with color-coded cards per conductor project. Clicking a project card expands a list showing the main repo and worktrees. Global View and Other (file picker) are separate cards. The app defaults to `~/conductor` on load.

## CLI & API Reference

Full documentation in `plot.md` and the `context-visualizer` skill (`.claude/skills/context-visualizer/SKILL.md`, also symlinked to `~/.claude/skills/`).

### CLI

```bash
# Scanning
bun run scan <path>                  # Full context JSON for a project
bun run scan <path> -s skills        # Just skills
bun run scan <path> -s hooks         # Just hooks
bun run scan <path> -s mcpServers    # Just MCP servers
bun run scan <path> -s plugins       # Just plugins
bun run scan <path> -s commands      # Just commands
bun run scan <path> -s claudeMd      # Resolved CLAUDE.md with @includes
bun run scan <path> -s markdowns     # All discovered .md files
bun run scan <path> -s sources       # All config source paths + found status
bun run scan <path> -s summary       # Quick counts (includes markdown count)

# Project discovery
bun run scan --list-projects         # Known Claude projects from ~/.claude.json
bun run scan --conductor-projects    # Conductor repos, worktrees, main repo paths

# File reading
bun run scan --read-file <path>      # Read any file (JSON secrets masked)

# Hook enrichment (agent-assisted analysis)
bun run scan --dump-hooks -p <path>      # Dump all hooks with source code as JSON
bun run scan --write-enrichments         # Write enrichment JSON from stdin to ~/.claude/hook-enrichments.json

# MCP introspection (unified)
bun run scan --introspect --all -p <path>          # Introspect all MCP servers
bun run scan --introspect --server <name> -p <path> # Introspect one server
```

### API (dev server at :3000)

MethodEndpointPurposeGET`/api/projects`All projects, conductor repos/worktrees, conductor dirGET`/api/context?project=<path>`Full scan (sources, MCP, plugins, skills, hooks, commands, CLAUDE.md, markdowns)GET`/api/file?path=<path>`Read any file (JSON secrets masked)POST`/api/file`Write .md filesPOST`/api/mcp-introspect`Live MCP server introspection (tools, resources, prompts)POST`/api/browse`macOS folder picker

### What the scanner extracts

For any project path, the scanner discovers and returns:

- **Sources**: 14 config file locations checked (global settings, client state, plugins, skills dirs, project settings, CLAUDE.md, .mcp.json, commands, shared settings, user project CLAUDE.md, auto-memory)
- **MCP Servers**: from \~/.claude.json (global + per-project), .mcp.json, plugin configs
- **Plugins**: name, version, install path, marketplace, and all sub-resources (skills, hooks, agents, commands, MCP servers)
- **Skills**: from plugins, \~/.claude/skills/, \~/.agents/skills/, project skills dirs, commands-as-skills, built-in skills (extracted from Claude binary)
- **Hooks**: from global/local/shared settings, plugin hooks.json, session cache hooks — with event, command, matcher, resolved script paths
- **Commands**: from \~/.claude/commands/ and project commands dirs, with YAML frontmatter metadata
- **CLAUDE.md**: fully resolved with @include directives expanded (recursive, 5 levels deep)
- **Markdown files**: all .md files from \~/.claude/, project root, .claude/, docs/, .skills/, auto-memory

## Conventions

- UI components use shadcn/ui patterns with Radix primitives
- Skill/command metadata uses YAML frontmatter in .md files
- Token estimation: \~1 token per 4 characters
- Scanned items have scope levels: `global`, `local`, `custom`
- Deduplication prevents the same skill/hook from appearing multiple times

# SKILLS & MCP Servers

## 

&lt;SUPER_IMPORTANT&gt; If there's even a 1% chance a skill / mcp server / tool is relevant, use it. &lt;/SUPER IMPORTANT&gt;

## How to Access Skills

Use the `Skill` tool. When you invoke a skill, its content is loaded and presented to you—follow it directly. Never use the Read tool on skill files. For all the skills we show here, I will mention their name & description. The description will tell you what it does and when to use it.

# 

# MCP SERVERS & SKILLS

### Nia MCP Server

Nia is an MCP-based knowledge agent available in sessions. It is the best way to search through **external** docs and information. Use it for:

- **Indexing repos/docs**: `mcp__nia__index` to index GitHub repos, documentation sites, papers
- **Searching indexed sources**: `mcp__nia__search` for semantic search, `mcp__nia__nia_grep` for regex
- **Reading indexed content**: `mcp__nia__nia_read` to read files from indexed repos/docs
- **Exploring structure**: `mcp__nia__nia_explore` for file trees
- **Always check Nia first** before using WebFetch or WebSearch — indexed sources provide full, structured content

You can invoke nia through the mcp server

# AGENT RUNS (very very useful)

You must run the code-simplifier agent whenever possible. It will clean up and make everything more readable & maintainable..

# BROWSER-USE

\
We have 2 browser use tools - **expect-cli** and **agent-browser**. Don't ever use any other tool & don't ever write playwright for browser use. If these tools aren't loading, tell the user.

### Expect-CLI Skill for QA

```
After any browser-facing change, run `expect-cli` to adversarially test it. Use this over raw browser tools for verifying UI changes / QA testing in the browser.

Invoke this tool

Note: This is NOT the Unix `expect` command. This is `expect-cli` from npm — an adversarial browser testing tool.
```

### Agent Browser Skill for Website Nav

**agent-browser**

This is your go-to tool for any other interaction with the browser / web outside of QA. This includes finding information, scraping, etc. This is a full-blown browser automation CLI. Think Puppeteer/Playwright but as shell commands. It’s for **doing things** in a browser — scraping, form filling, auth flows, data extraction, visual regression, etc. It’s a general-purpose browser robot

```
For browser verification of code changes → expect-cli
For browser automation tasks (scraping, form filling, navigation) / other tasks → agent-browser
```

# SUPERPOWER-SKILLS (swiss army knife of skills)

## Skill Priority

When multiple skills could apply, use this order:

1. **Process skills first** (brainstorming, debugging) - these determine HOW to approach the task
2. **Implementation skills second** (frontend-design, mcp-builder) - these guide execution

"Let's build X" → brainstorming first, then implementation skills. "Fix this bug" → debugging first, then domain-specific skills.

## Skill Types

**Rigid** (TDD, debugging): Follow exactly. Don't adapt away discipline.

**Flexible** (patterns): Adapt principles to context.

The skill itself tells you which.

## List of Superpowers

```
name: brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
```

```
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
```

```
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
```

```
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
```

```
name: receiving-code-review
description: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
```

```
name: writing plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
```

```
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
```

```
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
```

```
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
User Preferences
```

#

# ALL OTHER SKILLS (very very useful)

```
name: find-skills
description: You can use this if the user asks you to find a skill. Only download reputable skills
```

```
name: skill-creator
description: SUPER IMPORTANT - use when you are told to create a skill
```

```
name: supabase-postgres-best-practices
description: Use when anything about supabase is mentioned
```

```
name: context-visualizer
description: use when user asks about claude code configuration (i.e what skills do you have, what mcps do you have, what hooks, etc.) or when user mentions ccv.
```

```
name: ccv
description: use when user asks about claude code configuration (i.e what skills do you have, what mcps do you have, what hooks, etc.) or when user mentions ccv.
```

```
name: feature-dev
description: use when user asks about a new feature
```

## Vercel Skills

```
name: vercel-react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. Use when writing, reviewing, or refactoring React/Next.js code for optimal performance patterns — components, pages, data fetching, bundle optimization.
```

```
name: building-components
description: Guide for building modern, accessible, and composable UI components. Use when building new components, implementing accessibility, creating composable APIs, setting up design tokens, publishing to npm/registry, or writing component documentation.
```

```
name: vercel-cli
description: Deploy, manage, and develop projects on Vercel from the command line. Use for deployments, project linking, environment variables, and all Vercel platform operations.
```

```
name: next-best-practices
description: Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling
```

```
name: vercel-composition-patterns
description: React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs. Includes React 19 API changes.
```

```
name: vercel-composition-patterns
description: React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs. Includes React 19 API changes.
```

```
name: agnix
description: Run for skill health and claude.md check. if user says 'agx', you should run this. 
```