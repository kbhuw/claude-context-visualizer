## ADDED Requirements

### Requirement: Theme toggle button in header
The application header SHALL include a visible toggle button that switches between light and dark themes. The button MUST display a sun icon when the current theme is dark and a moon icon when the current theme is light.

#### Scenario: User toggles from light to dark
- **WHEN** the user clicks the theme toggle button while in light mode
- **THEN** the application switches to dark mode and displays dark-themed colors throughout

#### Scenario: User toggles from dark to light
- **WHEN** the user clicks the theme toggle button while in dark mode
- **THEN** the application switches to light mode and displays light-themed colors throughout

#### Scenario: Toggle button reflects current theme
- **WHEN** the page loads in dark mode
- **THEN** the toggle button displays a sun icon

#### Scenario: Toggle button reflects light theme
- **WHEN** the page loads in light mode
- **THEN** the toggle button displays a moon icon

### Requirement: Theme preference persistence
The application SHALL persist the user's theme preference in `localStorage` under the key `theme` with values `"light"` or `"dark"`. The stored preference MUST be applied on every subsequent page load.

#### Scenario: Preference saved on toggle
- **WHEN** the user toggles the theme
- **THEN** the new theme value is written to `localStorage` under the key `theme`

#### Scenario: Preference restored on reload
- **WHEN** the user reloads the page and `localStorage` contains `theme: "dark"`
- **THEN** the application loads in dark mode without requiring the user to toggle again

#### Scenario: Preference restored on reload for light
- **WHEN** the user reloads the page and `localStorage` contains `theme: "light"`
- **THEN** the application loads in light mode

### Requirement: OS default theme respected
When no theme preference has been stored, the application SHALL default to the user's OS `prefers-color-scheme` setting. If the OS preference is `dark`, the app MUST start in dark mode; otherwise it MUST start in light mode.

#### Scenario: OS dark mode with no stored preference
- **WHEN** no `theme` key exists in `localStorage` and the OS is set to dark mode
- **THEN** the application initializes in dark mode

#### Scenario: OS light mode with no stored preference
- **WHEN** no `theme` key exists in `localStorage` and the OS is set to light mode
- **THEN** the application initializes in light mode

#### Scenario: Stored preference overrides OS setting
- **WHEN** `localStorage` contains `theme: "light"` and the OS is set to dark mode
- **THEN** the application initializes in light mode

### Requirement: Dark theme visual styles applied to all components
All UI components SHALL render with appropriate dark-mode color styles when the dark theme is active. Dark mode MUST use a consistent palette: dark page background (`#111111`), dark surface background (`#1a1a1a`), dark borders (`#2a2a2a`), light primary text (`#fafafa`), and muted text (`#999999`).

#### Scenario: Page background in dark mode
- **WHEN** dark mode is active
- **THEN** the page background uses a dark color and text is light-colored

#### Scenario: Card and panel surfaces in dark mode
- **WHEN** dark mode is active
- **THEN** all card, panel, and header surfaces use the dark surface color instead of white

#### Scenario: Input fields in dark mode
- **WHEN** dark mode is active
- **THEN** all text inputs, selects, and buttons reflect dark background and light text colors

#### Scenario: Tab navigation in dark mode
- **WHEN** dark mode is active
- **THEN** active tab indicator and count badges use light colors appropriate for dark backgrounds

### Requirement: ThemeProvider context available to all components
The application SHALL expose a React context (`ThemeContext`) via a `ThemeProvider` component that provides `{ theme: 'light' | 'dark', toggleTheme: () => void }` to all descendant components. The `ThemeProvider` MUST be placed at the root layout level so every page and component can access it.

#### Scenario: Any component can read current theme
- **WHEN** any component calls `useTheme()`
- **THEN** it receives the current `theme` value (`"light"` or `"dark"`)

#### Scenario: Any component can trigger theme change
- **WHEN** any component calls `toggleTheme()` from the context
- **THEN** the theme switches and all components re-render with the new theme styles
