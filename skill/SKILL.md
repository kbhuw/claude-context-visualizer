---
name: context-visualizer
description: Query Claude Code's full configuration context — skills, hooks, MCP servers, plugins, commands, markdowns, CLAUDE.md, and file contents. Use when you need to understand what's configured, discover available tools, or inspect any part of Claude Code's runtime context. Trigger this whenever the user asks about their Claude setup, what skills/hooks/plugins are installed, MCP server status, or wants to compare configurations across projects.
---

# Context Visualizer

Gives you read access to everything Claude Code sees: config sources, MCP servers, plugins (with their skills/hooks/agents/commands), skills, hooks, commands, CLAUDE.md, markdown files, and project layout.

## Commands

All commands use `npx ccv scan`:

### Scan a Project's Full Context

```bash
# Everything — sources, MCP servers, plugins, skills, hooks, commands, CLAUDE.md, markdowns
npx ccv scan /path/to/project --pretty

# Scan current directory
npx ccv scan . --pretty
```

### Query Specific Sections

```bash
npx ccv scan /path -s skills        # All skills with name, source, scope, size, lines, tokens
npx ccv scan /path -s hooks         # All hooks with event, command, matcher, source
npx ccv scan /path -s mcpServers    # MCP servers with type, config, source
npx ccv scan /path -s plugins       # Plugins with sub-resources (skills, hooks, agents, commands, MCP servers)
npx ccv scan /path -s commands      # Commands with name, description, file path
npx ccv scan /path -s sources       # All 14+ config source paths and whether they exist
npx ccv scan /path -s claudeMd      # Fully resolved CLAUDE.md with @includes expanded
npx ccv scan /path -s markdowns     # All discovered .md files (global + project)
npx ccv scan /path -s summary       # Quick counts of everything
```

### Discover Projects

```bash
# Projects from ~/.claude.json (what Claude Code knows about)
npx ccv scan --list-projects

# Conductor projects with repos, worktrees, and resolved main repo paths
npx ccv scan --conductor-projects --pretty
```

### Read Any File

```bash
npx ccv scan --read-file /path/to/file --pretty
```

JSON files get secret masking (keys matching token/key/secret/password/auth are truncated). Non-JSON files returned raw.

### Introspect MCP Servers (live)

```bash
# List all configured MCP servers
npx ccv scan --introspect -p /path

# Introspect all servers (connects and queries tools/resources/prompts)
npx ccv scan --introspect --all -p /path --pretty

# Introspect a specific server
npx ccv scan --introspect --server nia -p /path --pretty
```

**Introspect response per server:**
```json
{
  "server": "nia",
  "scope": "global",
  "source": "Client State",
  "type": "stdio",
  "tools": [{ "name": "search", "description": "...", "inputSchema": {} }],
  "resources": [{ "uri": "...", "name": "..." }],
  "prompts": [{ "name": "...", "description": "..." }]
}
```

### Summary

```bash
npx ccv scan /path -s summary --pretty
```

```json
{
  "projectPath": "/path/to/project",
  "sourcesFound": 9,
  "sourcesTotal": 15,
  "mcpServers": 7,
  "plugins": 11,
  "skills": 48,
  "hooks": 17,
  "commands": 9,
  "markdownFiles": 13,
  "hasClaudeMd": true
}
```

## Data Model Reference

### Config Sources (14+ locations checked)

| Source | Scope | Path |
|--------|-------|------|
| Global Settings | global | `~/.claude/settings.json` |
| Client State | global | `~/.claude.json` |
| Plugins | global | `~/.claude/plugins/installed_plugins.json` |
| Skills Directory | global | `~/.claude/skills/` |
| Agents Skills | global | `~/.agents/skills/` |
| Global Commands | global | `~/.claude/commands/` |
| Project Settings | local | `<project>/.claude/settings.local.json` |
| CLAUDE.md | local | `<project>/CLAUDE.md` |
| MCP Config | local | `<project>/.mcp.json` |
| Project Skills | local | `<project>/.claude/skills/` |
| Project Agents Skills | local | `<project>/.agents/skills/` |
| Project Commands | local | `<project>/.claude/commands/` |
| Shared Settings | local | `<project>/.claude/settings.json` |
| User Project CLAUDE.md | local | `~/.claude/projects/<slug>/CLAUDE.md` |
| Auto Memory | local | `~/.claude/projects/<slug>/memory/` |

### Skills (7 sources)

1. Plugin skills (`~/.claude/plugins/<plugin>/skills/`)
2. Global skills (`~/.claude/skills/`)
3. Global agents skills (`~/.agents/skills/`)
4. Project skills (`<project>/.claude/skills/`)
5. Project agents skills (`<project>/.agents/skills/`)
6. Commands surfaced as skills
7. Built-in skills (extracted from Claude Code binary)

Each skill: name, description, scope, source, filePath, size (bytes), lines, tokens.

### Hooks

Events: PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, SessionEnd, SubagentStart, SubagentStop.

Each hook: event, command, matcher, scope, source, sourcePath (resolved script path).

### Plugins

Each plugin: name, version, installPath, marketplace, and lists of skills, hooks, agents, commands, mcpServers.

### MCP Servers

From: ~/.claude.json (global + per-project), .mcp.json, plugin configs.
Each: name, scope, source, type (stdio/http/sse), url, full config object.
Live introspection returns: tools (with inputSchema), resources, prompts.

## Composable Examples

```bash
# Scan every conductor worktree and compare skill counts
npx ccv scan --conductor-projects | jq -r '.projects[].worktrees[].path' | while read wt; do
  echo "$(basename $wt): $(npx ccv scan "$wt" -s summary 2>/dev/null | jq '.skills')"
done

# Find all MCP servers across all worktrees
npx ccv scan --conductor-projects | jq -r '.projects[].worktrees[].path' | while read wt; do
  npx ccv scan "$wt" -s mcpServers 2>/dev/null | jq -r '.[].name'
done | sort -u

# Read a skill's actual content
npx ccv scan . -s skills | jq -r '.[] | select(.name == "commit") | .filePath' | xargs cat

# Diff hooks between two projects
diff <(npx ccv scan /path/a -s hooks | jq -r '.[].command' | sort) \
     <(npx ccv scan /path/b -s hooks | jq -r '.[].command' | sort)

# Get the full resolved CLAUDE.md for current project
npx ccv scan . -s claudeMd | jq -r '.'
```
