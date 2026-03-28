## Context

`ProjectSelector` currently has a text input for entering custom project paths. Users must know and type the exact filesystem path, which is error-prone. The app already has a `/api/open` route that calls `open -R` via `child_process`, establishing the pattern of spawning OS-level commands from Next.js API routes. The app runs locally on macOS, so OS-native tooling is acceptable.

## Goals / Non-Goals

**Goals:**
- Add a Browse button to the custom path input that opens a native directory picker
- Return the selected path to the client and populate the text input
- Keep the existing manual-typing workflow intact (Browse is additive)

**Non-Goals:**
- Cross-platform support (Windows/Linux pickers are out of scope)
- Allowing file selection (directory selection only, consistent with the project model)
- Persisting recently browsed paths

## Decisions

**Decision 1: Use `osascript` to invoke a macOS folder picker**

The app already uses `child_process.exec` in `/api/open/route.ts`. An `osascript` one-liner (`choose folder`) produces a POSIX path with no additional npm dependencies. Alternatives:
- *Electron dialog*: Not applicable; this is a Next.js app, not an Electron app.
- *`open` command*: Opens Finder but cannot return a selection back to the process.
- *npm package (e.g., `node-mac-finder`)*: Adds a dependency for functionality already available via `osascript`.

**Decision 2: New `/api/browse` POST endpoint**

Mirrors the existing `/api/open` route pattern. A POST endpoint is appropriate because it triggers a side effect (launching a dialog). The response is `{ path: string }` on success or `{ error: string }` on cancellation/failure.

**Decision 3: Client calls `/api/browse` on button click, then sets input state**

The Browse button triggers an async fetch to `/api/browse`. On success the returned path is written into the `customPath` state in `ProjectSelector`. The user can still edit the path before clicking Load. No auto-submit occurs — the user retains control.

## Risks / Trade-offs

- **macOS-only**: `osascript choose folder` only works on macOS. The Browse button should be either hidden or gracefully disabled on non-macOS hosts. → Mitigation: detect platform server-side; return a 501 if not macOS, and hide the button client-side via a capability flag endpoint or simply accept the error gracefully.
- **Dialog blocks the server thread**: `osascript` runs synchronously until the user dismisses the dialog. During that time the API route handler is blocked. → Mitigation: acceptable for a local-only dev tool; document the constraint.
- **User cancellation**: Cancelling the dialog causes `osascript` to exit with a non-zero code. → Mitigation: catch the error and return `{ cancelled: true }` so the client can no-op silently.
