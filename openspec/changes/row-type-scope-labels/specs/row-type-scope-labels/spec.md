## ADDED Requirements

### Requirement: Overview card rows display a type badge
Each clickable row within an Overview tab card SHALL display a visible type badge that identifies the category of the item. The badge text SHALL be the item's type string (e.g., `mcpserver`, `plugin`, `skill`, `hook`). The badge SHALL use a neutral gray style (`bg-gray-100 text-[#666]`) consistent with type badges in other tab views.

#### Scenario: MCP server row shows type badge
- **WHEN** the Overview tab renders an MCP server row inside the MCP Servers card
- **THEN** a badge with the server's `type` value (e.g., `stdio`, `sse`) is visible next to the item name

#### Scenario: Plugin row shows type badge
- **WHEN** the Overview tab renders a plugin row inside the Plugins card
- **THEN** a badge reading `plugin` (from the section type) is visible next to the item name

#### Scenario: Skill row shows type badge
- **WHEN** the Overview tab renders a skill row inside the Skills card
- **THEN** a badge reading `skill` is visible next to the item name

#### Scenario: Hook row shows type badge
- **WHEN** the Overview tab renders a hook row inside the Hooks card
- **THEN** a badge with the hook's `type` value (e.g., `PreToolUse`, `PostToolUse`) is visible next to the item name

### Requirement: Overview card rows display a scope badge
Each clickable row within an Overview tab card SHALL display a visible scope badge showing whether the item is `global` or `local`. The badge SHALL use color-coded styling: blue (`bg-blue-50 text-blue-600`) for global and green (`bg-green-50 text-green-600`) for local, matching the scope badge style used in the dedicated tab views (McpServersTab, SkillsTab, HooksTab).

#### Scenario: Global item row shows blue scope badge
- **WHEN** an Overview card row renders an item with `scope === 'global'`
- **THEN** a badge reading `global` with blue styling (`bg-blue-50 text-blue-600`) is displayed on the row

#### Scenario: Local item row shows green scope badge
- **WHEN** an Overview card row renders an item with `scope === 'local'`
- **THEN** a badge reading `local` with green styling (`bg-green-50 text-green-600`) is displayed on the row

### Requirement: Type and scope badges are positioned inline with the item name
The type badge and scope badge SHALL appear inline in the row layout, adjacent to the item name, and SHALL NOT displace the existing source badge at the trailing edge of the row. Badge elements SHALL be non-interactive (decorative/informational only) and SHALL NOT trigger navigation or selection when clicked independently.

#### Scenario: Badge layout order is name, type, scope, source
- **WHEN** an Overview card row is rendered with all fields present
- **THEN** the visual order from left to right is: item name, type badge, scope badge, source badge

#### Scenario: Item name truncates before badges are clipped
- **WHEN** an Overview card row is rendered in a narrow container
- **THEN** the item name truncates with an ellipsis while the type, scope, and source badges remain fully visible
