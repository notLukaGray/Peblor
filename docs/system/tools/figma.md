# Figma integration: plugin, bridge, widget

Three tools. One goal: turn Figma designs into Peblor JSON without anyone losing their mind. Each piece operates at a different point in the workflow, and together they form a pipeline that makes "designer lays out frames in Figma" and "content JSON lands in `content/pages/`" feel like a single step -- even though a lot of grunt work happens in between.

The **plugin** does the actual export. The **bridge** provides shared types and normalization logic that both the plugin and widget depend on. The **widget** gives in-canvas feedback during design. They share a common purpose, but they never step on each other's toes.

---

## The big picture

Here is how data flows from Figma to your content directory. Get this mental model right and the individual tools will make a lot more sense.

**Step 1: Design in Figma with conventions.** Designers lay out frames using Peblor's naming conventions. A frame named `Page/Home` becomes a page. `Section/Hero` becomes a section (exported as a preset). `Modal/Contact` becomes a modal. `Module/VideoPlayer` becomes a module. Designers can also add `[pb: ...]` annotations to layer names to explicitly override type detection -- things like `[pb: type=elementTabs]` to force a specific element type. No annotation is usually needed for the common stuff (headings, body text, images, buttons). The converter is reasonably smart on its own.

**Step 2: The widget provides real-time feedback.** As the designer works, the widget sits on the canvas. It scans frames, checks naming conventions, detects orphaned responsive pairs (a desktop frame without its mobile counterpart), and flags issues. All of this happens without leaving the Figma canvas or opening a plugin panel. The widget is the fast feedback loop -- it catches problems while they are cheap to fix.

**Step 3: Export through the plugin.** When the design is ready, the designer opens the plugin UI, selects frames (or lets it auto-detect top-level frames), and runs the export. The plugin collects frames, detects responsive pairs, converts Figma nodes to Peblor JSON, validates the output against Zod schemas, and presents the result. It also tracks export quality -- how many nodes converted cleanly, how many needed approximations, and how many got dropped.

**Step 4: The bridge normalizes everything.** Throughout this process, the bridge library provides the core logic both the plugin and widget rely on: parsing layer names, stripping annotations, detecting export targets, running heuristic rules, and producing a consistent intermediate representation. The bridge strips Figma-specific noise so the plugin's converters don't have to deal with it. The widget uses the same parsing logic to preview what the plugin will do. Consistency is the whole point.

**Step 5: Output lands in the content directory.** The export result (pages, presets, modals, modules, backgrounds) is made available in three output modes: copy to clipboard (for pasting into files), copy as a single merged page, or download as a zip file structured like the content directory. The JSON files are ready to drop into `content/`. The Figma export payload can also be imported via the CLI (`pb-cli import-figma <file>`) or MCP (`import_figma` tool).

**Step 6: CLI and MCP take over.** Once the JSON is in the content directory, the CLI and MCP server handle everything else -- validation, editing, batch operations, and deployment. The Figma tools are the front door. Everything after is pipeline.

---

## figma-plugin: the design-to-export engine

The plugin lives in `tools/figma-plugin/`. It runs inside Figma's sandboxed JavaScript environment and converts Figma frames into structured Peblor content. It is the heaviest of the three tools, with converter files covering section types, element types, fills, layout properties, effects, motion, and annotations.

### Two-thread architecture

Figma plugins have a weird but necessary split. The **main thread** runs in a sandbox -- no DOM, no fetch, no network access -- just the Figma document API. The **UI thread** runs in an embedded iframe with full DOM access. They talk through `postMessage`.

The main thread entry point at `tools/figma-plugin/src/main.ts` is deceptively short. It calls `figma.showUI` with window dimensions and title, then sets up message handlers for exactly three message types from the UI: `export` (run the full export pipeline), `refresh-preview` (update the frame preview without running the full export), and `close` (shut down the plugin). That is essentially it -- the main thread is a message router with a very specific vocabulary.

