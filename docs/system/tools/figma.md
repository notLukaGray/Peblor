# Figma tools: plugin, bridge, widget

Three tools form Peblor's Figma integration family. They share a common purpose -- turning Figma designs into Peblor JSON -- but they operate at different points in the workflow. The **plugin** does the actual export. The **bridge** provides shared types and normalization logic that both the plugin and widget depend on. The **widget** provides real-time in-canvas feedback during design.

Between them, they handle the entire journey from "designer lays out frames in Figma" to "content JSON is sitting in `content/pages/` ready for editing."

---

## The big picture: data flow from Figma to content

Before diving into each tool, here's how the full pipeline works end to end. This should give you a mental model for where each piece fits.

**Step 1: Design in Figma with conventions.** A designer creates frames in Figma using Peblor's naming conventions. Frame names determine what kind of content they become: a frame named `Page/Home` becomes a page, `Section/Hero` becomes a section, `btn-primary` becomes a preset. Designers can also add `[pb: ...]` annotations in layer names to explicitly override type detection -- things like `[pb: type=elementTabs]` to force a specific element type.

**Step 2: Real-time feedback from the widget.** As the designer works, the widget runs on the canvas. It scans frames, checks naming conventions, detects orphaned responsive pairs (a desktop frame without its mobile counterpart), and flags issues. All of this happens without leaving the Figma canvas or opening a plugin panel. The widget is the fast feedback loop -- it catches problems while they're cheap to fix.

**Step 3: Export through the plugin.** When the design is ready, the designer opens the plugin UI, selects frames (or lets it auto-detect top-level frames), and runs the export. The plugin collects frames, detects responsive pairs, converts Figma nodes to Peblor JSON, validates the output against Zod schemas, and presents the result.

**Step 4: Normalization through the bridge.** Throughout this process, the bridge library provides the core logic that both the plugin and widget rely on: parsing layer names, stripping annotations, detecting export targets, running heuristic rules, and producing a consistent intermediate representation. The bridge strips Figma-specific noise so the plugin's converters don't have to deal with it.

**Step 5: Output lands in the content directory.** The export result (pages, presets, modals, modules, backgrounds) is made available in three output modes: copy to clipboard (for pasting into files), copy as a single merged page, or download as a zip file structured like the content directory. The JSON files are ready to drop into `content/pages/`, `content/presets/`, `content/modals/`, and `content/modules/`.

**Step 6: CLI and MCP take over.** Once the JSON is in the content directory, the CLI and MCP server handle everything else -- validation, editing, batch operations, and deployment. The same Figma export payload can also be imported via the CLI (`pb-cli import-figma <file>`) or MCP (`import_figma` tool), which accept the same format and write it directly.

---

## figma-plugin: the design-to-export engine

The plugin lives at `tools/figma-plugin/`. It runs inside Figma's sandboxed JavaScript environment and converts Figma frames into structured Peblor content. It's the heaviest of the three tools -- dozens of source files covering frame detection, responsive pairing, node conversion, output validation, and UI interaction.

### Two-thread architecture

Figma plugins run in a unique environment: the main thread is sandboxed (no DOM, no fetch, no network access -- just the Figma document API), while the UI thread runs in an embedded iframe with full DOM access. They communicate through `postMessage`.

The main thread entry point at `tools/figma-plugin/src/main.ts` is strikingly short. It calls `figma.showUI` with a panel size and title, then sets up `figma.ui.onmessage` to handle four message types from the UI: `export` (run the full export pipeline), `refresh-preview` (update the frame preview without running the full export), and `close` (shut down the plugin). That's it -- the main thread is essentially a message router.

The UI thread at `tools/figma-plugin/src/ui.ts` handles the interactive interface: showing frame previews with their detected export targets, displaying warnings and errors, offering export mode selection (clipboard, merged, or zip), and triggering exports.

### The export pipeline

The actual export orchestration lives in `tools/figma-plugin/src/main-run-export.ts`. It's a staged pipeline:

**Stage 1: Frame collection.** The `getSelectedFrames` function looks at the current Figma selection. If frames are selected, it uses those. If nothing is selected, it falls back to top-level frames on the current page. Frames marked with wrapper naming conventions (`pb-wrapper`, `pb:wrapper`, etc.) are unwrapped to reveal their child frames -- this lets designers group frames without affecting the export output. Frames are sorted top-to-bottom, left-to-right for consistent output order.

