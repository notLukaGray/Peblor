# Preset Extraction Audit Brief

## Goal

Audit every page under `content/pages/presets/` (86 pages) and identify where inline element definitions should be extracted into reusable presets under `content/presets/`. These pages are peblor's building-block showcase — any pattern defined here should be usable by any other page on the site.

## How presets work

### Namespace

All preset files under `content/presets/` are merged into a single flat namespace at load time. Keys must be globally unique across all files. Pages import them via the `presets` array in index.json (e.g. `["demo", "type/core", "bg"]`).

### Merge semantics (last always wins)

When a block references a preset:

```
preset properties → spread first
local overrides   → spread second (win)
```

This means a page can use a preset as a base and override any field. You don't need the preset to be a perfect match — just a good starting point.

Nested `definitions` merge recursively. Arrays (`elementOrder`) replace entirely.

### Current preset categories

| Directory | Contents                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `demo/`   | Demo page shells: `demo-section`, `demo-hero`, `demo-hero-100vh`, `preset-demo-nav-header`, card shells |
| `type/`   | Typography presets: `type/core`, `type/effects`, `type/motion`, `type/patterns`, `type/special`         |
| `ui/`     | UI elements: `ui/button`, `ui/link`                                                                     |
| `bg/`     | Background presets (all background types)                                                               |
| `card/`   | Card layout presets                                                                                     |
| `layout/` | Composition layout presets (columns, flows)                                                             |
| `player/` | Media player presets (`player/control`, `player/shell`, `player/surface`, `player/crossmedia`)          |
| `video/`  | Video control presets                                                                                   |

## What belongs in presets vs inline

### Should be a preset

- Any `elementGroup` or element definition that appears in 2+ pages with the same or similar structure
- Button configurations (fills, paddings, borders, motion) beyond what `btn-primary`/`btn-secondary` already cover
- Section-level patterns that aren't covered by `demo-section`
- Element compositions (icon + label groups, badge patterns, card shells)
- State indicator panels, indicator badges, status chips
- Any layout pattern another page might want to drop in

### Should stay inline (page-level)

- Page-specific text (`text`, `label`)
- One-off demo arrangements that exist only to showcase variety
- Demo data / mock content
- `action`/`actionPayload` on demo buttons (these are sandbox wiring, not reusable patterns)

## What to look for

For each page, examine every definition (hydrated — read the sidecar files, not just index.json). For each element:

1. **Inline `elementButton` with full styling** — all 70+ preset pages define their demo buttons inline. The `ui/button` presets (`btn-primary`, `btn-secondary`, etc.) exist but are underused. Check if each inline button could use a button preset instead, or if new button presets are needed.

2. **Inline `elementGroup` patterns** — the indicator panels (`indicator-panel`, `copy-indicator`, `sequence-indicator`, `modal-simulator`) in actions-sandbox are prime candidates. They're defined inline with `wrapperStyle`, `visibleWhen`, `padding`, and nested child elements. These patterns repeat conceptually across pages.

3. **Section layout overrides** — sections using `preset: demo-section` that override `width`, `padding`, `gap`, `maxWidth`. If the same override set appears on multiple pages, it should be its own preset.

4. **Element compositions that repeat** — the `sec-label` + `sec-desc` + `demo-buttons` pattern appears on virtually every demo page. The label/desc pair at minimum could be a preset.

5. **Typography usage** — check if `type/core` presets (`type-h1-display`, `type-h3-label`, `type-body-fine`, `type-kicker-badge`, etc.) cover all use cases. If a heading/body pattern is defined inline without a type preset, it needs one.

## Current state (known from prior audit)

- 63 pages: content identical between presplit source and working version (only structural conversion `type → preset` applied)
- The conversion correctly extracted section shells into `demo-section` and moved sections into sidecar files
- Button presets exist (`btn-primary`, `btn-secondary`) but were only applied to `buttons-system` page — most other pages still define buttons fully inline
- The `mergeNestedSectionDefinitions` bug (now fixed) previously caused element key collisions across sidecars; no lingering effect

## Audit output format

For each finding, report:

```
PAGE: <route>
SECTION: <section-key>
ELEMENT: <element-key>
TYPE: <element type>
ISSUE: <what's wrong — e.g. "inline button should use btn-primary", "repeated group pattern across 5 pages">
SUGGESTION: <what preset to extract or which existing preset to use>
PRIORITY: <high/medium/low — based on reuse potential>
```

## Key constraints

- The `content/pages/presets/` directory uses the route `/presets/` — these pages exist as both functional pages AND reference implementations
- Any preset extracted must work standalone (a page importing just that preset should get the full definition)
- Preset keys must be globally unique — check `list_presets` before naming
- Don't extract page-specific demo content (text, action payloads) — only structural/style patterns
- The `preset` merge system means presets don't need to be perfect fits — overrides are expected
