## Context

The app is a Next.js 16 (App Router) application using Tailwind CSS v4 and React 19. All styling today uses hardcoded hex color values (e.g., `text-[#1a1a1a]`, `bg-white`, `border-[#e5e5e5]`) directly in component class strings. There is no existing theming layer. The `globals.css` defines two CSS custom properties (`--background`, `--foreground`) on `:root` but they are not used in dark mode. Tailwind CSS v4 uses a `@import "tailwindcss"` + `@theme inline` approach rather than `tailwind.config.js`.

## Goals / Non-Goals

**Goals:**
- Introduce a toggleable light/dark theme via a `dark` class on `<html>`.
- Persist the user's preference in `localStorage`.
- Default to the OS `prefers-color-scheme` when no stored preference exists.
- Expose a `ThemeProvider` context so any component can read or toggle the theme.
- Add a `ThemeToggle` button in the app header.
- Apply consistent dark-mode styles across all existing components using Tailwind `dark:` variants.

**Non-Goals:**
- Supporting more than two themes (light/dark).
- A full design-token CSS variable system for every color (only the handful of base tokens already in `globals.css` are needed).
- Server-side rendering of the correct theme without flash (acceptable trade-off for this scope).
- Automated migration of third-party dependency styles.

## Decisions

### 1. `dark` class on `<html>` (class strategy) over `data-theme` attribute or CSS media query only

Tailwind CSS v4's `dark:` variant works with the `class` strategy by default when configured. Using the `dark` class on `<html>` gives full programmatic control (toggle button) while also allowing OS default detection via `prefers-color-scheme` as a fallback. A media-query-only approach would not allow user override; a `data-theme` attribute would require additional Tailwind configuration.

**Alternatives considered:**
- `data-theme="dark"` on `<body>` — requires custom Tailwind variant configuration.
- CSS `prefers-color-scheme` only — no user toggle possible.

### 2. `ThemeProvider` React context + `localStorage` persistence

A small client component (`src/components/ThemeProvider.tsx`) wraps the app and:
1. On mount, reads `localStorage.getItem('theme')`. If absent, checks `window.matchMedia('(prefers-color-scheme: dark)')`.
2. Applies or removes the `dark` class on `document.documentElement`.
3. Stores the preference back to `localStorage` on each toggle.

This is placed in `layout.tsx` wrapping `{children}`. The context value exposes `{ theme, toggleTheme }`.

**Alternatives considered:**
- Inline `<script>` tag in `layout.tsx` for zero-flash theme init — adds complexity; flash on first load is acceptable for an internal tool.
- Next.js cookies / server component approach — overkill for a client-side preference.

### 3. Tailwind `dark:` variants for component-level dark styles

All components currently use hardcoded hex classes. These will gain `dark:` counterparts (e.g., `bg-white dark:bg-[#1a1a1a]`, `text-[#1a1a1a] dark:text-[#fafafa]`). A small shared color palette of ~6 values covers the entire UI:

| Role | Light | Dark |
|---|---|---|
| Page background | `#fafafa` | `#111111` |
| Surface (cards, panels) | `#ffffff` | `#1a1a1a` |
| Border | `#e5e5e5` | `#2a2a2a` |
| Text primary | `#1a1a1a` | `#fafafa` |
| Text muted | `#666666` | `#999999` |
| Hover background | `#fafafa` | `#222222` |

No new CSS variables are required beyond updating the existing `:root` block and adding a `.dark` block in `globals.css`.

**Alternatives considered:**
- CSS custom properties for every color token — cleaner long-term but higher up-front effort; Tailwind `dark:` inline classes are sufficient here.

### 4. `ThemeToggle` in the header

A small icon button (sun/moon SVG) placed in the header alongside the title. It reads `theme` from context and calls `toggleTheme`. No external icon library needed.

## Risks / Trade-offs

- **Flash of incorrect theme (FOIT)** → Not mitigated in this scope. The `ThemeProvider` runs on the client after hydration. For an internal developer tool this is acceptable.
- **Component coverage gaps** → Some components use semantic Tailwind color classes (e.g., `bg-red-50`, `bg-green-500`) which have no automatic dark variant. These will need manual `dark:` overrides. → Mitigation: audit each component file during implementation.
- **Tailwind v4 `dark:` config** → Tailwind CSS v4 may require explicit opt-in to the `class` dark mode strategy via `@custom-variant dark` in `globals.css`. → Mitigation: verify during implementation and add `@custom-variant dark (&:where(.dark, .dark *));` if needed.

## Migration Plan

1. Update `globals.css` — add `.dark` overrides for CSS custom properties and add `@custom-variant dark` if required.
2. Create `src/components/ThemeProvider.tsx` — context, localStorage logic, `dark` class toggling.
3. Create `src/components/ThemeToggle.tsx` — sun/moon icon button.
4. Update `src/app/layout.tsx` — wrap children in `ThemeProvider`, add `suppressHydrationWarning` to `<html>`.
5. Update `src/app/page.tsx` — add `ThemeToggle` to the header; replace hardcoded color classes with dark variants.
6. Update all `src/components/*.tsx` — add `dark:` variants to every hardcoded color class.

No database migrations or API changes are required. Rollback is a revert of the above files.

## Open Questions

- Should the theme toggle remember the last used state across different browser sessions (currently yes via `localStorage`)?
- Should the app honor `prefers-color-scheme: dark` on every fresh load, or only when no preference has been stored? (Current design: OS default only when no stored preference exists.)
