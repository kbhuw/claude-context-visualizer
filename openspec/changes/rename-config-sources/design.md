## Context

The `SourcesPanel` component renders a collapsible section heading with the label "Config Sources". This string is a plain JSX text node on line 59 of `src/components/SourcesPanel.tsx`. There are no translations, no constants, and no other references to this label across the codebase.

## Goals / Non-Goals

**Goals:**
- Replace the UI label "Config Sources" with "Sources" in `SourcesPanel`.

**Non-Goals:**
- Renaming any TypeScript types, interfaces, or variables (e.g., `ConfigSource`).
- Changing any API routes, data models, or backend logic.
- Introducing i18n or string-constant infrastructure.

## Decisions

**Direct text replacement rather than extracting to a constant.**

Given this is a single occurrence in a single file, extracting the string to a named constant would add unnecessary indirection. A direct in-place text edit is simpler and easier to review.

## Risks / Trade-offs

- **Risk**: A future copy change may require hunting the string again if more labels are added. → The scope of this change is intentionally narrow; no infrastructure is warranted for a single string.