**Stage 2: Frame detection.** Each frame is classified by `detectExportTarget` (in `main-frame-detect.ts`). The function reads the frame's name and determines what kind of content it represents: a page (prefix `Page/` or unmarked), a section (`Section/`), a preset (`Preset/` or `btn-`, `card-`, etc.), a modal (`Modal/`), a module (`Module/`), or a background (`Bg/`). It also identifies responsive role: frames with desktop or mobile naming suffixes get tagged accordingly.

**Stage 3: Responsive pairing.** `detectResponsivePairs` (in `main-responsive-pairs.ts`) matches desktop and mobile frames by their key -- the part of the frame name after the prefix and before any responsive suffix. A frame named `Section/Hero [desktop]` and `Section/Hero [mobile]` share the key `Hero` and get paired. The desktop variant is identified by the absence of a responsive suffix. Frames that should be paired but don't have a counterpart get flagged as orphans.

**Stage 4: Conversion.** This is where Figma nodes become Peblor JSON. `convertNormalFrames` handles unpaired frames, while `convertResponsivePairs` handles the paired ones. Each frame is converted into a section object, and the frame's children are converted into elements. The conversion delegates to a converter directory at `tools/figma-plugin/src/converters/` organized by output type:

- `node-to-section.ts` routes frames to section types based on structure heuristics and annotations.
- `node-to-element.ts` routes child nodes to element types based on Figma node type, text content, and annotations.
- `text.ts` handles heading, body, and link conversion. It reads Figma text content and style properties, maps font sizes to Peblor heading levels (h1-h6), and detects links.
- `image.ts` handles image fills and frame-to-image conversion. Figma image fills become Peblor image elements with the appropriate CDN path.
- `button.ts` detects buttons from component instances (Figma button components) or annotated frames.
- `video-convert.ts` handles video placeholder detection and conversion -- frames with video fills or specific naming patterns.
- `vector.ts` converts Figma vector nodes to Peblor vector elements.
- `section-column.ts`, `section-reveal.ts`, `section-scroll-divider-form.ts` handle specialized section types.
- `fills/` directory converts solid fills, gradients, and image fills to Peblor's color/background format.
- `layout/` directory converts auto-layout properties, grids, borders, and frame properties.
- `effects.ts` converts Figma effects (drop shadows, layer blurs, etc.) to Peblor visual effects.
- `motion.ts` converts Figma prototype animations to Peblor motion config.
- `annotations.ts` and `annotations-parse.ts` handle `[pb: ...]` annotation parsing for explicit type overrides.
- `responsive-*.ts` handles merging compatible values from desktop and mobile frame variants.

The exporter coverage matrix at `tools/figma-plugin/EXPORTER_COVERAGE.md` tracks which section and element types have converter routes. Most section types have full support. Element types range from fully supported (heading, body, image, button) to annotation-gated (tabs, drag, tooltip -- these need a `[pb: type=...]` annotation to be detected) to missing (3D, infinite scroll, image compare, video time/quality selectors -- these need manual authoring or a converter addition).

**Stage 5: Validation.** After conversion, every output artifact is validated against the Zod schemas from `@pb/contracts`. Pages get checked against `peblorSchema`, presets against `peblorDefinitionBlockSchema`, modals against `modalBuilderSchema`, modules against `moduleBlockSchema`, and backgrounds against `bgBlockSchema`. Failures are reported back to the UI as structured diagnostics with severity levels.

**Stage 6: Output.** The result is sent to the UI thread as an `ExportResult` object containing pages, presets, modals, modules, backgrounds, asset refs, warnings, and errors. The UI offers three output modes: `copy` (JSON to clipboard), `copy-merged` (single merged page object), and `zip` (download as a zip archive structured like the content directory). The zip mode uses `tools/figma-plugin/src/ui-zip.ts` to bundle everything.

### The conversion context

