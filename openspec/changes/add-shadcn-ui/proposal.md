## Why

The app currently uses hand-rolled Tailwind utility classes with inline color tokens (e.g., `#1a1a1a`, `#e5e5e5`) scattered across every component. This produces inconsistent styling, duplicated patterns, and a maintenance burden. Adopting shadcn/ui introduces a battle-tested, accessible component library built on Radix UI primitives that integrates with Tailwind CSS, giving the app a polished, consistent design system with minimal ongoing upkeep.

## What Changes

- Install shadcn/ui, Radix UI primitives, and `class-variance-authority` / `clsx` / `tailwind-merge` as dependencies
- Add `components.json` shadcn configuration to the project root
- Extend `globals.css` with the shadcn CSS variable theme (background, foreground, card, border, input, ring, etc.)
- Update `tailwind.config` / postcss to reference the shadcn theme tokens
- Replace the custom `<select>` in `ProjectSelector` with shadcn `Select`
- Replace the custom text `<input>` fields in `ProjectSelector` and `SourcesPanel` with shadcn `Input`
- Replace custom `<button>` elements throughout (ProjectSelector, SourcesPanel, TabNav, DetailPanel) with shadcn `Button`
- Replace the tab strip in `TabNav` with shadcn `Tabs` / `TabsList` / `TabsTrigger`
- Replace the detail side panel scaffold in `DetailPanel` with shadcn `Sheet`
- Replace the collapsible card in `SourcesPanel` with shadcn `Collapsible`
- Replace hardcoded badge spans (scope, source labels) with shadcn `Badge`
- Replace the error alert in `page.tsx` with shadcn `Alert` / `AlertDescription`

## Capabilities

### New Capabilities
- `design-system`: shadcn/ui component library integration — CSS variable theming, shadcn `Button`, `Input`, `Select`, `Tabs`, `Badge`, `Alert`, `Sheet`, and `Collapsible` components wired into the existing UI

### Modified Capabilities
<!-- No existing openspec/specs capabilities have requirement-level changes. -->

## Impact

- **Dependencies**: adds `@radix-ui/*` packages, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
- **Files modified**: `package.json`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx` (font/theme tokens), all 8 component files under `src/components/`, `src/app/page.tsx`
- **New files**: `components.json`, `src/components/ui/` directory with shadcn-generated component files
- **No API or data-layer changes**; all modifications are purely presentational
