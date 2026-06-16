# Schemas and contracts

Here is the central fact of this platform: if the schema is wrong, everything downstream is wrong. The renderer trusts what it receives. The pipeline trusts the types it's working with. Validation is the only hard boundary between "somebody typed some JSON" and "this is a valid page." So the schemas are the source of truth. TypeScript types are inferred from them, not written alongside them. JSON schemas for external tools are generated from them, not maintained separately. Validation is a direct parse against them, not a hand-written check.

This document covers how `@pb/contracts` works and how to extend it. If you are adding a new element type, a new section layout, a new background variant, or a new trigger action, this is where you start.

## The big idea: one canonical source

All schemas live in `packages/contracts/src/peblor/core/peblor-schemas/`. The directory is flat -- just a bunch of files, each doing one thing, no nesting beyond a single level. The package entry at `packages/contracts/src/index.ts` re-exports from the curated barrel at `packages/contracts/src/peblor/core/peblor-schemas.ts`, which explicitly picks and chooses what to surface. Not everything in the schemas directory is a public export; the barrel is the bouncer.

The `@pb/contracts` package has its own `package.json` with export map entries for direct file access when you need something the barrel doesn't expose. But for almost everything, you just import from `@pb/contracts` and you're good.

## The discriminated union pattern

Every polymorphic type in the system follows the same pattern. Once you understand it, you understand how types are composed across the entire platform.

Here is how it works. You start with a base schema that defines the fields every variant shares. A section, for example, always has a background, effects, margins, padding, and visibility fields. Then you define per-variant schemas, each with a `type` field set to a literal string -- `contentBlock`, `sectionColumn`, `scrollContainer`, and so on. Each variant adds its own fields on top of the shared base. Finally, you combine them into a discriminated union keyed on the `type` field.

When Zod parses a discriminated union, it reads the `type` field first and dispatches to the correct variant schema immediately. This is O(1) -- read the type field, jump to the right parser. A regular union (`z.union([...])`) tries each variant in sequence until one matches, which is slower and produces worse error messages. With discriminated unions, a typo like `"contentBlcok"` matches no variant and Zod reports exactly that: "discriminator value 'contentBlcok' did not match any known variant." A regular union would attempt each variant, fail on each one, and eventually report something vague about union resolution.

The schemas are defined with plain `z.object()`, `z.intersection()`, or (most commonly) `baseSectionPropsSchema.extend()` -- no special helper function. Each variant is just a Zod schema with a literal `type` field. They get assembled into the discriminated union at the bottom of the file.

## The master union: peblorDefinitionBlockSchema

There is a master union that ties everything together. But it is not itself a discriminated union -- it is a `z.union()` that wraps one. Here is why.

The `peblorDefinitionBlockSchema` (in `page-definition-and-resolution-schemas.ts`) handles everything that can live in a page's `definitions` dictionary: sections, elements, backgrounds, modules, and preset references. But it starts with a few special cases that don't fit the discriminated union pattern:

- **Preset references** -- a `{ preset: "some-key" }` object with optional overrides
- **Content blocks with elementOrder** -- `contentBlock` and `scrollContainer` sections that have their `elementOrder` baked in at the definition level
- **Section columns** -- which need their `elementOrder` to be required (non-optional) at the page level

These get their own entries in a `z.union()` before the big discriminated union. The discriminated union itself spreads all four major block schemas into one: backgrounds, modules, sections, and elements. This creates a single flat namespace where every definition key can be any of these types, and Zod knows exactly which one it is by reading the `type` field.

## The five critical discriminated unions

### sectionBlockSchema -- 8 variants

Defined in `section-block-schemas.ts`. These are the layout containers that structure a page:

