## Context

Claude Context Visualizer is a Next.js 16 / React 19 single-page app styled with Tailwind CSS v4. All UI elements are hand-crafted: buttons, inputs, a `<select>`, a slide-out panel, tab navigation, collapsible sections, and badge-style labels are built with raw `<div>`, `<button>`, and `<span>` elements wired to Tailwind utility classes with inline hex color literals. There is no shared component abstraction or design token layer beyond `globals.css` CSS variables for background and foreground colors.

shadcn/ui is a "copy-and-own" library: running the CLI scaffolds source files into `src/components/ui/` which are then committed to the project and freely modified. Components are built on Radix UI accessibility primitives and use CSS variables for theming.

## Goals / Non-Goals

**Goals:**
- Establish a CSS-variable-based design token layer compatible with shadcn/ui's default theme
- Replace all current hand-rolled interactive components with shadcn equivalents (`Button`, `Input`, `Select`, `Tabs`, `Sheet`, `Badge`, `Alert`, `Collapsible`)
- Maintain identical user-facing behavior and layout; this is a visual/DX upgrade, not a feature change
- Ensure accessible focus rings, keyboard navigation, and ARIA roles supplied by Radix UI primitives

**Non-Goals:**
- Adding dark mode (separate change already tracked)
- Changing any API routes, data fetching logic, or types in `src/lib/`
- Introducing a storybook or visual regression test suite
- Customizing the shadcn color palette beyond wiring in the existing `#1a1a1a` / `#fafafa` brand colors as theme tokens

## Decisions

### 1. shadcn/ui "copy-and-own" over a packaged component library (e.g. Mantine, Chakra, NextUI)

shadcn/ui generates files into the repo, so components are fully under our control with zero runtime abstraction overhead. Radix UI primitives handle accessibility (focus traps, ARIA, keyboard events) without bundling an entire design system we don't use. Given the app already uses Tailwind, this is zero-friction.

**Alternatives considered:**
- *Mantine / Chakra*: large bundle, own styling system that conflicts with Tailwind
- *Headless UI*: fewer components, less complete than Radix

### 2. Use the default shadcn "neutral" theme with our existing color palette mapped to CSS variables

The existing palette (`#1a1a1a` foreground, `#fafafa` background, `#e5e5e5` borders) maps cleanly to shadcn's `--foreground`, `--background`, and `--border` tokens. We will seed `globals.css` with the full shadcn CSS variable set and tune the values to match the current look, so visual change is minimal.

**Alternatives considered:**
- *Wholesale adopt shadcn default blue/slate palette*: would change the visual identity unnecessarily

### 3. Replace `DetailPanel` with shadcn `Sheet` (slide-over)

The current panel is a fixed-position `<div>` with a hand-rolled overlay. `Sheet` (from `@radix-ui/react-dialog`) provides a focus-trapped, keyboard-dismissible drawer with correct `aria-modal` semantics out of the box, eliminating ~80 lines of custom code.

### 4. Replace `TabNav` with shadcn `Tabs`

The existing tab bar is a `<div>` of `<button>` elements with manual active-state styling. shadcn `Tabs` (built on `@radix-ui/react-tabs`) handles `aria-selected`, `role="tablist"`, and keyboard arrow-key navigation automatically. The count badges are retained as custom children inside `TabsTrigger`.

### 5. Keep `OverviewCard` component, adopt `Badge` for source labels

`OverviewCard` is a layout-only component; it does not warrant a shadcn replacement. The inline `<span>` source and scope badges will be swapped to `<Badge variant="secondary">` for consistency.

### 6. Tailwind CSS v4 compatibility

Tailwind v4 uses a CSS-first configuration (`@import "tailwindcss"` in `globals.css`) rather than `tailwind.config.js`. shadcn expects a `tailwind.config.ts` to resolve `content` paths. We will add a minimal `tailwind.config.ts` for shadcn's `cn()` utility resolution and component path scanning, while keeping the v4 `@import` as the primary entry point.

## Risks / Trade-offs

- **Tailwind v4 + shadcn compatibility**: shadcn's init script and some component templates are written assuming Tailwind v3 conventions (`tailwind.config.js`, `content` array). → Mitigation: manually scaffold `components.json` and component files rather than relying on `npx shadcn init`; pin shadcn component versions that are known to work with v4 CSS variable approach.

- **React 19 + Radix UI peer-dep warnings**: Some Radix packages declare peer deps on React 18. → Mitigation: use `--legacy-peer-deps` during install; Radix packages work fine at runtime with React 19.

- **Visual regression**: Swapping components could introduce subtle spacing or focus-style differences. → Mitigation: manually verify each replaced component in the browser; the change is scoped to 8 component files and `page.tsx`.

- **Sheet focus trap in DetailPanel**: The current panel allows clicking outside to close via an `onClick` overlay; Radix Dialog/Sheet handles this automatically but the trigger pattern changes slightly. → Mitigation: retain `onClose` prop contract; map it to Sheet's `onOpenChange`.

## Migration Plan

1. Install npm packages (`@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`)
2. Add `components.json` at project root
3. Update `globals.css` with shadcn CSS variable block; add `tailwind.config.ts` with content paths
4. Scaffold `src/components/ui/` with: `button`, `input`, `select`, `tabs`, `sheet`, `badge`, `alert`, `collapsible`
5. Update `src/lib/utils.ts` (or create) with the `cn()` helper
6. Migrate components one at a time: `ProjectSelector` → `Button` + `Input` + `Select`; `TabNav` → `Tabs`; `SourcesPanel` → `Collapsible` + `Input` + `Button` + `Badge`; `DetailPanel` → `Sheet`; `page.tsx` → `Alert`; all badge spans → `Badge`
7. Run `npm run build` and `npm run lint`; fix any type errors
8. Manual browser smoke test of all interactions

**Rollback**: all changes are in frontend component files with no database or API contract changes; reverting is a git revert.

## Open Questions

- Should the shadcn theme tokens be extended to include the existing semantic color classes used for scope badges (blue for global, green for local, purple for custom)? These could become `Badge` variants. Proposed answer: yes, add `badge-global`, `badge-local`, `badge-custom` variants to the Badge component.
