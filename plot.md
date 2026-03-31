# Claude Context Visualizer — Full Read API

Everything you can programmatically extract from this tool.

## Quick Reference

```bash
# CLI
bun run scan <project-path>                    # Full context JSON
bun run scan <project-path> -s <section>       # Single section
bun run scan --list-projects                   # Known projects
bunx tsx src/cli/mcp-introspect.ts --all       # All MCP servers

# API (dev server at :3000)
GET /api/projects                              # All projects + conductor layout
GET /api/context?project=<path>                # Full scan for a project
GET /api/file?path=<path>                      # Read any file (secrets masked)
POST /api/mcp-introspect                       # Live MCP server introspection
```

---

## 1. Project Discovery

### What you get
- All known Claude projects from `~/.claude.json`
- All projects from `~/.claude/projects/` (slug-resolved to filesystem paths)
- Conductor repos from `~/conductor/repos/`
- Conductor worktrees from `~/conductor/workspaces/<project>/<worktree>/`
- Main repo path for each project (resolved from worktree `.git` pointers)

### How

```bash
# CLI
bun run scan --list-projects

# API
GET /api/projects
```

### Response shape

```json
{
  "projects": [
    { "path": "/abs/path", "lastActive": "2026-03-29T..." }
  ],
  "conductorProjects": [
    {
      "name": "my-project",
      "mainRepo": "~/projects/my-project",
      "worktrees": [
        { "name": "feature-v1", "path": "~/conductor/workspaces/my-project/feature-v1" }
      ]
    }
  ],
  "conductorDir": "~/conductor"
}
```

---

## 2. Full Context Scan

The core scan for any project path. Returns everything Claude Code sees when running in that directory.

### How

```bash
# CLI — full JSON
bun run scan /path/to/project
bun run scan /path/to/project --pretty

# API
GET /api/context?project=/path/to/project
GET /api/context?project=/path&customSource=/extra/settings.json&mdDir=/extra/docs
```

### Response: `ProjectContext`

```json
{
  "projectPath": "/path/to/project",
  "sources": [...],
  "mcpServers": [...],
  "plugins": [...],
  "skills": [...],
  "hooks": [...],
  "commands": [...],
  "claudeMd": "# Full resolved CLAUDE.md content with @includes expanded",
  "markdownFiles": [...]
}
```

---

## 3. Config Sources

Every config file that was checked, whether it exists, and its scope.

```bash
bun run scan /path -s sources
```

### What's checked (in order)

| # | Source | Scope | Path |
|---|--------|-------|------|
| 1 | Global Settings | global | `~/.claude/settings.json` |
| 2 | Client State | global | `~/.claude.json` |
| 3 | Plugins | global | `~/.claude/plugins/installed_plugins.json` |
| 4 | Skills Directory | global | `~/.claude/skills/` |
| 4a | Agents Skills Directory | global | `~/.agents/skills/` |
| 4b | Global Commands | global | `~/.claude/commands/` |
| 5 | Project Settings | local | `<project>/.claude/settings.local.json` |
| 6 | CLAUDE.md | local | `<project>/CLAUDE.md` |
| 7 | MCP Config | local | `<project>/.mcp.json` |
| 8 | Project Skills | local | `<project>/.claude/skills/` |
| 8b | Project Agents Skills | local | `<project>/.agents/skills/` |
| 9 | Project Commands | local | `<project>/.claude/commands/` |
| 10 | Shared Project Settings | local | `<project>/.claude/settings.json` |
| 11 | User Project CLAUDE.md | local | `~/.claude/projects/<slug>/CLAUDE.md` |
| 12 | Auto Memory | local | `~/.claude/projects/<slug>/memory/` |

### Shape

```json
{ "scope": "global|local|custom", "name": "Global Settings", "path": "/abs/path", "found": true }
```

---

## 4. MCP Servers

```bash
bun run scan /path -s mcpServers
```

### Sources discovered from
- `~/.claude.json` → `mcpServers` (global)
- `~/.claude.json` → `projects.<path>.mcpServers` (local)
- `<project>/.mcp.json` (local)
- Plugin `.mcp.json` or `package.json` → `mcpServers` (global)

### Shape

```json
{
  "name": "nia",
  "scope": "global",
  "source": "Client State",
  "sourcePath": "~/.claude.json",
  "type": "stdio",
  "url": null,
  "config": { "command": "...", "args": [...], "env": {...} }
}
```

### Live introspection (tools, resources, prompts)

```bash
# CLI
bunx tsx src/cli/mcp-introspect.ts --all --json
bunx tsx src/cli/mcp-introspect.ts --server nia --json
bunx tsx src/cli/mcp-introspect.ts --server nia --tools-only

# API
POST /api/mcp-introspect
Body: { "config": { "command": "...", "args": [...] }, "type": "stdio" }
```

Response:

```json
{
  "tools": [{ "name": "search", "description": "...", "inputSchema": {...} }],
  "resources": [{ "uri": "...", "name": "...", "mimeType": "..." }],
  "prompts": [{ "name": "...", "description": "...", "arguments": [...] }]
}
```

---

## 5. Plugins

```bash
bun run scan /path -s plugins
```

### What's extracted per plugin
- Name, version, marketplace registry
- Install path
- All sub-resources: skills[], hooks[], agents[], commands[], mcpServers[]

### Sources
- `~/.claude/plugins/installed_plugins.json` (v1 flat array or v2 `{ plugins: { "name@registry": [...] } }`)
- Each plugin's install directory is scanned for `skills/`, `hooks/`, `agents/`, `commands/`, `.mcp.json`
- Plugin metadata from `.claude-plugin/plugin.json`