- **contentBlock** -- A general-purpose section with elements stacked vertically. The default section type. Elements render in order from top to bottom.
- **sectionColumn** -- A multi-column layout with its own cross-field validation chain: six separate refine calls that check column assignments, element order uniqueness, span references, item style references, and item layout references. Each produces a targeted diagnostic so the content author knows exactly what to fix.
- **scrollContainer** -- A section with horizontal scrolling or sticky-scroll behavior. Elements inside can be pinned or scroll-driven.
- **sectionTrigger** -- A trigger-based section that responds to scroll position. Background transitions, parallax effects, and reveal animations are configured here.
- **pageTrigger** -- Fires when the page mounts. Useful for entrance animations or initial state setup.
- **formBlock** -- A form section with form field elements. Manages submission behavior, validation, and field layouts.
- **revealSection** -- A section that animates in when scrolled into view. Manages its own entrance timing and stagger behavior for child elements.
- **divider** -- A visual divider between sections. Minimal -- just a line or shape, no element content.

Each section type dispatches to a React component registered in `SECTION_COMPONENTS` at `packages/runtime-react/src/peblor/section/index.ts`.

### elementBlockSchema -- 34 variants

Defined in `element-block-schemas.ts`. These are the atomic building blocks of page content. They fall into a few rough categories:

- **Typography:** heading, body, rich text, link, blockquote, code, list
- **Media:** image, video, audio, 3D model, Lottie animation, Rive animation, SVG, vector, image comparison
- **Interactive:** button, tabs, tooltip, drag container, marquee, counter, scroll progress bar, input, range slider, embed
- **Layout:** spacer, divider, group, infinite scroll
- **Form:** form field (with its own sub-types: text, email, textarea, select, checkbox, radio, file, date, tel, url, number)
- **Video utilities:** video time display, video quality selector

Each element has its own required and optional fields. A heading needs `text` and a `variant` (which determines size). An image needs a `src` asset reference and `alt` text. A button needs `text` and optionally an `href` or trigger configuration. The discriminated union ensures element-level validation is precise -- you cannot accidentally put image fields on a heading.

Each element type dispatches to a React component registered in `ELEMENT_COMPONENTS` at `packages/runtime-react/src/peblor/elements/index.ts`. Heavy elements (3D, Rive, Lottie, tabs, drag) use dynamic imports for lazy loading.

The element schemas themselves live across multiple files. Core types like heading, body, image, video, spacer, and button are in `element-content-schemas.ts`. More complex types (3D, Rive, audio, tabs, tooltip, drag, marquee, counter, lists, tables, embeds, blockquotes, code) each have their own file. This keeps things manageable -- nobody wants to scroll through fifty thousand lines of Zod to find the one schema they need to edit.

Section effects (glass, blur, glow, drop-shadow, etc.) live in their own file (`section-effect-schemas.ts`) because sections and elements both use them, and they are complex enough to warrant separation.

### bgBlockSchema -- 5 variants

Defined in `background-block-schemas.ts`. Background layers render behind section content and can transition between each other as the user scrolls:

- **backgroundImage** -- A static or parallax image background.
- **backgroundVideo** -- A looping video background with its own playback controls through the trigger action system.
- **backgroundPattern** -- A repeating pattern or gradient fill.
- **backgroundVariable** -- References a CSS variable for the background fill, typically set by a parent context.
- **backgroundTransition** -- Defines a transition between background layers based on scroll position. This is how scroll-driven background changes work. Self-referencing via lazy schema, so a transition can chain to another transition.

Backgrounds dispatch to components at `packages/runtime-react/src/peblor/background/index.ts`.

### triggerActionSchema -- 90-plus action types

Defined in `schema-primitives.ts`. This is the most varied union in the system by a long shot. Trigger actions make pages interactive -- they fire in response to user gestures (click, hover, drag) or scroll position. The action types fall into categories:

- **Navigation:** `navigate`, `modalOpen`, `modalClose`, `scrollTo`, `sectionFocus`
- **Media playback:** `assetTogglePlay`, `seekToTime`, `setVolume`, `setPlaybackRate`
- **3D scene:** `three.setCamera`, `three.playAnimation`, `three.setPosition`, `three.setRotation`, `three.setVisibility`, `three.setMaterial`, and about thirty more -- the 3D system has its own complete action vocabulary
- **Rive:** `rive.play`, `rive.pause`, `rive.setState`, `rive.setInput`, `rive.fireTrigger` -- state machine control for Rive animations
- **State:** `setVariable`, `toggleVariable`, `incrementVariable`, `setVariablePath` -- page-level state management
- **Scroll:** `setScrollProgress`, `syncScrollPosition`
- **Event:** `dispatchEvent`, `listenEvent`
- **Background:** `startTransition`, `stopTransition`, `updateTransitionProgress`, `overrideContent`, `switchBackground`
- **Content:** various content-switching actions

