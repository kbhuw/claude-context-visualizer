## ADDED Requirements

### Requirement: Sources panel heading displays "Sources"
The `SourcesPanel` component SHALL display the section heading label as "Sources" rather than "Config Sources".

#### Scenario: Panel heading shows correct label
- **WHEN** the `SourcesPanel` component is rendered
- **THEN** the collapsible section heading SHALL read "Sources"

#### Scenario: "Config Sources" label is absent
- **WHEN** the `SourcesPanel` component is rendered
- **THEN** the text "Config Sources" SHALL NOT appear in the rendered output
