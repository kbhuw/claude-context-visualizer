## 1. Install Dependencies

- [x] 1.1 Add `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-collapsible` to `dependencies` in `package.json`
- [x] 1.2 Add `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` to `dependencies` in `package.json`
- [x] 1.3 Run `npm install --legacy-peer-deps` and verify no resolution errors

## 2. Configuration

- [x] 2.1 Create `components.json` at the project root with shadcn style `"default"`, tailwind config path, global CSS path, and aliases for `@/components` and `@/lib/utils`
- [x] 2.2 Add `tailwind.config.ts` with `content` array covering `src/**/*.{ts,tsx}` for shadcn component class scanning
- [x] 2.3 Update `src/app/globals.css` — add the full shadcn CSS variable block under `:root` mapping `--background`, `--foreground`, `--card`, `--border`, `--input`, `--ring`, `--radius`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, and their `-foreground` variants to the existing neutral palette values

## 3. Utility Helper

- [x] 3.1 Create `src/lib/utils.ts` exporting a `cn()` function implemented with `clsx` and `tailwind-merge`

## 4. Scaffold shadcn UI Components

- [x] 4.1 Create `src/components/ui/button.tsx` — `Button` component with `variant` and `size` props using `class-variance-authority`
- [x] 4.2 Create `src/components/ui/input.tsx` — `Input` component forwarding all standard input props
- [x] 4.3 Create `src/components/ui/select.tsx` — `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` using `@radix-ui/react-select`
- [x] 4.4 Create `src/components/ui/tabs.tsx` — `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` using `@radix-ui/react-tabs`
- [x] 4.5 Create `src/components/ui/sheet.tsx` — `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetClose` using `@radix-ui/react-dialog`
- [x] 4.6 Create `src/components/ui/badge.tsx` — `Badge` with `default`, `secondary`, `outline`, `destructive`, `global`, `local`, and `custom` variants
- [x] 4.7 Create `src/components/ui/alert.tsx` — `Alert` and `AlertDescription` with `default` and `destructive` variants
- [x] 4.8 Create `src/components/ui/collapsible.tsx` — `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` re-exported from `@radix-ui/react-collapsible`

## 5. Migrate ProjectSelector

- [x] 5.1 Replace the `<select>` element with shadcn `Select` / `SelectTrigger` / `SelectContent` / `SelectItem`; preserve `value`, `onChange` → `onValueChange`, and `disabled` behavior
- [x] 5.2 Replace the custom path `<input>` with shadcn `Input`
- [x] 5.3 Replace the "Load" `<button>` with `<Button type="submit" variant="default">`
- [x] 5.4 Replace the "Global View" `<button>` with `<Button variant="outline">`

## 6. Migrate TabNav

- [x] 6.1 Rewrite `TabNav` using `Tabs`, `TabsList`, and `TabsTrigger`; bind `activeTab` to the `value` prop on `Tabs` and forward `onTabChange` via `onValueChange`
- [x] 6.2 Retain count badges as inline children inside each `TabsTrigger`; apply appropriate badge styling

## 7. Migrate SourcesPanel

- [x] 7.1 Replace the expand/collapse `<button>` + manual state with `Collapsible`, `CollapsibleTrigger`, and `CollapsibleContent`; preserve default-open state
- [x] 7.2 Replace scope badge `<span>` elements with `<Badge>` using `global`, `local`, or `custom` variant
- [x] 7.3 Replace the add-source `<input>` with `Input`
- [x] 7.4 Replace "Add", "Cancel", and the collapse-toggle `<button>` elements with `Button` using appropriate variants (`default`, `outline`, `ghost`)

## 8. Migrate DetailPanel

- [x] 8.1 Wrap `DetailPanel` content in `Sheet` with `side="right"`, controlled by an `open` prop derived from `item !== null`; forward `onClose` to `onOpenChange`
- [x] 8.2 Replace the manual close `<button>` with `SheetClose` (or `Button variant="ghost"` inside `SheetHeader`)
- [x] 8.3 Replace the "Open in Finder" `<button>` with `<Button variant="outline" size="sm">`
- [x] 8.4 Remove the hand-rolled overlay `<div>` and fixed-position panel `<div>` now handled by `Sheet`

## 9. Migrate OverviewTab

- [x] 9.1 Replace inline source/scope badge `<span>` elements in `OverviewCard` with `<Badge>` using appropriate variants

## 10. Migrate page.tsx

- [x] 10.1 Replace the error `<div className="bg-red-50 ...">` with `<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>`

## 11. Verification

- [x] 11.1 Run `npm run build` and confirm zero TypeScript and ESLint errors
- [x] 11.2 Run the dev server and smoke-test: project selector dropdown, custom path input, tab switching (including keyboard arrow keys), sources panel expand/collapse, detail panel open/close (click outside, Escape key, close button), error state display
- [x] 11.3 Confirm all badge variants (global, local, custom, source labels) render with correct colors