Each action type has its own payload schema. There is also a `validateActionPayload` function that uses a pre-built action-to-payload map for efficient single-variant validation without running the entire discriminated union.

## The schema file map

Here is what lives where. The common thread: simple things stay in a shared file, complex things get their own file. Nobody goes to jail for adding a file.

| File                                        | What it defines                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `element-block-schemas.ts`                  | The element schema union and its assembly point. Imports all element variant schemas from sibling files and combines them into `elementBlockSchema`.                                                         |
| `element-content-schemas.ts`                | The core visible elements: heading, body, image, video, button, link, rich text, SVG, vector, spacer, divider, range, input, scroll progress bar, video time, video quality select.                          |
| `element-foundation-schemas.ts`             | Shared element sub-shapes: layout constraints, object-fit, vector shapes, gradients, border gradients. If multiple element types need the same sub-shape, it goes here.                                      |
| `element-button-schemas.ts`                 | Button-specific schemas including the button action system (navigate, modal, scroll, etc.). Pulled into its own file because the button action union is complex enough to warrant it.                        |
| Files named `element-<thing>-schemas.ts`    | Individual element schemas that got complex enough for their own file: audio, blockquote, code, counter, drag, embed, form-field, image-compare, list, lottie, marquee, model3d, rive, table, tabs, tooltip. |
| `section-block-base-schemas.ts`             | The base section props schema (background, effects, margins, padding, visibility) plus every individual section variant schema before they get unioned.                                                      |
| `section-block-schemas.ts`                  | Imports all the variant schemas from the base file and assembles `sectionBlockSchema` as a discriminated union. Just the union, no variant definitions.                                                      |
| `section-column-layout-schemas.ts`          | Column layout types: column counts, widths, gaps, spans, item styles, item layouts, element orders, column assignments. Column complexity lives here.                                                        |
| `section-column-validation.ts`              | Six Zod refine functions for column section cross-field validation. Keeps the validation logic from cluttering the schema definitions. Each refine produces a targeted diagnostic.                           |
| `section-effect-schemas.ts`                 | Visual effects: blur, glass, glow, drop-shadow, grayscale, sepia, brightness, contrast, saturate, opacity, backdrop blur. Each is a small schema usable by sections and elements.                            |
| `background-block-schemas.ts`               | The background schema union and all five variant schemas. Also includes `backgroundTransitionEffectSchema` for page-level transition effects.                                                                |
| `background-motion-schemas.ts`              | Motion properties specific to background layers (parallax, loop, pointer-follow, scroll-driven).                                                                                                             |
| `schema-primitives.ts`                      | The trigger action discriminated union (90-plus action types). This is the most varied union in the system. Also exports `validateActionPayload` for performant single-action validation.                    |
| `schema-shared-primitives.ts`               | Lower-level shared primitives that everything depends on: theme strings, gradients, conditions, responsive values, alignment schemas, visibility conditions. These are the atoms of the schema system.       |
| `motion-props-schema.ts`                    | Motion properties for elements: entrance, exit, hover, tap, focus, loop animations. Every animation type has a schema here.                                                                                  |
| `module-block-schemas.ts`                   | Video and audio player module schemas -- key bindings, gesture regions, feedback chrome, slot layouts.                                                                                                       |
| `modal-block-schemas.ts`                    | Modal overlay schemas -- trigger conditions, size, position, backdrop, behavior, content references.                                                                                                         |
| `form-field-schemas.ts`                     | Form field type schemas for the formBlock section. Text inputs, selects, checkboxes, radios, files, and more.                                                                                                |
| `page-definition-and-resolution-schemas.ts` | The top-level page schema (`peblorSchema`), the master definition block union, the resolved page schema, cross-reference validation with `superRefine`, and `validatePageReferences`.                        |
| `figma-exporter-meta-schema.ts`             | Metadata schemas for Figma export round-tripping.                                                                                                                                                            |

