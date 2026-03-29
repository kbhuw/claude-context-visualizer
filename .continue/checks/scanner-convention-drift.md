---
name: Scanner Convention Drift
description: New scanner code must follow established patterns for scope tagging, deduplication, and type consistency.
---

## Context

`src/lib/scanner.ts` is the heart of this app — a 1100+ line file that scans Claude Code's configuration across global, project-local, and custom sources. It has strong internal conventions that are easy to accidentally violate because they're implicit rather than enforced by types.

When the scanner drifts from its conventions, the UI breaks in subtle ways: items appear duplicated, scope badges are wrong, token counts are off, or the detail panel shows stale data.

## What to Check

### Scope tagging

- Every scanned item (Skill, Hook, Command, McpServer, Plugin, MarkdownFile) MUST have a `scope` field set to `'global'`, `'local'`, or `'custom'`.
- The scope must reflect where the item was discovered, not where it's defined. For example, a skill installed globally but found via a plugin should have scope `'global'`.
- New item types added to `types.ts` must include the `scope` field.

**BAD:**
```ts
skills.push({ name, description, content, filePath });
// missing scope — UI will render undefined badge
```

**GOOD:**
```ts
skills.push({ name, description, content, filePath, scope: 'local' });
```

### Deduplication

- The scanner deduplicates items by a key (usually `name` or `filePath`). New scan functions that push items to shared arrays must check for duplicates before pushing.
- The convention is: first-discovered wins (higher-priority sources are scanned first).

### Token estimation consistency

- Token counts use `estimateTokens()` which computes `Math.ceil(chars / 4)`.
- New scanned items that include a `tokens` or `estimatedTokens` field must use `estimateTokens()` — not a different formula, not raw character counts, not word counts.

### @include resolution

- If new code reads CLAUDE.md or AGENTS.md content, it must call `resolveIncludes()` to handle `@path` directives. Returning raw content with unresolved `@` lines will confuse users who see include directives instead of the included content.

### Type shape consistency

- New fields added to scanner types in `types.ts` should be optional (`field?: type`) if they aren't guaranteed to be present for all scanned items, to avoid breaking the UI's null checks.
- The detail panel (`DetailPanel.tsx`) renders fields dynamically — adding a required field that's sometimes undefined will cause runtime errors.

## Key Files

- `src/lib/scanner.ts` — all scanning logic
- `src/lib/types.ts` — type definitions for all scanned items
- `src/components/DetailPanel.tsx` — renders scanned items; relies on type shapes

## Exclusions

- UI-only changes that don't touch `scanner.ts` or `types.ts`.
- Changes to CLI output formatting (`src/cli.ts`) — the CLI has its own display logic.
