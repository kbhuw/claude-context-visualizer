## Context

The Claude Context Visualizer Overview tab presents four cards (MCP Servers, Plugins, Skills, Hooks), each rendering clickable rows for its items. Currently each row shows the item name and a source badge, but the item's **type** and **scope** are not visible inline — scope is only inferred from the Global/Local section header above the row group.

The dedicated per-type tabs (McpServersTab, SkillsTab, HooksTab) already display scope badges on their rows. OverviewTab diverges from this pattern because it was designed to be compact, but users navigating the overview have no quick way to confirm what type of item a row is.

All required data is already available: the `CardSection.type` string and each item's `scope` field flow through to `renderItems` in `OverviewTab.tsx`. No API, data-model, or scanner changes are required.

## Goals / Non-Goals

**Goals:**
- Add a **type badge** to each row in OverviewTab cards showing the item type (`mcpserver`, `plugin`, `skill`, `hook`).
- Add a **scope badge** to each row showing `global` or `local`, consistent with the style used in dedicated tab views.
- Keep changes contained to `OverviewTab.tsx` — no other files should need modification.

**Non-Goals:**
- Changing the dedicated tab views (McpServersTab, PluginsTab, SkillsTab, HooksTab) — they already show scope badges.
- Adding interactivity to the badges (they are decorative/informational only).
- Changing the filtering or grouping logic (items still grouped by scope under Global/Local headers).

## Decisions

**Decision 1: Reuse existing badge styling rather than introducing new classes**

The dedicated tabs already use a consistent badge style (`text-[10px] px-1.5 py-0.5 rounded font-medium`). The OverviewTab already uses this same pattern for the source badge on each row. We will use the same pattern for type and scope badges to keep the visual language consistent.

Alternatives considered:
- Introduce a shared `Badge` component: adds indirection for a minor change; deferred until more callsites justify it.
- Use a pill/rounded-full style: inconsistent with existing tab badges.

**Decision 2: Type badge uses a neutral gray, scope badge uses color-coded blue/green**

Type labels (`mcpserver`, `plugin`, `skill`, `hook`) are factual classifiers — neutral gray (`bg-gray-100 text-[#666]`) is appropriate and matches how `McpServersTab` styles its type badge.

Scope labels carry semantic meaning (global = applies everywhere, local = project-specific) and are already color-coded blue/green throughout the app. Scope badges in OverviewTab rows will follow that convention (`bg-blue-50 text-blue-600` for global, `bg-green-50 text-green-600` for local), matching the dedicated tabs.

**Decision 3: Badge placement — type then scope, trailing after the item name, before the source badge**

Current row layout: `[name] ... [source badge]`

New layout: `[name] [type badge] [scope badge] ... [source badge]`

Placing type and scope adjacent to the name groups identity information together. The source badge stays at the trailing edge as it is secondary metadata about origin.

## Risks / Trade-offs

- **Row width pressure on small screens**: Three badges per row could crowd narrow viewports. The row already uses `truncate` on the name and `flex-shrink-0` on the source badge; type and scope badges will also be `flex-shrink-0`. The name will absorb any remaining truncation. → Acceptable: the Overview tab already uses a two-column grid on `md` screens and the badges are small.
- **Redundant scope information**: Scope is already indicated by the Global/Local section header above each row group. Showing it again on each row is redundant but intentional — it makes individual rows self-describing when read in isolation (e.g., when copied into a bug report or when the grouping headers scroll out of view). → Accepted trade-off per the change requirement.