Layout sub-schemas, responsive value schemas, and lazy element refs each get their own small files too. The directory is flat by design -- you can find anything with a quick `ls` and `grep`.

## Cross-reference validation

Discriminated unions validate individual blocks. But pages have cross-block references -- `elementOrder` arrays reference keys in `definitions`, `sectionOrder` arrays reference keys in `definitions`, trigger actions reference element keys. These cross-references cannot be validated by simple schema parsing because they span multiple fields.

The page schema's `superRefine` handles this. It walks every key in `sectionOrder` and confirms it exists in `definitions`. Then it walks every section's `elementOrder` and confirms each key resolves to an element definition (not a section or background). It handles nested cases too -- elements inside groups, infinite scroll containers, drag containers. When a reference is broken, the diagnostic includes the exact JSON path to the problem.

Column sections have their own refine chain in `section-column-validation.ts`. Six separate refine calls validate that:

1. Column assignments reference valid column indices.
2. Element order keys are unique within the section.
3. Span references do not exceed the column grid.
4. Item style references exist in the styles dictionary.
5. Item layout references match their referenced elements.
6. Element references resolve to valid keys.

Each refine call produces a targeted diagnostic with a specific error code. The content author knows exactly which field is wrong and what values are involved. No "something went wrong in the page config" nonsense.

There is also `validatePageReferences` in `page-definition-and-resolution-schemas.ts` that runs after preset loading and section hydration. It checks that every `sectionOrder` key resolves to a valid section definition, every `bgKey` resolves to a background, and every trigger target exists.

## TypeScript types are inferred

Every schema variant produces a TypeScript type through `z.infer`. There is no hand-written type file that duplicates the schema structure. The inferred types are collected in `packages/contracts/src/peblor/core/peblor-types.ts` and re-exported from the barrel. A dedicated `@pb/contracts/types` export path gives direct access to type-only consumers.

When you add a new variant to a discriminated union, you get the corresponding TypeScript type for free. If the schema has a required field, the type makes it required. If it is optional, the type reflects that. If you change a field from required to optional, every consumer that does not handle the optional case will get a type error on the next type-check pass.

This is a significant quality-of-life improvement over maintaining separate TypeScript interfaces. You never have to ask "does the type match the schema?" because the type is the schema. They cannot get out of sync because they are the same thing.

## JSON Schema generation

The Zod schemas also produce standard JSON Schema for consumption by external tooling: IDEs that need autocomplete for Peblor files, editor validation, and any pipeline that does not run JavaScript.

### The dist schemas

Running `npm run contracts:generate-schemas` triggers the script at `packages/contracts/scripts/generate-schemas.ts`. It uses Zod 4's built-in `z.toJSONSchema()` method targeting Draft 2020-12, then writes to `packages/contracts/dist/schemas/`. The output includes nine files:

- **peblor.schema.json** -- the full page schema
- **section.schema.json** -- section blocks only
- **element.schema.json** -- element blocks only
- **module.schema.json** -- module blocks only
- **form-field.schema.json** -- form field blocks
- **definition-block.schema.json** -- the definition block union
- **capability-importer.schema.json**, **capability-exporter.schema.json**, **capability-cms-adapter.schema.json** -- plugin capability schemas

### The content schemas

A separate script at `scripts/generate-json-schemas.ts` (invoked as `npm run generate-json-schemas`, part of the postinstall hook) generates the subset of schemas that actually power IDE autocomplete for content files. It writes to `content/schemas/` with additional post-processing: a deduplication pass that extracts discriminated union variants into `$defs` entries to keep file sizes under control, and a cleanup pass that removes entrance motion fields from required arrays. The content schemas are:

- **peblor.schema.json** -- full page schema (maps to page JSON files)
- **definition-block.schema.json** -- definition block union (maps to preset and section files)
- **definitions-file.schema.json** -- section-only files (maps to section sidecar files)
- **module.schema.json** -- module definitions
- **modal.schema.json** -- modal definitions

Each file is minified because the full output of `z.toJSONSchema()` is enormous -- Zod inlines every type everywhere it is referenced, and a page schema with 34 element types, 8 section types, 5 background types, and 90 trigger actions easily hits 20 MB. The deduplication pass reduces this by extracting each variant into a named `$defs` entry and replacing inline definitions with `$ref` pointers. It runs in a fixpoint loop to catch nested unions inside extracted variants.

