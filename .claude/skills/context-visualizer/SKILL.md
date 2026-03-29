---
name: context-visualizer
description: Query Claude Code's full configuration context — projects, conductor repos/worktrees, skills, hooks, MCP servers, plugins, commands, markdowns, CLAUDE.md, and file contents. Use when you need to understand what's configured, discover available tools, or inspect any part of Claude Code's runtime context.
---

# Context Visualizer

Gives you read access to everything Claude Code sees: config sources, MCP servers, plugins (with their skills/hooks/agents/commands), skills, hooks, commands, CLAUDE.md, markdown files, and Conductor project layout.

**CLI location**: `~/conductor/repos/claude-context-visualizer` (run commands from there, or use absolute path to `src/cli.ts`)

## Quick Setup

All commands use `bunx tsx` to run the CLI:

```bash
CCV="bunx --cwd ~/conductor/repos/claude-context-visualizer tsx ~/conductor/repos/claude-context-visualizer/src/cli.ts"
```

Or run from the repo directory:

```bash
cd ~/conductor/repos/claude-context-visualizer && bun run scan ...
```

## Commands

### Discover Projects

```bash
# All Conductor projects with repos, worktrees, and resolved main repo paths
$CCV --conductor-projects --pretty

# Projects from ~/.claude.json (what Claude Code knows about)
$CCV --list-projects
```

**Conductor projects response:**
```json
{
  "conductorDir": "/Users/kush/conductor",
  "projects": [
    {
      "name": "puffle-app",
      "mainRepo": "/Users/kush/Documents/puffle/puffle-app",
      "worktrees": [
        { "name": "biarritz-v2", "path": "/Users/kush/conductor/workspaces/puffle-app/biarritz-v2" }
      ]
    }
  ]
}
```

### Scan a Project's Full Context

```bash
# Everything — sources, MCP servers, plugins, skills, hooks, commands, CLAUDE.md, markdowns
$CCV /path/to/project --pretty

# Scan current directory
$CCV . --pretty
```

### Query Specific Sections

```bash
$CCV /path -s skills        # All skills with name, source, scope, size, lines, tokens
$CCV /path -s hooks         # All hooks with event, command, matcher, source
$CCV /path -s mcpServers    # MCP servers with type, config, source
$CCV /path -s plugins       # Plugins with sub-resources (skills, hooks, agents, commands, MCP servers)
$CCV /path -s commands      # Commands with name, description, file path
$CCV /path -s sources       # All 14+ config source paths and whether they exist
$CCV /path -s claudeMd      # Fully resolved CLAUDE.md with @includes expanded
$CCV /path -s markdowns     # All discovered .md files (global + project)
$CCV /path -s summary       # Quick counts of everything
```

### Read Any File

```bash
$CCV --read-file /path/to/file --pretty
```

JSON files get secret masking (keys matching token/key/secret/password/auth are truncated). Non-JSON files returned raw.

### Introspect MCP Servers (live)

```bash
# List all configured MCP servers
$CCV --introspect -p /path

# Introspect all servers (connects and queries tools/resources/prompts)
$CCV --introspect --all -p /path --pretty

# Introspect a specific server
$CCV --introspect --server nia -p /path --pretty
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
$CCV /path -s summary --pretty
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

### Conductor Layout

```
~/conductor/
  repos/<repo>/              # Main repos (some projects have repos elsewhere)
  workspaces/<project>/<wt>/ # Worktrees (always here)
  archived-contexts/         # Old worktrees
```

Main repo resolved by reading worktree `.git` file pointers.

## Worktree Report

When the user asks for a "worktree report" for a Conductor project, generate a comparison across the main repo and all its worktrees. Here's exactly how to do it:

### Step 1: Discover the project

```bash
$CCV --conductor-projects --pretty
```

Find the project by name. Extract `mainRepo` and all `worktrees[].path`.

### Step 2: Get summary + branch info for each

For the main repo and every worktree, run both of these:

```bash
# Context summary (skills, hooks, MCP servers, plugins, commands, markdowns)
$CCV "<path>" -s summary

# Git branch and how far ahead of main
git -C "<path>" branch --show-current
git -C "<path>" log main..HEAD --oneline
```

### Step 3: Build the comparison table

Present a table like this:

| Location | Branch | Commits Ahead | Skills | Hooks | MCP Servers | Plugins | Commands | Markdowns |
|----------|--------|---------------|--------|-------|-------------|---------|----------|-----------|
| **main** | `main` | 0 | 40 | 17 | 7 | 11 | 9 | 5 |
| **worktree-a** | `kbhuw/feature` | 13 | 49 | 17 | 7 | 11 | 9 | 12 |

### Step 4: Identify differences

For each worktree that's ahead of main, show:

1. **Commits**: `git -C "<wt>" log main..HEAD --oneline` — list the commit messages
2. **Uncommitted work**: `git -C "<wt>" diff HEAD --stat` — files changed but not committed
3. **Unique skills**: Compare skill names between worktrees to find what each has that others don't:
   ```bash
   # Get skill names for two locations
   diff <($CCV /path/a -s skills | jq -r '.[].name' | sort) \
        <($CCV /path/b -s skills | jq -r '.[].name' | sort)
   ```

### Step 5: Write the narrative

After the table, summarize in plain English:
- Which worktrees are stale (0 commits ahead, no changes)
- Which worktrees are most active and what they're working on (based on commit messages)
- What's unique to each worktree (extra skills, different configs)
- Any uncommitted work in progress

### Example output

The report should look like:

```
## Worktree Report: claude-context-visualizer

### Summary

| Location | Branch | Ahead | Skills | Hooks | MCP | Plugins | Cmds | MDs |
|----------|--------|-------|--------|-------|-----|---------|------|-----|
| main     | main   | 0     | 40     | 17    | 7   | 11      | 9    | 5   |
| quebec-v2 | kbhuw/quebec-v3 | 14 | 50 | 17 | 7 | 11 | 9 | 14 |
| edinburgh-v3 | kbhuw/edinburgh-v3 | 13 | 49 | 17 | 7 | 11 | 9 | 13 |
| kyoto-v4 | (detached) | 0 | 40 | 17 | 7 | 11 | 9 | 5 |

### Differences

**kyoto-v4** — Identical to main. Stale/unused.

**edinburgh-v3** — 13 commits ahead:
- <commit list>
- Unique skills vs main: openspec-apply-change, openspec-explore, ...

**quebec-v2** — 14 commits ahead (everything edinburgh has + 1 more):
- Extra commit: "Add Conductor-aware project selector"
- Unique skills vs edinburgh: context-visualizer
- Uncommitted: CLAUDE.md, src/cli.ts, src/components/OverviewTab.tsx
```

## Composable Examples

```bash
# Scan every conductor worktree and compare skill counts
$CCV --conductor-projects | jq -r '.projects[].worktrees[].path' | while read wt; do
  echo "$(basename $wt): $($CCV "$wt" -s summary 2>/dev/null | jq '.skills')"
done

# Find all MCP servers across all worktrees
$CCV --conductor-projects | jq -r '.projects[].worktrees[].path' | while read wt; do
  $CCV "$wt" -s mcpServers 2>/dev/null | jq -r '.[].name'
done | sort -u

# Read a skill's actual content
$CCV . -s skills | jq -r '.[] | select(.name == "commit") | .filePath' | xargs cat

# Diff hooks between two projects
diff <($CCV /path/a -s hooks | jq -r '.[].command' | sort) \
     <($CCV /path/b -s hooks | jq -r '.[].command' | sort)

# Get the full resolved CLAUDE.md for current project
$CCV . -s claudeMd | jq -r '.'
```
