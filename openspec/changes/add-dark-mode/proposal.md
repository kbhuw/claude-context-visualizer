## Why

The application currently only supports a light theme, which can cause eye strain in low-light environments and does not respect users' OS-level dark mode preferences. Adding dark mode support improves usability and aligns with modern web application expectations.

## What Changes

- Add a `dark-mode-toggle` UI control (button/icon) in the app header to switch between light and dark themes.
- Introduce CSS custom property overrides for dark theme colors (background, foreground, borders, muted tones).
- Persist the user's theme preference in `localStorage` so it survives page reloads.
- Respect the OS `prefers-color-scheme` media query as the default when no stored preference exists.
- Apply dark theme via a `dark` class on the `<html>` element, toggled by the theme context.
- Update all existing hardcoded color values across components to use theme-aware Tailwind classes (`dark:` variants) or CSS variables.

## Capabilities

### New Capabilities

- `dark-mode`: Theme switching capability — toggle between light and dark modes, persist preference, respect OS default, and apply consistent dark-mode styles across all UI components.

### Modified Capabilities

<!-- No existing spec-level capability requirements are changing. -->

## Impact

- **Files modified**: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, and all components in `src/components/` (hardcoded color classes need dark variants).
- **New files**: A theme context/provider (e.g., `src/lib/theme.tsx` or `src/components/ThemeProvider.tsx`) and a `ThemeToggle` component.
- **Dependencies**: No new npm dependencies required; uses Tailwind CSS v4 `dark:` variants and native CSS custom properties.
- **APIs**: No backend changes needed.
