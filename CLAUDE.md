# Claude Context Visualizer

A web-based inspection tool for Claude Code's configuration and runtime context. Scans and visualizes settings, MCP servers, plugins, skills, hooks, commands, and markdown documentation across global (~/.claude), project-local, and custom sources.

@AGENTS.md

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

**Project discovery** (`/api/projects`): Scans `~/conductor/workspaces/` for worktrees, reads each worktree's `.git` file to resolve the main repo path (which may be in `conductor/repos/` or elsewhere), and groups everything into `ConductorProject` objects (name, mainRepo, worktrees[]). Also discovers projects from `~/.claude.json` and `~/.claude/projects/`.

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

# MCP introspection (unified)
bun run scan --introspect --all -p <path>          # Introspect all MCP servers
bun run scan --introspect --server <name> -p <path> # Introspect one server
```

### API (dev server at :3000)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects` | All projects, conductor repos/worktrees, conductor dir |
| GET | `/api/context?project=<path>` | Full scan (sources, MCP, plugins, skills, hooks, commands, CLAUDE.md, markdowns) |
| GET | `/api/file?path=<path>` | Read any file (JSON secrets masked) |
| POST | `/api/file` | Write .md files |
| POST | `/api/mcp-introspect` | Live MCP server introspection (tools, resources, prompts) |
| POST | `/api/browse` | macOS folder picker |

### What the scanner extracts

For any project path, the scanner discovers and returns:
- **Sources**: 14 config file locations checked (global settings, client state, plugins, skills dirs, project settings, CLAUDE.md, .mcp.json, commands, shared settings, user project CLAUDE.md, auto-memory)
- **MCP Servers**: from ~/.claude.json (global + per-project), .mcp.json, plugin configs
- **Plugins**: name, version, install path, marketplace, and all sub-resources (skills, hooks, agents, commands, MCP servers)
- **Skills**: from plugins, ~/.claude/skills/, ~/.agents/skills/, project skills dirs, commands-as-skills, built-in skills (extracted from Claude binary)
- **Hooks**: from global/local/shared settings, plugin hooks.json, session cache hooks — with event, command, matcher, resolved script paths
- **Commands**: from ~/.claude/commands/ and project commands dirs, with YAML frontmatter metadata
- **CLAUDE.md**: fully resolved with @include directives expanded (recursive, 5 levels deep)
- **Markdown files**: all .md files from ~/.claude/, project root, .claude/, docs/, .skills/, auto-memory

## Conventions

- UI components use shadcn/ui patterns with Radix primitives
- Skill/command metadata uses YAML frontmatter in .md files
- Token estimation: ~1 token per 4 characters
- Scanned items have scope levels: `global`, `local`, `custom`
- Deduplication prevents the same skill/hook from appearing multiple times