Throughout the export, a `ConversionContext` object carries state: a running list of warnings and errors, a parity tracker (how many nodes were converted vs. dropped vs. used fallback), a set of used preset keys, an asset counter, a set of used IDs (to detect duplicates), and flag for whether assets should be skipped (for clipboard mode where CDN paths wouldn't make sense). This context is threaded through every stage of the pipeline.

### Section artifact export

The plugin supports exporting a single section as a standalone artifact via `buildSectionExportArtifact` in `tools/figma-plugin/src/main-section-export-artifact.ts`. This produces a self-contained section JSON object that can be dropped directly into a page or preset file. It's useful when you don't need a full page export -- just that one hero section you designed.

### Content directory splitting

The `split-page-for-content-dir.ts` utility converts a merged export result (where everything is in one big object) into the content directory structure: separate `index.json` files per page plus individual files for presets, modals, and modules. The `content-split-guards.ts` module validates output consistency before splitting, checking for things like duplicate IDs and cross-references that would break if separated.

---

## figma-bridge: the normalization layer

The bridge at `tools/figma-bridge/` is a shared library between the plugin and widget. It's plain TypeScript with no Figma sandbox dependencies -- any package can import it. Its job is to strip Figma-specific noise and produce a clean intermediate representation that the plugin and widget can both use.

Figma's raw API output is messy. Nodes have variable-depth trees, Figma-specific type names that don't map directly to Peblor concepts, undocumented paint properties, and variable bindings that need resolving. The bridge handles all of that normalization so the plugin's converters don't have to.

The bridge's modules cover:

- **`export-target-parse.ts`** -- The core parsing logic that reads a Figma layer name and determines export target type (page, preset, modal, module) and responsive role (desktop, mobile, or none). It uses prefix conventions (`Page/`, `Section/`, `Preset/`, `Modal/`, `Module/`, `Bg/`) and suffix conventions (`[desktop]`, `[mobile]`). Both the plugin's `detectExportTarget` and the widget's audit use this same parsing logic, guaranteeing consistency between what the widget reports and what the plugin exports.

- **`rules.ts`** -- Heuristic rules for detecting issues in Figma nodes. These cover naming convention violations, structural problems (a frame that looks like a button but has no fills), and missing annotations. The rules produce structured issue objects that both the plugin (in its preview) and the widget (in its audit) display.

- **`annotations-strip.ts`** -- Strips `[pb: ...]` annotation strings from layer names. Annotations like `[pb: type=elementTabs]` or `[pb: hidden]` are removed from the name before it's used for export target detection or output naming. The strip logic handles nested brackets, multiple annotations in one name, and malformed annotations gracefully.

- **`context-inference.ts`** -- Infers design context from a node's position and hierarchy. Given a node, it determines parent relationships, sibling indices, and whether the node sits inside a section container. This context helps the plugin make better type decisions -- a text node inside a button frame is probably the button label, not a standalone heading.

- **`inspect-unified.ts`** -- Combines the rules engine and context inference into a unified inspection result. This is what the widget uses for its real-time audit and what the plugin uses for its preview diagnostics. A single call produces a complete picture of a node's export readiness: its target type, any naming issues, structural warnings, and contextual metadata.

- **`inspect-types.ts`** -- Type definitions for the unified inspection system. These types are shared between all three Figma tools, so a rule violation detected by the widget has the same shape as one displayed by the plugin.

- **`slugify.ts`** -- Converts Figma layer names to valid Peblor slug and ID formats. Handles special characters, whitespace normalization, length limits, and deduplication.

- **`annotation-templates.ts`** -- Templates for common `[pb: ...]` annotations. Used by the plugin's converter to generate annotations when auto-detecting type overrides, and by the widget's keys tab for reference.

The bridge's public API is re-exported through its `index.ts`, which exposes the key types (`ParsedExportTargetKind`, `InspectableNode`, `InspectContext`) and functions. Both the plugin and widget import from here.

---

## figma-widget: in-canvas audit tool

The widget at `tools/figma-widget/` runs in Figma's in-canvas widget system. Unlike the plugin, which opens a separate panel, the widget lives directly on the canvas and provides persistent, always-visible tooling.

It's the fast feedback loop. A designer can see export readiness warnings without switching context, without running an export, without even knowing there's a plugin. The widget is passive -- it watches and reports.

### Widget components

The widget is built as a tabbed interface with two tabs:

**The audit tab** (`widget-tab-audit.tsx`) scans every visible top-level frame on the current page and builds a table of audit results. For each frame, it reports:

- **Export target kind** -- what kind of Peblor content this frame will become (page, section, preset, modal, module, background, or unknown).
- **Export key** -- the derived key from the frame name, used for output file naming.
- **Prefix warnings** -- naming convention violations, like an unknown prefix or a name that doesn't follow the `Type/Name` pattern.
- **Responsive role** -- desktop, mobile, or not a responsive frame.
- **Pair status** -- for responsive frames, whether the counterpart exists (paired, orphan, or n/a for non-responsive frames).

The audit tab refreshes when the designer selects a different page in Figma. It's not a real-time live scan (that would be expensive) -- it scans on page change and on manual refresh.

**The keys tab** (`widget-tab-keys.tsx`) is a keyboard shortcut and annotation reference. It shows the supported `[pb: ...]` annotation syntax with descriptions and examples. Designers can filter by scope (all, element, or section) to narrow down what they're looking for.

**The inspector footer** lives at the bottom of the widget and updates in real time as the designer selects different nodes. It shows the selected node's name, its detected export target kind, and the derived export key. This is useful for quickly checking whether a specific layer is going to export the way you expect.

### Audit logic

The audit logic in `widget-audit.ts` scans frames using the same bridge functions the plugin uses for its preview. It calls `parseExportTarget` to get the target kind and key, and `getLayerPrefixDiagnostics` for naming warnings. The results are collected into `FrameAuditRow` objects and displayed in the audit table.

The widget maintains its own state (`WidgetState`) tracking the active tab, the last scanned page name, the audit rows, the key filter text and scope, and the current inspector node info. State resets when the widget re-renders (Figma widgets don't have persistent state between sessions unless explicitly saved).

---

## Key files

**Plugin:**

- `tools/figma-plugin/src/main.ts` -- Main thread entry point, sets up Figma message handlers
- `tools/figma-plugin/src/ui.ts` -- UI thread, renders the export interface and handles user interaction
- `tools/figma-plugin/src/main-run-export.ts` -- Full export orchestration (frame selection, detection, pairing, conversion, validation, output)
- `tools/figma-plugin/src/main-frame-convert.ts` -- Converts normal and responsive frames to page content
- `tools/figma-plugin/src/main-frame-detect.ts` -- Classifies frames by export target type from naming conventions
- `tools/figma-plugin/src/main-responsive-pairs.ts` -- Desktop/mobile frame pairing logic
- `tools/figma-plugin/src/main-export-helpers.ts` -- Export utilities (frame scanning, issue formatting, element counting)
- `tools/figma-plugin/src/main-section-export-artifact.ts` -- Single-section standalone artifact export
- `tools/figma-plugin/src/split-page-for-content-dir.ts` -- Merged result to content directory structure
- `tools/figma-plugin/src/export-parity.ts` -- Export quality tracking (converted vs. dropped vs. fallback)
- `tools/figma-plugin/src/converters/node-to-section.ts` -- Frame to section type routing
- `tools/figma-plugin/src/converters/node-to-element.ts` -- Child node to element type routing
- `tools/figma-plugin/src/converters/text.ts` -- Text node conversion (heading, body, links)
- `tools/figma-plugin/src/converters/image.ts` -- Image fill and frame-to-image conversion
- `tools/figma-plugin/src/converters/button.ts` -- Button detection and conversion
- `tools/figma-plugin/src/converters/fills/` -- Solid, gradient, and image fill conversion
- `tools/figma-plugin/src/converters/layout/` -- Auto layout, grid, border, frame property conversion
- `tools/figma-plugin/src/converters/effects.ts` -- Figma effects to visual effects conversion
- `tools/figma-plugin/src/converters/motion.ts` -- Prototype animations to motion config
- `tools/figma-plugin/src/converters/annotations.ts` -- `[pb: ...]` annotation parsing and application
- `tools/figma-plugin/EXPORTER_COVERAGE.md` -- Coverage matrix for all section and element types

**Bridge:**

- `tools/figma-bridge/src/index.ts` -- Public API re-exports
- `tools/figma-bridge/src/export-target-parse.ts` -- Layer name parsing to export target type
- `tools/figma-bridge/src/rules.ts` -- Heuristic rules for node inspection
- `tools/figma-bridge/src/annotations-strip.ts` -- Annotation string stripping
- `tools/figma-bridge/src/context-inference.ts` -- Node position and hierarchy context
- `tools/figma-bridge/src/inspect-unified.ts` -- Unified inspection result combining rules and context
- `tools/figma-bridge/src/inspect-types.ts` -- Type definitions for the inspection system
- `tools/figma-bridge/src/slugify.ts` -- Figma name to Peblor slug conversion
- `tools/figma-bridge/src/annotation-templates.ts` -- `[pb: ...]` annotation templates

**Widget:**

- `tools/figma-widget/src/widget.ts` -- Entry point, state types, node inspection helpers
- `tools/figma-widget/src/widget-main.tsx` -- Main widget UI with tab navigation and inspector footer
- `tools/figma-widget/src/widget-tab-audit.tsx` -- Audit tab frame scanning and results display
- `tools/figma-widget/src/widget-tab-keys.tsx` -- Keyboard shortcut reference tab
- `tools/figma-widget/src/widget-audit.ts` -- Audit logic for frame scanning and issue detection

---

Back to [about-these-docs.md](../../about-these-docs.md). See also: [overview.md](overview.md).
