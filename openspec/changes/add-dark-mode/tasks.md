## 1. CSS Foundation

- [x] 1.1 Add `@custom-variant dark (&:where(.dark, .dark *));` to `src/app/globals.css` to enable Tailwind v4 class-based dark mode
- [x] 1.2 Add `.dark` CSS block in `globals.css` overriding `--background` to `#111111` and `--foreground` to `#fafafa`

## 2. ThemeProvider Context

- [x] 2.1 Create `src/components/ThemeProvider.tsx` exporting `ThemeProvider` component and `useTheme` hook with `{ theme: 'light' | 'dark', toggleTheme: () => void }` interface
- [x] 2.2 Implement `localStorage` read on mount: read `theme` key; fall back to `window.matchMedia('(prefers-color-scheme: dark)')` if absent
- [x] 2.3 Implement `dark` class toggling on `document.documentElement` whenever theme state changes
- [x] 2.4 Implement `toggleTheme` to flip state and write new value to `localStorage`

## 3. ThemeToggle Component

- [x] 3.1 Create `src/components/ThemeToggle.tsx` that reads `useTheme()` and renders a button with a sun SVG icon in dark mode and a moon SVG icon in light mode
- [x] 3.2 Ensure the toggle button has accessible `aria-label` ("Switch to light mode" / "Switch to dark mode")

## 4. Layout Integration

- [x] 4.1 Wrap `{children}` in `ThemeProvider` in `src/app/layout.tsx`
- [x] 4.2 Add `suppressHydrationWarning` to the `<html>` element in `layout.tsx` to suppress hydration mismatch from `dark` class

## 5. Header Update

- [x] 5.1 Add `ThemeToggle` button to the header in `src/app/page.tsx`, positioned in the top-right of the header bar
- [x] 5.2 Update page-level hardcoded color classes in `page.tsx` to include `dark:` variants (background, header, text, error state, empty state, loading text)

## 6. Component Dark Mode Styles

- [x] 6.1 Update `src/components/TabNav.tsx` — add `dark:` variants for border, active tab indicator, count badge, and text colors
- [x] 6.2 Update `src/components/ProjectSelector.tsx` — add `dark:` variants for select, input, and button backgrounds, borders, and text
- [x] 6.3 Update `src/components/SourcesPanel.tsx` — add `dark:` variants for panel background, borders, scope badge colors, source row backgrounds, and text
- [x] 6.4 Update `src/components/DetailPanel.tsx` — add `dark:` variants for panel background, borders, and text
- [x] 6.5 Update `src/components/OverviewTab.tsx` — add `dark:` variants for all card and text colors
- [x] 6.6 Update `src/components/McpServersTab.tsx` — add `dark:` variants for all card and text colors
- [x] 6.7 Update `src/components/PluginsTab.tsx` — add `dark:` variants for all card and text colors
- [x] 6.8 Update `src/components/SkillsTab.tsx` — add `dark:` variants for all card and text colors
- [x] 6.9 Update `src/components/HooksTab.tsx` — add `dark:` variants for all card and text colors
- [x] 6.10 Update `src/components/ClaudeMdTab.tsx` — add `dark:` variants for prose text and code block backgrounds

## 7. Scrollbar Styling

- [x] 7.1 Add dark-mode scrollbar thumb color override in `globals.css` using `.dark ::-webkit-scrollbar-thumb` selector

## 8. Verification

- [x] 8.1 Manually verify light mode renders correctly with no visual regressions
- [x] 8.2 Manually verify dark mode renders all components with correct dark palette
- [x] 8.3 Verify theme preference persists across page reload (check `localStorage`)
- [x] 8.4 Verify OS dark mode default is respected when no `localStorage` preference exists
- [x] 8.5 Run `npm run build` to confirm no TypeScript or Tailwind compilation errors
