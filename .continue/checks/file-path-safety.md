---
name: File Path Safety
description: API routes that accept file paths must validate against path traversal and restrict access scope.
---

## Context

This app reads and writes files on the host filesystem via API routes (`/api/file`, `/api/browse`, `/api/context`). File paths come directly from query parameters or request bodies. A path traversal or unrestricted read could expose sensitive files (SSH keys, env files, credentials) through the web UI.

The existing `/api/file` POST route restricts writes to `.md` files only — but the GET route reads any path without restriction. New routes must not widen this attack surface.

## What to Check

### Path traversal and symlink attacks

- Any new API route that accepts a `path`, `filePath`, or directory parameter from user input must not blindly pass it to `fs.readFile`, `fs.readdir`, or `fs.writeFile`.
- Watch for path segments like `..`, URL-encoded traversals (`%2e%2e`), or null bytes that could escape intended directories.
- If a route is meant to serve files under a specific root (e.g., `~/.claude/`, a project directory), it should resolve the path with `path.resolve()` and verify the result starts with the expected prefix.

**BAD:**
```ts
const filePath = searchParams.get('path');
const content = await fs.readFile(filePath, 'utf-8'); // reads anything on disk
```

**GOOD:**
```ts
const filePath = searchParams.get('path');
const resolved = path.resolve(filePath);
if (!resolved.startsWith(allowedRoot)) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
const content = await fs.readFile(resolved, 'utf-8');
```

### Write restrictions

- The existing convention is that only `.md` files can be written (`/api/file` POST). Any new write endpoint must maintain equivalent restrictions or be more restrictive.
- Never allow writing to paths outside of known project directories.

### Secret masking

- If a new route returns file contents that could contain credentials (JSON config files, `.env`), it must apply `maskSecrets()` or equivalent filtering before returning the response.
- The `SENSITIVE_KEYS` regex (`/token|key|secret|password|authorization/i`) in `/api/file/route.ts` is the existing pattern — reuse it, don't reinvent it.

## Key Files

- `src/app/api/file/route.ts` — existing read/write with secret masking
- `src/app/api/browse/route.ts` — directory listing endpoint
- `src/app/api/context/route.ts` — accepts `project` and `customSource` paths

## Exclusions

- Internal helper functions in `scanner.ts` that read files from hardcoded paths (e.g., `~/.claude/`) — these don't take user input.
- Changes that only modify the frontend UI without touching API routes.
