## 1. API Route

- [x] 1.1 Create `src/app/api/browse/route.ts` with a POST handler
- [x] 1.2 Implement `osascript -e 'choose folder'` invocation using `child_process.exec` and return the POSIX path
- [x] 1.3 Handle user cancellation (non-zero exit from osascript) and return `{ cancelled: true }`
- [x] 1.4 Return HTTP 501 with error message when `process.platform !== 'darwin'`

## 2. ProjectSelector UI

- [x] 2.1 Add a Browse button next to the custom path input in `src/components/ProjectSelector.tsx`
- [x] 2.2 Implement `handleBrowse` async function that POSTs to `/api/browse` and sets `customPath` on success
- [x] 2.3 Disable the Browse button when `loading` prop is `true` or when a browse request is in flight
- [x] 2.4 No-op silently when the API returns `{ cancelled: true }`

## 3. Verification

- [x] 3.1 Manually verify: clicking Browse opens a macOS folder picker and populates the input
- [x] 3.2 Manually verify: cancelling the dialog leaves the input unchanged
- [x] 3.3 Manually verify: the Browse button is disabled while the app is loading a project
- [x] 3.4 Manually verify: the populated path can be edited before clicking Load
