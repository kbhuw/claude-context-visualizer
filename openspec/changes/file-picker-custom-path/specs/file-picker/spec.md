## ADDED Requirements

### Requirement: Browse button opens native directory picker
The `ProjectSelector` component SHALL display a Browse button adjacent to the custom path text input. Clicking the button SHALL invoke the `/api/browse` endpoint and populate the text input with the selected directory path.

#### Scenario: User clicks Browse and selects a directory
- **WHEN** the user clicks the Browse button
- **THEN** a native macOS folder picker dialog is presented

#### Scenario: User selects a directory in the picker
- **WHEN** the user confirms a directory selection in the picker dialog
- **THEN** the custom path text input is populated with the absolute POSIX path of the selected directory

#### Scenario: User cancels the picker dialog
- **WHEN** the user dismisses the picker dialog without selecting a directory
- **THEN** the custom path text input remains unchanged

### Requirement: Browse button is disabled during loading
The Browse button SHALL be disabled while the application is in a loading state to prevent concurrent operations.

#### Scenario: Loading state disables Browse
- **WHEN** the `loading` prop is `true`
- **THEN** the Browse button is disabled and non-interactive

### Requirement: /api/browse endpoint returns selected path
The `/api/browse` POST endpoint SHALL invoke a native macOS folder picker via `osascript` and return the selected directory path as a JSON response.

#### Scenario: Successful directory selection
- **WHEN** a POST request is made to `/api/browse` and the user selects a directory
- **THEN** the endpoint returns HTTP 200 with body `{ "path": "<absolute-posix-path>" }`

#### Scenario: User cancels the dialog
- **WHEN** a POST request is made to `/api/browse` and the user cancels the dialog
- **THEN** the endpoint returns HTTP 200 with body `{ "cancelled": true }`

#### Scenario: Non-macOS host
- **WHEN** a POST request is made to `/api/browse` on a non-macOS platform
- **THEN** the endpoint returns HTTP 501 with body `{ "error": "File picker is only supported on macOS" }`
