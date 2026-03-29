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

## Conventions

- UI components use shadcn/ui patterns with Radix primitives
- Skill/command metadata uses YAML frontmatter in .md files
- Token estimation: ~1 token per 4 characters
- Scanned items have scope levels: `global`, `local`, `custom`
- Deduplication prevents the same skill/hook from appearing multiple times