The VSCode/Cursor settings at `.vscode/settings.json` map file glob patterns to these schemas via `json.schemas`. Content authors get autocomplete and inline validation without thinking about it.

After any schema change, run `npm run contracts:generate-schemas` which also runs `npm run pb-cli -- generate-catalogs` to regenerate component catalogs. CI enforces freshness with `npm run check:schemas-fresh`, which regenerates schemas and fails if `git diff` detects changes.

## How to add a new variant to an existing union

Let us say you are adding a new element type. Call it `elementFoo`. Here is the checklist:

1. **Create the schema file.** Name it `element-foo-schemas.ts` in the peblor-schemas directory. Define your Zod schema with a `type` field set to the literal `"elementFoo"` and whatever fields it needs. If it shares sub-shapes with existing element types (layout constraints, object-fit, etc.), import them from `element-foundation-schemas.ts`. Use `z.object()` or compose with `z.intersection()` -- whatever the schema needs. There is no magic helper function; just write Zod.

2. **Add it to the union.** Import the new schema in `element-block-schemas.ts` and add it to the `elementBlockSchema` discriminated union array. Order in the array does not matter for discriminated unions -- Zod reads the type field, not array position. For the union to work, your variant's `type` literal must be unique across all variants.

3. **If your type triggers new actions** (like the 3D schemas did with `three.*` actions, or Rive with `rive.*` actions), add those action types to the trigger action union in `schema-primitives.ts`.

4. **If your type introduces new shared sub-shapes** that other element types will need, put them in `element-foundation-schemas.ts`. Otherwise, keep them in your file.

5. **Re-export from the barrel.** If your new schema is a public type, add an explicit re-export in `packages/contracts/src/peblor/core/peblor-schemas.ts`. This is the curated public API -- not everything in the schemas directory surfaces here by default.

6. **Register the runtime component.** Add a component in `packages/runtime-react/src/peblor/elements/` and register it in the `ELEMENT_COMPONENTS` map. If it is heavy, wrap it in `next/dynamic()` for lazy loading. But that is the runtime layer -- the schema layer is done after step 2.

7. **Register with the catalog.** Add the new element ID to `CLUSTER_ENTRIES` in `packages/catalog/src/intent/ENTRIES.ts` and create a corresponding `*.intent.yaml` file in the same directory. This keeps the schema registry and the component catalog synchronized. Without this step, the catalog coverage check in CI will fail.

8. **Regenerate schemas.** Run `npm run contracts:generate-schemas` to regenerate JSON schemas and catalogs.

9. **Type-check.** Run `npm run type-check` to ensure cross-package type consistency. If your new schema introduces new required fields, downstream code that constructs element objects will need updating.

The pattern is identical for sections, backgrounds, and trigger actions. Find the appropriate union file, add your variant schema, and add it to the union array. That is it for the schema side.

One thing to watch for: simpler element types (heading, body, image) live in `element-content-schemas.ts`, while complex ones (3D, Rive, audio, tabs, drag) get their own file. There is no hard rule about when something is complex enough to split out -- use judgment. If your schema file would be longer than a few hundred lines, consider splitting. If it introduces new trigger actions or foundation sub-shapes, definitely split.

## Schema versioning

The contract version lives at `packages/contracts/src/version.ts`. It is currently `"1.0.0"`. Every page JSON carries a `contractVersion` field, which the migration system uses to determine if a page needs upgrading.

The version is not bumped automatically on every schema change. It only gets bumped when there is a breaking change to the on-disk format that requires migration -- field renames, type changes, structural reorganizations. Adding a new variant to a discriminated union is not a breaking change. Renaming a field that every page uses is.

When a version bump is needed, the migration logic goes in `packages/core/src/stages.ts` (the `migratePage` function) and handles the transition between specific version pairs. The pipeline always upgrades old pages to the current version before processing them. The supported versions array in `version.ts` lists every version the system knows how to migrate from.

---

Back to [monorepo-map.md](monorepo-map.md). Next: [core.md](core.md).
