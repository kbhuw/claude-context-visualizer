## Why

The custom path input in `ProjectSelector` requires users to type filesystem paths manually, which is error-prone and slow. Adding a file picker button lets users browse and select directories through a native OS dialog, reducing friction and typos when loading custom projects.

## What Changes

- Add a "Browse" button next to the custom path input in `ProjectSelector` that opens a native file/directory picker dialog
- Introduce a new API route (`/api/browse`) that invokes a system dialog (e.g., via AppleScript or a comparable mechanism) and returns the selected path
- The selected path is populated into the custom path input field, where the user can still edit it before submitting

## Capabilities

### New Capabilities

- `file-picker`: A server-side mechanism to open a native OS directory/file picker dialog and return the selected path to the client

### Modified Capabilities

<!-- none -->

## Impact

- **`src/components/ProjectSelector.tsx`**: Add Browse button and handler to populate `customPath` state from picker result
- **`src/app/api/browse/route.ts`**: New POST endpoint that spawns a native file dialog and returns the chosen path
- **No new dependencies** required if using `osascript` (macOS); cross-platform support is out of scope for this change
