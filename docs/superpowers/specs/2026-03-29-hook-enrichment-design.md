# Hook Enrichment

## Problem

Hooks in Claude Code are opaque. The current UI shows event, matcher, command path, and scope — but nothing about what a hook actually *does*, whether it injects context, or whether it's safe. This is a trust and visibility problem, especially when installing third-party plugins that bundle hooks.

## Solution

An agent-driven enrichment pipeline that reads hook source code, lets the calling LLM agent analyze each hook, and persists structured metadata to `~/.claude/hook-enrichments.json`. The scanner merges this enrichment at scan time so the UI can display it.

## Enrichment Data Model

Stored in `~/.claude/hook-enrichments.json`, keyed by a stable hash of `command + event + matcher`:

```json
{
  "<hash>": {
    "description": "Human-readable explanation of what this hook does",
    "riskLevel": "low | medium | high",
    "contextImpact": "none | injects | modifies",
    "scope": "global | local",
    "origin": "plugin:<name> | user",
    "event": "SessionStart",
    "matcher": "startup|resume|clear|compact",
    "command": "node .../hooks/inject-claude-md.mjs",
    "tags": ["context-injection", "telemetry"],
    "enrichedAt": "2026-03-29T00:00:00.000Z"
  }
}
```

### Field definitions

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | What the hook does, written by the analyzing agent |
| `riskLevel` | `"low"` \| `"medium"` \| `"high"` | Safety assessment — high means it modifies files, phones home, or injects large context |
| `contextImpact` | `"none"` \| `"injects"` \| `"modifies"` | Whether the hook writes to stdout/system_prompt (injects context) or modifies tool results |
| `scope` | `"global"` \| `"local"` | Whether this hook runs globally or per-project |
| `origin` | string | Who added it: `"plugin:<name>"` for plugin hooks, `"user"` for manually configured hooks |
| `event` | string | The hook event (SessionStart, PreToolUse, PostToolUse, etc.) |
| `matcher` | string | The event matcher pattern |
| `command` | string | The full command that runs |
| `tags` | string[] | Short labels for categorization |
| `enrichedAt` | string | ISO timestamp of when enrichment was generated |

### Key generation

The key is a deterministic hash of `command + event + matcher`. This means:
- Same hook matches regardless of which config file it appears in
- Enrichment persists even if the hook moves between global/local settings
- Re-enriching the same hook overwrites the previous entry

## CLI Commands

### `bun run scan --dump-hooks -p <path>`

Outputs all discovered hooks as JSON with their source script contents inlined:

```json
[
  {
    "key": "<hash>",
    "event": "SessionStart",
    "matcher": "startup|resume|clear|compact",
    "command": "node .../hooks/inject-claude-md.mjs",
    "scope": "global",
    "origin": "plugin:superpowers",
    "sourceCode": "// full contents of the .mjs file...\n"
  }
]
```

The calling agent reads this output, analyzes each hook's source code, and produces enrichment entries.

### `bun run scan --write-enrichments`

Accepts enrichment JSON on stdin and merges it into `~/.claude/hook-enrichments.json`. Merge strategy: new entries overwrite existing entries with the same key. Existing entries for hooks not in the input are preserved.

## Scanner Changes

In `src/lib/scanner.ts`:

1. After collecting all hooks, check if `~/.claude/hook-enrichments.json` exists
2. Load it and compute the key hash for each hook
3. If a matching enrichment exists, merge `description`, `riskLevel`, `contextImpact`, `origin`, `tags`, and `enrichedAt` onto the Hook object

## Type Changes

In `src/lib/types.ts`, extend the `Hook` interface:

```ts
export interface Hook {
  // existing fields
  name: string;
  scope: 'global' | 'local' | 'custom';
  source: string;
  sourcePath?: string;
  type: string;
  command: string;
  event?: string;
  matcher?: string;
  // enrichment fields (populated from ~/.claude/hook-enrichments.json)
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  contextImpact?: 'none' | 'injects' | 'modifies';
  origin?: string;
  tags?: string[];
  enrichedAt?: string;
}
```

## UI Changes

### HooksTab

- Enriched hooks show: description text, color-coded risk badge (green/yellow/red), origin label, context impact indicator
- Unenriched hooks display as today but with a subtle "not analyzed" indicator
- Info icon with tooltip at the top of the tab: "To analyze your hooks, ask your agent to run `bun run scan --dump-hooks -p .` and `--write-enrichments`"

### DetailPanel

When a hook is selected and has enrichment:
- Description at the top
- Risk level badge with color
- Context impact indicator
- Origin (plugin name or "user")
- Tags as pills
- Enrichment timestamp

## Agent Workflow

The intended usage from a Claude Code session:

1. Agent runs `bun run scan --dump-hooks -p /path/to/project`
2. Agent reads the JSON output containing hook source code
3. Agent analyzes each hook and produces enrichment JSON
4. Agent pipes enrichment into `bun run scan --write-enrichments`
5. Next time the UI loads, enrichments appear on the hooks

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add enrichment fields to Hook interface |
| `src/lib/scanner.ts` | Load and merge enrichments at scan time |
| `src/cli/scan.ts` | Add `--dump-hooks` and `--write-enrichments` flags |
| `src/lib/enrichment.ts` | New — key hashing, enrichment file read/write, merge logic |
| `src/components/HooksTab.tsx` | Show enrichment data, risk badges, info tooltip |
| `src/components/DetailPanel.tsx` | Show enrichment in hook detail view |
