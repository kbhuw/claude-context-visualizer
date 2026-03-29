---
name: Silent Error Swallowing
description: Catch blocks should not silently discard errors that could mask real bugs or data loss.
---

## Context

This codebase uses many empty `catch` blocks as a pattern for "file might not exist, that's fine." While this is appropriate for optional file reads (e.g., checking if `~/.claude/settings.json` exists), the same pattern applied carelessly to new code can hide real failures — broken parsing, permission errors, corrupted data — making bugs extremely hard to diagnose.

The scanner (`src/lib/scanner.ts`) already has ~20 empty catch blocks. New code should not add to this debt without clear justification.

## What to Check

### Empty catch blocks in new code

- A new empty `catch {}` is acceptable ONLY when:
  1. The operation is checking for file/directory existence (and `fileExists()` or `listDir()` would be more appropriate anyway).
  2. The failure mode is truly "not found, use default" — and the default is explicitly returned.

- A new empty `catch {}` is NOT acceptable when:
  1. The operation involves parsing (JSON, YAML, frontmatter) — a parse error means corrupted input, not "missing."
  2. The operation is a write or mutation — silently failing a write can cause data loss.
  3. The catch is in an API route handler — the caller needs to know something went wrong.

**BAD:**
```ts
try {
  const data = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  processConfig(data);
} catch {
  // silently ignores parse errors, permission errors, etc.
}
```

**GOOD:**
```ts
try {
  const raw = await fs.readFile(configPath, 'utf-8');
  try {
    const data = JSON.parse(raw);
    processConfig(data);
  } catch (parseErr) {
    console.warn(`Invalid JSON in ${configPath}:`, parseErr);
  }
} catch {
  // File doesn't exist — acceptable to skip
}
```

### Logging in API routes

- API route catch blocks should return meaningful error responses with status codes, not swallow errors and return 200 with empty/default data.
- The existing pattern in `/api/context/route.ts` (returning 500 with error details) is the right model.

### Scanner helper reuse

- Prefer using the existing `fileExists()`, `readJsonFile()`, and `listDir()` helpers over writing new try/catch blocks for the same operations. These helpers have the "silent on not-found" behavior already encapsulated.

## Key Files

- `src/lib/scanner.ts` — contains `fileExists()`, `readJsonFile()`, `listDir()` helpers
- `src/app/api/context/route.ts` — good error handling pattern
- `src/app/api/file/route.ts` — mixed: good in API handler, but inner JSON parse catch is silent

## Exclusions

- Existing empty catch blocks in `scanner.ts` — those are legacy and out of scope for PR review unless they're being modified.
- Test files or scripts where silent failure is intentional for exploration.