The UI thread at `tools/figma-plugin/src/ui.ts` handles the interactive interface: frame previews with their detected export targets, warnings and errors, export mode selection (clipboard, merged page, or zip download), and wiring up all the buttons. It also auto-sends a close message when the browser iframe is dismissed, preventing stale plugin runtimes from blocking subsequent launches.

### The export pipeline

The actual orchestration lives in `tools/figma-plugin/src/main-run-export.ts`. It is a staged pipeline, each stage producing the inputs for the next.

**Stage 1: Frame collection.** The `getSelectedFrames` function looks at the current Figma selection. If frames are selected, it uses those. If non-frame nodes are selected, it returns nothing (and the UI will tell you to select a frame). If nothing is selected, it falls back to all visible top-level frames on the current page. Frames marked with wrapper naming conventions (`pb-wrapper`, `pb:wrapper`, etc.) are unwrapped to reveal their child frames -- this lets designers group frames without affecting the export output. Frames are sorted top-to-bottom, left-to-right for consistent output order.

**Stage 2: Target detection.** Each frame is classified by `detectExportTarget` (in `main-frame-detect.ts`). The function reads the frame name and determines what kind of content it represents. The naming convention is simple: `Page/Home`, `Section/Hero`, `Modal/Contact`, `Module/Player`, `Button/Subscribe`, `Background/Gradient`, or `Global/Header`. Unknown prefixes fall back to page. The convention is shared with the bridge, so the widget always previews what the plugin will produce.

**Stage 3: Responsive pairing.** `detectResponsivePairs` (in `main-responsive-pairs.ts`) matches desktop and mobile frames by their key -- the part of the name after the prefix and before any responsive suffix. A frame named `Section/Hero [desktop]` and `Section/Hero [mobile]` share the key `Hero` and get paired. The key insight: the `[desktop]` and `[mobile]` suffixes are appended to the _prefix_, not the name -- so `Section[desktop]/Hero` and `Section[mobile]/Hero` are the correct convention. Frames without a counterpart get flagged as orphans.

**Stage 4: Conversion.** This is where Figma nodes become Peblor JSON. `convertNormalFrames` handles unpaired frames, while `convertResponsivePairs` handles paired ones. Each frame is converted into a section object, and the frame's children are converted into elements. The conversion delegates to a converter directory at `tools/figma-plugin/src/converters/` with files organized by responsibility:

- `node-to-section.ts` routes frames to section types based on structure and annotations.
- `node-to-element.ts` routes child nodes to element types based on Figma node type, text content, and annotations.
- `text.ts` handles heading, body, and link conversion. It reads Figma text content and style properties, maps font sizes to Peblor heading levels (h1-h6), and detects links.
- `image.ts` handles image fills and frame-to-image conversion.
- `button.ts` detects buttons from component instances or annotated frames.
- `video-convert.ts` handles video placeholder detection and conversion -- frames with video fills or specific naming patterns.
- `vector.ts` converts Figma vector nodes to Peblor vector elements.
- `node-section-convert.ts` handles the heavy lifting of frame-to-section conversion.
- `section-column-convert.ts`, `section-reveal.ts`, `section-scroll-divider-form.ts` handle specialized section types.
- `fills.ts`, `fills-gradient.ts`, `fills-image.ts`, `fills-solid.ts` convert Figma paints (solid fills, gradients, image fills) to Peblor color/background format.
- `layout.ts`, `layout-auto-props.ts`, `layout-border.ts`, `layout-frame-props.ts`, `layout-grid.ts` convert auto-layout properties, grids, borders, and frame properties.
- `layout-var-resolve.ts` resolves Figma variable bindings in layout properties.
- `effects.ts` converts Figma effects (drop shadows, layer blurs, etc.) to Peblor visual effects.
- `node-visual-effects.ts` applies visual effect conversion during node processing.
- `motion.ts` converts Figma prototype animations to Peblor motion config.
- `annotations.ts` and `annotations-parse.ts` handle `[pb: ...]` annotation parsing for explicit type overrides.
- `annotations-interactions.ts`, `annotations-trigger.ts` handle interaction and trigger annotation parsing.
- `responsive-merge.ts`, `responsive-element-merge.ts`, `responsive-field-sets.ts`, `responsive-section-merge.ts` handle merging values from desktop and mobile frame variants.
- `auto-presets.ts` auto-promotes repeated sibling structures into preset references when enabled.
- `node-instance-convert.ts` handles Figma instance node conversion.
- `element-input-convert.ts` handles input element conversion.
- `variant-*.ts` files handle Figma component variant conversion.
- `typography.ts`, `text-links.ts`, `text-style-apply.ts` handle text styling.
- `section-elements-gather.ts`, `section-routing-detect.ts`, `section-triggers.ts`, `section-annotation-fill-override.ts` handle specific section processing.