### Shape

```json
{
  "name": "superpowers",
  "scope": "global",
  "source": "Plugins",
  "version": "1.2.0",
  "installPath": "~/.claude/plugins/superpowers/...",
  "marketplace": "claude-plugin-registry",
  "skills": ["write-plan", "test-driven-development", ...],
  "hooks": ["PreToolUse", ...],
  "agents": ["code-reviewer"],
  "commands": ["commit"],
  "mcpServers": []
}
```

---

## 6. Skills

```bash
bun run scan /path -s skills
```

### Sources (in priority order)
1. Plugin skills (`~/.claude/plugins/<plugin>/skills/`)
2. Global skills directory (`~/.claude/skills/`)
3. Global agents skills (`~/.agents/skills/`)
4. Project skills (`<project>/.claude/skills/`)
5. Project agents skills (`<project>/.agents/skills/`)
6. Commands surfaced as skills (both global and local)
7. Built-in skills (extracted from Claude Code binary via `strings`)

### What's extracted per skill
- Name, description (from YAML frontmatter)
- File path
- Scope (global/local)
- Source (which plugin, directory, or built-in)
- Size in bytes, line count, estimated token count

### Shape

```json
{
  "name": "test-driven-development",
  "scope": "global",
  "source": "superpowers",
  "description": "Use when implementing any feature or bugfix...",
  "filePath": "~/.claude/plugins/.../skills/test-driven-development/SKILL.md",
  "size": 4523,
  "lines": 120,
  "tokens": 1131
}
```

---

## 7. Hooks

```bash
bun run scan /path -s hooks
```

### Sources
- `~/.claude/settings.json` → `hooks` (global)
- `<project>/.claude/settings.local.json` → `hooks` (local)
- `<project>/.claude/settings.json` → `hooks` (local, shared)
- Plugin `hooks/hooks.json` (global)
- Session hooks from `~/.claude/plugins/cache/temp_git_*/hooks/hooks.json` (most recent session)
- Custom source files

### What's extracted per hook
- Event name (PreToolUse, PostToolUse, SessionStart, etc.)
- Command to execute
- Matcher pattern (e.g. tool name filter)
- Source and source path (resolved script path when possible)

### Shape

```json
{
  "name": "PreToolUse",
  "scope": "global",
  "source": "superpowers",
  "sourcePath": "~/.claude/plugins/.../hooks/pre-tool-use.mjs",
  "type": "command",
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/pre-tool-use.mjs\"",
  "event": "PreToolUse",
  "matcher": "Edit"
}
```

---

## 8. Commands

```bash
bun run scan /path -s commands
```

### Sources
- `~/.claude/commands/` (global)
- `<project>/.claude/commands/` (local)
- Plugin `commands/` directories (global)

### Shape

```json
{
  "name": "commit",
  "scope": "global",
  "source": "Global Commands",
  "description": "Create a git commit with a good message",
  "filePath": "~/.claude/commands/commit.md"
}
```

---

## 9. CLAUDE.md (resolved)

```bash
bun run scan /path -s claudeMd
```

Returns the **fully resolved** CLAUDE.md content with all `@include` directives expanded (recursive, up to 5 levels deep). Checks:
1. `<project>/CLAUDE.md`
2. `~/.claude/projects/<slug>/CLAUDE.md` (fallback)

---

## 10. Markdown Files

All `.md` files discovered across the project and global config.

### Directories scanned
- `~/.claude/` (global, non-recursive)
- `~/.claude/projects/<slug>/memory/` (local, recursive)
- `<project>/` root (local, non-recursive)
- `<project>/.claude/` (local, recursive)
- `<project>/docs/` (local, recursive)
- `<project>/.skills/` (local, recursive)
- Extra markdown dirs (if specified)

Skips: `node_modules/`, `.git/`, `.superpowers/`, hidden dirs (except `.claude`)

### Shape

```json
{
  "path": "/abs/path/to/file.md",
  "name": "CLAUDE.md",
  "scope": "global|local",
  "relativePath": "relative/from/project"
}
```

---

## 11. File Reading

Read any file on disk (with secret masking for JSON).

```bash
# API only
GET /api/file?path=/abs/path/to/file
```

Response:

```json
{
  "path": "/abs/path",
  "content": "file contents (JSON keys matching token|key|secret|password|auth are masked)",
  "isJson": true
}
```

---

## 12. Summary (quick counts)

```bash
bun run scan /path -s summary --pretty
```

```json
{
  "projectPath": "/path/to/project",
  "sourcesFound": 8,
  "sourcesTotal": 14,
  "mcpServers": 5,
  "plugins": 3,
  "skills": 48,
  "hooks": 17,
  "commands": 12,
  "hasClaudeMd": true
}
```

---

## Composing queries

Scan every conductor worktree and get skill counts:

```bash
for wt in ~/conductor/workspaces/*/*; do
  echo "$(basename $wt): $(bun run scan "$wt" -s summary 2>/dev/null | jq -r '.skills')"
done
```

Get all MCP server names across all projects:

```bash
for wt in ~/conductor/workspaces/*/*; do
  bun run scan "$wt" -s mcpServers 2>/dev/null | jq -r '.[].name'
done | sort -u
```

Read a specific skill's content:

```bash
bun run scan /path -s skills | jq '.[] | select(.name == "commit") | .filePath' -r | xargs cat
```

List all hooks grouped by event:

```bash
bun run scan /path -s hooks | jq 'group_by(.event) | map({event: .[0].event, count: length, hooks: map(.command)})'
```
