## ADDED Requirements

### Requirement: shadcn/ui dependency installation
The project SHALL declare `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-collapsible`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react` as production dependencies in `package.json`.

#### Scenario: Dependencies present after install
- **WHEN** a developer runs `npm install`
- **THEN** all listed Radix UI packages, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react` are resolvable from `node_modules`

### Requirement: shadcn components.json configuration
The project root SHALL contain a `components.json` file that specifies the shadcn style (`"default"`), the Tailwind CSS config path, the global CSS path, the component alias (`@/components`), and the utility alias (`@/lib/utils`).

#### Scenario: components.json is present and valid
- **WHEN** the project root is inspected
- **THEN** a `components.json` file exists with `style`, `tailwind`, `aliases` keys conforming to the shadcn schema

### Requirement: CSS variable design token layer
`src/app/globals.css` SHALL define the full set of shadcn CSS variables inside `:root` including at minimum: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, and `--radius`. Values SHALL reflect the existing neutral palette (`#1a1a1a` foreground, `#fafafa` background, `#e5e5e5` borders).

#### Scenario: Design tokens available at runtime
- **WHEN** the app is rendered in a browser
- **THEN** `getComputedStyle(document.documentElement).getPropertyValue('--background')` returns a non-empty value

### Requirement: cn() utility helper
`src/lib/utils.ts` SHALL export a `cn` function that merges Tailwind class names using `clsx` and `tailwind-merge`, usable as `cn('base-class', conditionalClass && 'extra')`.

#### Scenario: cn merges conflicting classes correctly
- **WHEN** `cn('px-4', 'px-2')` is called
- **THEN** the result is `'px-2'` (tailwind-merge deduplication)

### Requirement: Scaffolded shadcn UI component files
The directory `src/components/ui/` SHALL contain source files for: `button.tsx`, `input.tsx`, `select.tsx`, `tabs.tsx`, `sheet.tsx`, `badge.tsx`, `alert.tsx`, and `collapsible.tsx`. Each file SHALL export the primary named component(s) expected by shadcn conventions.

#### Scenario: UI components importable
- **WHEN** another component imports `{ Button } from '@/components/ui/button'`
- **THEN** the import resolves without TypeScript errors and renders a `<button>` element

### Requirement: Button component replaces hand-rolled buttons
Every interactive `<button>` element in `ProjectSelector`, `SourcesPanel`, `TabNav`, and `DetailPanel` SHALL be replaced with the shadcn `Button` component using the appropriate `variant` prop (`default`, `outline`, `ghost`, or `secondary`). The `disabled` prop and `onClick` behavior SHALL be preserved.

#### Scenario: Primary action button renders correctly
- **WHEN** the "Load" button in `ProjectSelector` is rendered with `disabled={false}`
- **THEN** a `<button>` element with `type="submit"` and the `default` variant styling is present in the DOM

#### Scenario: Disabled state is forwarded
- **WHEN** `customPath` is empty in `ProjectSelector`
- **THEN** the "Load" `Button` has the `disabled` attribute and visual disabled styling

### Requirement: Input component replaces hand-rolled text inputs
Every `<input type="text">` in `ProjectSelector` and `SourcesPanel` SHALL be replaced with the shadcn `Input` component. The `placeholder`, `value`, `onChange`, `disabled`, and `autoFocus` props SHALL be forwarded correctly.

#### Scenario: Custom path input renders with placeholder
- **WHEN** `ProjectSelector` mounts with no pre-filled value
- **THEN** an `<input>` element with `placeholder="Custom path..."` is visible

### Requirement: Select component replaces the project dropdown
The `<select>` element in `ProjectSelector` SHALL be replaced with shadcn `Select` (composed of `SelectTrigger`, `SelectContent`, `SelectItem`). The selected value, change handler, and disabled state SHALL behave identically to the original `<select>`.

#### Scenario: Select displays current project
- **WHEN** `selectedProject` prop is set to a known project path
- **THEN** the `Select` trigger displays that path as the selected value

#### Scenario: Select emits correct value on change
- **WHEN** the user opens the Select and chooses an option
- **THEN** `onSelectProject` is called with the chosen project path (or `null` for Global View)

### Requirement: Tabs component replaces hand-rolled tab navigation
`TabNav` SHALL be replaced with shadcn `Tabs`, `TabsList`, and `TabsTrigger`. The `activeTab` prop SHALL map to the `value` prop on `Tabs`. Count badges SHALL be rendered as children inside `TabsTrigger`. Arrow-key navigation between tabs SHALL work via Radix UI keyboard handling.

#### Scenario: Active tab is visually selected
- **WHEN** `activeTab="mcpServers"` is passed to the nav
- **THEN** the "MCP Servers" `TabsTrigger` has `aria-selected="true"`

#### Scenario: Count badge visible inside trigger
- **WHEN** `counts.mcpServers` is 3
- **THEN** a badge showing "3" is rendered inside the MCP Servers tab trigger

### Requirement: Sheet component replaces hand-rolled detail panel
`DetailPanel` SHALL render using shadcn `Sheet` with `side="right"`. The overlay, close button, open/close animation, and `onClose` callback SHALL be handled by `Sheet`'s built-in Radix Dialog primitives. The panel content (metadata rows, raw config, file content) SHALL remain unchanged.

#### Scenario: Panel opens when item is selected
- **WHEN** `item` prop transitions from `null` to a non-null value
- **THEN** the Sheet becomes visible with `aria-modal="true"` and focus moves inside

#### Scenario: Panel closes on backdrop click
- **WHEN** the user clicks the Sheet overlay
- **THEN** `onClose` is called and the panel is dismissed

#### Scenario: Panel closes on Escape key
- **WHEN** the panel is open and the user presses Escape
- **THEN** `onClose` is called and the panel is dismissed

### Requirement: Collapsible component replaces hand-rolled expand/collapse in SourcesPanel
The expand/collapse toggle in `SourcesPanel` SHALL be replaced with shadcn `Collapsible`, `CollapsibleTrigger`, and `CollapsibleContent`. Initial expanded state SHALL remain `true`. The chevron icon animation on toggle SHALL be preserved.

#### Scenario: Sources list visible on mount
- **WHEN** `SourcesPanel` first renders
- **THEN** the source rows are visible (Collapsible defaults to open)

#### Scenario: Toggle collapses the source list
- **WHEN** the user clicks the "Config Sources" header button
- **THEN** the source list is hidden

### Requirement: Badge component replaces inline badge spans
All inline `<span>` elements used as scope badges (global/local/custom) and source label badges across `SourcesPanel` and `OverviewTab` SHALL be replaced with the shadcn `Badge` component. The existing semantic color variants (blue for global, green for local, purple for custom) SHALL be preserved as custom `variant` props on the Badge.

#### Scenario: Global scope badge renders with correct style
- **WHEN** a source with `scope="global"` is rendered in `SourcesPanel`
- **THEN** a `Badge` with the `global` variant (blue color scheme) appears

### Requirement: Alert component replaces inline error display
The hardcoded error `<div>` in `page.tsx` SHALL be replaced with shadcn `Alert` and `AlertDescription` using the `destructive` variant.

#### Scenario: Error is surfaced via Alert
- **WHEN** the context fetch fails and `error` state is set
- **THEN** an `Alert` with `variant="destructive"` is rendered containing the error message text
