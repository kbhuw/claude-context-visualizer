## Why

The panel label "Config Sources" is unnecessarily verbose — the word "Config" is redundant in context, since the panel already lives on a page dedicated to configuration sources. Shortening it to "Sources" improves clarity and reduces visual clutter in the UI.

## What Changes

- The heading text inside `SourcesPanel` will change from `Config Sources` to `Sources`.

## Capabilities

### New Capabilities

- `sources-panel-label`: Display label for the sources panel section heading.

### Modified Capabilities

## Impact

- `src/components/SourcesPanel.tsx` — the only file containing the string "Config Sources" (line 59).