The exporter coverage matrix at `tools/figma-plugin/EXPORTER_COVERAGE.md` tracks which section and element types have converter routes. Most section types have full support. Element types range from fully supported (heading, body, image, button) to annotation-gated (tabs, drag, tooltip -- these need a `[pb: type=...]` annotation to be detected) to genuinely missing (3D, infinite scroll, image compare, video time/quality selectors -- these still need manual post-export editing).

**Stage 5: Validation.** After conversion, every output artifact is validated against the Zod schemas from `@pb/contracts`. Pages get checked against `peblorSchema`, presets against `peblorDefinitionBlockSchema`, modals against `modalBuilderSchema`, modules against `moduleBlockSchema`, and backgrounds against `bgBlockSchema`. Failures are returned as structured diagnostics, and the export won't complete if there are errors. This catches the really embarrassing stuff before it ever lands on disk.

**Stage 6: Output.** The result is sent to the UI as an `ExportResult` containing pages, presets, modals, modules, backgrounds, asset refs, warnings, and errors. The UI offers three output modes: `copy` (full JSON to clipboard), `copy-merged` (single merged page object for paste-into-playground workflows), and `zip` (download as a zip archive structured like the content directory).

Throughout the export, a `ConversionContext` object carries state: a running list of warnings and errors, a parity tracker (how many nodes were converted vs. dropped vs. used fallback), a set of used preset keys, an asset counter, a set of used IDs (to detect duplicates), and a flag for whether assets should be skipped (for clipboard mode where binary asset data isn't useful).

### Less obvious features

The plugin can export a **single section as a standalone artifact** via `buildSectionExportArtifact` -- handy when you just want that one hero section without the full page wrapper.

The **auto-presets** feature (togglable in the UI) scans for repeated sibling structures during conversion and automatically promotes them into preset references. This is how a row of four identical product cards becomes one preset plus three `{ "preset": "product-card", "id": "..." }` override objects. The auto-detection is conservative -- it only fires on structures that share a structural signature.

The **page splitting** logic in `split-page-for-content-dir.ts` converts a merged export result into separate `index.json` files per page, plus individual sidecar section files for each section. The `content-split-guards.ts` module validates consistency before splitting, checking for duplicate IDs and cross-references that would break if separated.

---

## figma-bridge: the normalization layer

The bridge at `tools/figma-bridge/` is a shared TypeScript library used by both the plugin and the widget. It has zero Figma sandbox dependencies -- any Node.js package can import it. Its single job: strip Figma-specific noise and produce a clean, consistent intermediate representation.

Figma's raw API output is messy. Nodes have variable-depth trees. Figma type names don't map directly to Peblor concepts. Undocumented paint properties lurk in fills. Variable bindings need resolving. The bridge handles all of that so the plugin's converters can stay focused on the actual conversion.

Here is what the bridge's modules cover:

- **`export-target-parse.ts`** -- Parses a Figma layer name and determines export target type (page, preset, modal, module, global) and responsive role (desktop, mobile, or none). The convention uses `Prefix/Name` syntax: `Page/`, `Section/` (maps to preset), `Modal/`, `Module/`, `Button/`, `Background/`, `Global/`. Responsive roles use `Section[desktop]/Name` and `Section[mobile]/Name` suffixes. Both the plugin's `detectExportTarget` and the widget's audit use this same parsing logic, guaranteeing consistency between preview and export.

- **`rules.ts`** -- Heuristic rule types and helper functions for detecting issues in Figma nodes. Defines the shared vocabulary of what constitutes a naming problem, structural concern, or annotation issue.

- **`annotations-strip.ts`** -- Strips `[pb: ...]` annotation blocks from layer names using a regex. Removes all `[pb: ...]` blocks before the name is used for target detection or output naming. Does what it says, does it well, and does not attempt to handle infinitely nested brackets because those do not actually occur in real Figma layer names.

- **`context-inference.ts`** -- Infers design context from a node's position and hierarchy. Given a node, it determines parent relationships, sibling indices, and whether the node sits inside a page frame. This helps the plugin make better type decisions -- a text node inside a button instance is probably the button label, not a standalone heading. It also detects sibling structures that lack auto-layout.

- **`inspect-unified.ts`** -- Combines the rules engine and context inference into a unified inspection result. A single call produces a complete picture of a node's export readiness: its target type, any naming warnings, structural suggestions, ranked annotation templates, and export preview metadata. This is what the widget uses for its real-time audit and what the plugin uses for its preview diagnostics.

- **`inspect-types.ts`** -- Serializable type definitions for the inspection system. These types (`InspectableNode`, `InspectContext`) are shared between all three Figma tools. They are designed to be serializable -- no Figma node references, just plain data -- so they can pass through `postMessage` boundaries.

- **`slugify.ts`** -- Converts Figma layer names to valid Peblor slug and ID formats. Strips special characters, normalizes whitespace, enforces a 64-character limit, and falls back to `"element"` when the result is empty.

- **`annotation-templates.ts`** -- A catalog of 80+ `[pb: ...]` annotation templates covering element and section annotations. Each template has a scope (element or section), key, description, example value, and snippet. The templates are ranked per-node using a scoring function that considers node type, name keywords, child count, and other heuristics -- so a frame named "video" ranks video annotation templates highest. Used by both the widget's keys tab and the plugin's suggestion system.

The bridge's public API is re-exported through its `index.ts`, which exposes the key types (`ParsedExportTarget`, `ParsedExportTargetKind`, `InspectableNode`, `InspectContext`, `UnifiedInspectResult`, `AnnotationTemplate`) and functions (`parseExportTargetFromLayerName`, `stripAnnotations`, `slugify`, `inspectUnified`, `inferContextualInsights`, `getAllAnnotationTemplates`). Both the plugin and widget import from here.

---

## figma-widget: in-canvas audit tool

The widget at `tools/figma-widget/` runs in Figma's in-canvas widget system. Unlike the plugin, which opens a separate panel, the widget lives directly on the canvas and provides persistent, always-visible tooling. It is the fast feedback loop. A designer can see export readiness warnings without switching context, without running an export, without even knowing there is a plugin.

The widget is passive -- it watches and reports.

### What the widget actually does

The widget has two tabs:

**The audit tab** scans every visible top-level frame on the current page and builds a table of audit results. For each frame, it reports the export target kind (page, preset, modal, module, background, or global), the export key (derived from the frame name), prefix warnings (unknown naming conventions), responsive role (desktop, mobile, or none), and pair status (paired, orphan, or not applicable for non-responsive frames). A green dot means the frame looks ready. A yellow dot means something needs attention -- an unknown prefix, an orphaned responsive pair, or a naming issue.

The audit tab does not auto-scan. It has a "Scan" button. Click it, and it scans. The widget uses `useSyncedState` to persist audit results between sessions, so your previous scan is still there when you come back. A selection-change listener updates a small inspector footer in real time -- showing the selected node's name, its detected export kind, and its export key -- but the full audit table only refreshes when you hit Scan.

**The keys tab** is a reference panel for `[pb: ...]` annotation syntax. It shows all supported annotation keys with descriptions and examples, filterable by search text and scope (all, element, or section). Designers can use this to look up that annotation they forgot the exact syntax for, without alt-tabbing to documentation.

**The inspector footer** sits at the bottom of the widget and updates in real time as the designer selects different nodes. It shows the selected node's name, its detected export target kind, and the derived export key. This is useful for quickly checking whether a specific layer is going to export the way you expect. No scan needed -- it just reacts to selection changes.

### Audit logic

The audit logic in `widget-audit.ts` scans frames using the same bridge functions the plugin uses internally. It calls `parseExportTargetFromLayerName` to get the target kind and key, and `getLayerPrefixDiagnostics` for naming warnings. The results are collected into `FrameAuditRow` objects and displayed in the audit table. The same code path the widget uses for preview is the same code path the plugin uses for export -- no surprises.

### How state works

The widget maintains its own state (`WidgetState`) tracking the active tab, the last scanned page name, the audit rows, the key filter text and scope, and the current inspector node info. Crucially, the widget uses `useSyncedState` -- Figma's built-in key-value persistence for widgets. This means the audit results survive session boundaries. Close Figma, open it again the next day, and your audit results are still there (until you hit Scan again or the widget is removed from the canvas).

---

## Key files

**Plugin:**

- `tools/figma-plugin/src/main.ts` -- Main thread entry point, three message handlers
- `tools/figma-plugin/src/ui.ts` -- UI thread, export interface and user interaction
- `tools/figma-plugin/src/main-run-export.ts` -- Full export orchestration (collection, detection, pairing, conversion, validation, output)
- `tools/figma-plugin/src/main-frame-convert.ts` -- Converts normal and responsive frames to page content
- `tools/figma-plugin/src/main-frame-detect.ts` -- Classifies frames by export target type from naming conventions
- `tools/figma-plugin/src/main-responsive-pairs.ts` -- Desktop/mobile frame pairing logic
- `tools/figma-plugin/src/main-export-helpers.ts` -- Export utilities (frame scanning, issue formatting, element counting)
- `tools/figma-plugin/src/main-section-export-artifact.ts` -- Single-section standalone artifact export
- `tools/figma-plugin/src/main-page-sections.ts` -- Page-level section detection from child frames
- `tools/figma-plugin/src/split-page-for-content-dir.ts` -- Merged result to content directory structure
- `tools/figma-plugin/src/export-parity.ts` -- Export quality tracking (converted vs. dropped vs. fallback)
- `tools/figma-plugin/src/content-split-guards.ts` -- Cross-reference validation before splitting
- `tools/figma-plugin/src/converters/` -- All converter modules (sections, elements, fills, layout, effects, motion, annotations, instances, variants, responsive merging)
- `tools/figma-plugin/EXPORTER_COVERAGE.md` -- Coverage matrix for all section and element types

**Bridge:**

- `tools/figma-bridge/src/index.ts` -- Public API re-exports
- `tools/figma-bridge/src/export-target-parse.ts` -- Layer name parsing to export target type
- `tools/figma-bridge/src/rules.ts` -- Heuristic rule types and helpers
- `tools/figma-bridge/src/annotations-strip.ts` -- `[pb: ...]` stripping
- `tools/figma-bridge/src/context-inference.ts` -- Node position and hierarchy context
- `tools/figma-bridge/src/inspect-unified.ts` -- Unified inspection result combining rules and context
- `tools/figma-bridge/src/inspect-types.ts` -- Serializable inspection type definitions
- `tools/figma-bridge/src/slugify.ts` -- Figma name to Peblor slug conversion
- `tools/figma-bridge/src/annotation-templates.ts` -- 80+ annotation templates with scoring

**Widget:**

- `tools/figma-widget/src/widget.ts` -- State types, node inspection helpers, audit row types
- `tools/figma-widget/src/widget-main.tsx` -- Main widget UI with tab navigation and inspector footer
- `tools/figma-widget/src/widget-tab-audit.tsx` -- Audit tab with frame scan and result display
- `tools/figma-widget/src/widget-tab-keys.tsx` -- Annotation key reference tab with filtering
- `tools/figma-widget/src/widget-audit.ts` -- Audit logic for frame scanning and responsive pairing
- `tools/figma-widget/src/rules.ts` -- Re-exports bridge inspection API for widget use

---

Back to [about-these-docs.md](../../about-these-docs.md). See also: [overview.md](overview.md).
