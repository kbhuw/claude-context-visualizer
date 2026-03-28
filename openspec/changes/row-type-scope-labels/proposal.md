## Why

The Overview tab's card rows display items (MCP servers, plugins, skills, hooks) without showing their type or scope at a glance, making it hard to distinguish what kind of item each row represents without clicking through. Adding visible type and scope labels directly on each row improves scannability and helps users understand their context configuration without extra navigation.

## What Changes

- Each clickable row in the Overview tab cards will display a **type label** (e.g., `mcpserver`, `plugin`, `skill`, `hook`) as a visible badge alongside the item name.
- Each row will also display a **scope label** (`global` or `local`) as a visible badge — currently the scope is only implied by which section group (Global/Local) the row appears in.
- The dedicated tab views (McpServersTab, SkillsTab, HooksTab) already show scope badges on their rows; this change ensures the Overview tab rows are consistent with those tabs.

## Capabilities

### New Capabilities

- `row-type-scope-labels`: Display type and scope as visible badge labels on each clickable row within the Overview tab cards.

### Modified Capabilities

<!-- No existing spec-level behavior is changing -->

## Impact

- `src/components/OverviewTab.tsx`: The `renderItems` function's row buttons need type and scope badge elements added.
- No API changes, no new dependencies, no data model changes (type and scope fields already exist on all item types in `src/lib/types.ts`).
- The `CardSection` interface already carries `type` and each item already carries `scope`, so no structural changes are needed — only UI rendering.
