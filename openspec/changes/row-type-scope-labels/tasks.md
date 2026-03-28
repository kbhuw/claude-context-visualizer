## 1. Update OverviewTab Row Rendering

- [x] 1.1 In `src/components/OverviewTab.tsx`, update the `renderItems` function to pass the `section.type` value into the row render so each row knows its type label.
- [x] 1.2 Add a type badge element (`bg-gray-100 text-[#666]`) inline after the item name in the row button, displaying the section type string.
- [x] 1.3 Add a scope badge element (`bg-blue-50 text-blue-600` for global, `bg-green-50 text-green-600` for local) inline after the type badge, displaying the item's `scope` value.
- [x] 1.4 Ensure the existing source badge remains at the trailing edge of the row (no change to its position or styling).
- [x] 1.5 Verify that both new badge elements use `flex-shrink-0` so they do not get clipped when the item name is long and truncates.

## 2. Verification

- [x] 2.1 Visually confirm that MCP server rows in the Overview card show a type badge (e.g., `stdio`) and a scope badge (`global` or `local`).
- [x] 2.2 Visually confirm that Plugin rows show type and scope badges.
- [x] 2.3 Visually confirm that Skill rows show type and scope badges.
- [x] 2.4 Visually confirm that Hook rows show type badge (e.g., `PreToolUse`) and scope badge.
- [x] 2.5 Confirm that clicking a row still calls `onSelectItem` correctly (badges do not interfere with click handling).
- [x] 2.6 Confirm the layout at a narrow viewport: item name truncates, all three badges remain visible.
