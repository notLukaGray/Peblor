# Schemas and contracts

Here's the central fact of this platform: if the schema is wrong, everything downstream is wrong. The renderer trusts what it receives. The pipeline trusts the types it's working with. The only place correctness can be guaranteed is at the boundary where raw JSON enters the system. So the schemas are the source of truth. TypeScript types are inferred from them, not written alongside them. JSON schemas for external tools are generated from them, not maintained separately. Validation is a direct parse against them, not a hand-written check.

This doc covers how `@pb/contracts` works and how to extend it. If you're adding a new element type, a new section layout, a new background variant, or a new trigger action, this is where you start.

## What lives where

The contract schemas live in `packages/contracts/src/peblor/core/peblor-schemas/`. That directory is organized as a flat set of files, each responsible for a family of schemas. There's no deep nesting -- just a bunch of files in a directory, each doing one thing.

Here's the lay of the land:

| File                                                            | What it defines                                                                                                                                                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element-block-schemas.ts`                                      | The element schema union and all element variant schemas -- heading, body, button, image, video, audio, 3D, Rive, Lottie, tabs, drag, tooltip, marquee, counter, and more. This is the biggest file in the directory.  |
| `section-block-schemas.ts`                                      | The section schema union -- contentBlock, sectionColumn, scrollContainer, sectionTrigger, formBlock, revealSection, divider. Each section type is a distinct layout container with its own element ordering rules.     |
| `background-block-schemas.ts`                                   | The background schema union -- backgroundImage, backgroundVideo, backgroundPattern, backgroundVariable, backgroundTransition. Each has its own asset requirements.                                                     |
| `element-foundation-schemas.ts`                                 | Element layout, vector shapes, gradients, object-fit, and other foundational types shared across element variants. If multiple element types need the same sub-shape, it goes here.                                    |
| `element-content-schemas.ts`                                    | The actual content-type elements: heading, body, button, image, video, spacer, divider, link, input, range, and others. These are the schemas for the things people actually see on a page.                            |
| `schema-primitives.ts`                                          | The 50-plus action types in the trigger action discriminated union. Navigate, modalOpen, setVariable, every three.js action, every Rive action, scroll actions, and more. This is the most varied union in the system. |
| `section-block-base-schemas.ts`                                 | The base section props and individual section schemas before they're unioned together. Base includes shared fields like background, effects, margins, padding, and visibility.                                         |
| `section-style-and-column-schemas.ts`                           | Column layout types, responsive widths, item layouts, grid modes. A column section's complexity lives here.                                                                                                            |
| `section-column-validation.ts`                                  | The refine functions for column section cross-field validation. Column sections have a lot of interconnected fields -- this file keeps the validation logic from cluttering the schema definitions.                    |
| `section-effect-schemas.ts`                                     | Visual effects: blur, glass, glow, drop-shadow, grayscale, sepia, and others. Each effect is a small schema that can be applied to sections or elements.                                                               |
| `motion-props-schema.ts`                                        | Motion properties for elements: entrance, exit, hover, tap, focus, loop. Every animation type has a schema here.                                                                                                       |
| `module-block-schemas.ts`                                       | Video and audio player module schemas -- key bindings, gesture regions, feedback chrome, slot layouts.                                                                                                                 |
| `modal-block-schemas.ts`                                        | Modal overlay schemas -- trigger conditions, content references, dismissal behavior.                                                                                                                                   |
| `form-field-schemas.ts`                                         | Form field type schemas for the formBlock section type.                                                                                                                                                                |
| `element-model3d-schemas.ts`                                    | Three.js scene, camera, light, material, and model definitions. The 3D system has its own ecosystem of schemas.                                                                                                        |
| `page-definition-and-resolution-schemas.ts`                     | The top-level page schema, the definition block union (which is what ties everything together), and the resolved page schema that the renderer consumes.                                                               |
| `element-audio-schemas.ts` through `element-tooltip-schemas.ts` | Individual element type schemas pulled into their own files when they got complex enough to warrant it.                                                                                                                |

The barrel file at `packages/contracts/src/peblor/core/peblor-schemas.ts` re-exports everything from the schemas directory. The package entry at `packages/contracts/src/index.ts` re-exports from there. If you add a new file to the schemas directory, you need to add an export in the barrel file and, if it's a public type, in the package entry.

## The discriminated union pattern

Every polymorphic type in the system follows the same pattern. Once you understand this pattern, you understand how types are composed across the entire platform.

Here's how it works. You start with a base schema that defines the fields every variant shares. A section, for example, always has a background, effects, margins, padding, and visibility fields. Then you define per-variant schemas, each with a `type` field set to a literal string -- `contentBlock`, `sectionColumn`, `scrollContainer`, and so on. Each variant adds its own fields on top of the shared base. Finally, you combine them into a discriminated union keyed on the `type` field.

When Zod parses a discriminated union, it reads the `type` field first, then dispatches to the correct variant schema. This is fundamentally different from a regular union (`z.union([...])`), which tries each variant in sequence until one matches. With discriminated unions, the dispatch is O(1) -- read the type field, jump to the right schema. With regular unions, Zod has to attempt each variant and backtrack when one fails, which is slower and produces worse error messages.

More importantly, the error messages are better. A typo like `"contentBlcok"` matches no variant in the discriminated union, and Zod reports exactly that: "discriminator value 'contentBlcok' did not match any known variant." A regular union would try to parse your blob as each variant in sequence, fail on each one, and eventually report something vague about union resolution.

The actual schemas are defined using the `defineSchemaEntry` helper from `packages/contracts/src/peblor/core/peblor-schemas/schema-base.ts`. This helper wraps the Zod definitions with metadata that the code generators and validators use later. Every variant goes through this helper, which is how the system knows what types exist when it generates documentation or cross-references the catalog.

You can see the pattern in action in any of the union files: `element-block-schemas.ts` for elements, `section-block-schemas.ts` for sections, `background-block-schemas.ts` for backgrounds, and `schema-primitives.ts` for trigger actions.

## The major schema unions

There are five critical discriminated unions in the system. Each one maps to a dispatch point in the runtime, and each one follows the same pattern described above.

### sectionBlockSchema -- 7 variants

Defined in `section-block-schemas.ts`. These are the layout containers that structure a page:

- **contentBlock** -- A general-purpose section with elements stacked vertically. The default section type. Elements are rendered in order from top to bottom.
- **sectionColumn** -- A multi-column layout. Has its own cross-field validation chain -- five separate refine calls that check column assignments, element order uniqueness, span references, item style references, and item layout references. Each produces a targeted diagnostic so the content author knows exactly what to fix.
- **scrollContainer** -- A section with horizontal scrolling or sticky-scroll behavior. Elements inside can be pinned or scroll-driven.
- **sectionTrigger** -- A trigger-based section that responds to scroll position. Background transitions, parallax effects, and reveal animations are configured here.
- **formBlock** -- A form section with form field elements. Manages submission behavior, validation, and field layouts.
- **revealSection** -- A section that animates in when scrolled into view. Manages its own entrance timing and stagger behavior for child elements.
- **divider** -- A visual divider between sections. Minimal -- just a line or shape, no element content.

Each section type dispatches to a React component registered in `SECTION_COMPONENTS` at `packages/runtime-react/src/peblor/section/index.ts`.

### elementBlockSchema -- 25-plus variants

Defined in `element-block-schemas.ts`. These are the atomic building blocks of page content. They fall into a few rough categories:

- **Typography:** heading, body, rich text, link
- **Media:** image, video, audio, 3D model, Lottie animation, Rive animation, SVG, image comparison
- **Interactive:** button, tabs, tooltip, drag container, marquee, counter, scroll progress bar, input, range slider
- **Layout:** spacer, divider
- **Modular:** any element type that references a module configuration (video player, audio player)

Each element has its own required and optional fields. A heading needs a `text` field and a `variant` (which determines size). An image needs a `src` asset reference and an `alt` text. A button needs `text` and optionally an `href` or trigger configuration. The discriminated union ensures that element-level validation is precise -- you can't accidentally put image fields on a heading.

Each element type dispatches to a React component registered in `ELEMENT_COMPONENTS` at `packages/runtime-react/src/peblor/elements/index.ts`. Heavy elements (3D, Rive, Lottie, tabs, drag) use `next/dynamic()` for lazy loading.

### bgBlockSchema -- 5 variants

Defined in `background-block-schemas.ts`. Background layers render behind section content and can transition between each other as the user scrolls:

- **backgroundImage** -- A static or parallax image background.
- **backgroundVideo** -- A looping video background. Has its own playback controls through the trigger action system.
- **backgroundPattern** -- A repeating pattern or gradient fill.
- **backgroundVariable** -- References a CSS variable for the background fill, typically set by a parent context.
- **backgroundTransition** -- Defines a transition between background layers based on scroll position. This is how scroll-driven background changes work.

Backgrounds dispatch to components at `packages/runtime-react/src/peblor/background/index.ts`.

### triggerActionSchema -- 50-plus action types

Defined in `schema-primitives.ts`. This is the most varied union in the system. Trigger actions are what make pages interactive -- they fire in response to user gestures (click, hover, drag) or scroll position. The action types fall into categories:

- **Navigation:** `navigate`, `modalOpen`, `modalClose`, `scrollTo`, `sectionFocus`
- **Media:** `assetTogglePlay`, `seekToTime`, `setVolume`, `setPlaybackRate`
- **3D scene:** `three.setCamera`, `three.playAnimation`, `three.setPosition`, `three.setRotation`, `three.setVisibility`, `three.setMaterial` -- the 3D system has its own complete action vocabulary
- **Rive:** `rive.play`, `rive.pause`, `rive.setState`, `rive.setBoolean` -- Rive state machine control
- **State:** `setVariable`, `toggleVariable`, `incrementVariable` -- page-level state management
- **Scroll:** `setScrollProgress`, `syncScrollPosition`
- **Event:** `dispatchEvent`, `listenEvent`

Each action type has its own payload schema. The three-dimensional actions have distinct schemas for position (x/y/z), rotation (euler/quaternion), animation (name/loop/playback speed), camera (target/fov/near/far), visibility (show/hide/toggle), and material (color/opacity/emissive).

### peblorDefinitionBlockSchema -- the master union

Defined in `page-definition-and-resolution-schemas.ts`. This is the union that ties everything together. The page `definitions` dictionary maps string keys to definition blocks. A definition block can be:

- A section (any of the 7 section types)
- An element (any of the 25-plus element types)
- A background (any of the 5 background types)
- A `{ preset: "some-key" }` reference (which the load stage resolves)
- A definition with a `presets` array that merges multiple presets

The definition block union is what makes the flat-dictionary architecture work. Everything lives in one flat map, and the definition block schema knows how to validate every possible entry.

## Cross-reference validation with superRefine

Discriminated unions validate individual blocks. But pages have cross-block references -- an `elementOrder` array references keys in `definitions`, a `sectionOrder` array references keys in `definitions`, and trigger actions reference element keys. These cross-references can't be validated by simple schema parsing because they span multiple fields.

Zod's `superRefine` handles this. The page schema's superRefine, defined in `page-definition-and-resolution-schemas.ts`, walks every key in `sectionOrder` and confirms it exists in `definitions`. Then it walks every section's `elementOrder` and confirms each key resolves to an element definition (not a section or background). When a reference is broken, the diagnostic includes the exact path to the problem.

Column sections have their own refine chain in `section-block-schemas.ts`. Five separate refine calls validate:

1. That column assignments reference valid column indices.
2. That element order keys are unique within the section.
3. That span references don't exceed the column grid.
4. That item style references exist in the styles dictionary.
5. That item layout references match their referenced elements.

Each refine call produces a targeted diagnostic with a specific error code and JSON pointer. The content author knows exactly which field is wrong and what values are involved. No "something went wrong in the page config" nonsense.

## TypeScript types are inferred

Every schema variant produces a TypeScript type through `z.infer`. There is no hand-written type file that duplicates the schema structure. The inferred types are collected and re-exported from `packages/contracts/src/peblor/core/peblor-types.ts` and consumed everywhere downstream.

When you add a new variant to a discriminated union, you get the corresponding TypeScript type for free. If the schema has a required field, the type makes it required. If it's optional, the type reflects that. If you change a field from required to optional, every consumer that doesn't handle the optional case will get a type error on the next type-check pass.

This is a significant quality-of-life improvement over maintaining separate TypeScript interfaces. You never have to ask "does the type match the schema?" because the type is the schema. They can't get out of sync because they're the same thing.

## JSON schema generation

The Zod schemas are also exported to standard JSON Schema for consumption by external tooling: IDEs that understand JSON Schema, editors that need autocomplete for Peblor files, and validation pipelines that don't run JavaScript.

The generation happens in `packages/contracts/scripts/generate-schemas.ts`. It uses Zod 4's built-in `z.toJSONSchema()` method with `target: "draft-2020-12"`. The script writes generated schemas to `packages/contracts/dist/schemas/`, and the postinstall hook copies them to `content/schemas/` via the `contracts:generate-schemas` npm script.

The generated schema files are:

- `peblor.schema.json` -- the full page schema, including sections, elements, backgrounds, and definitions
- `section.schema.json` -- section blocks only
- `element.schema.json` -- element blocks only
- `module.schema.json` -- module blocks only
- `definition-block.schema.json` -- the definition block union (what goes in the page's definitions dictionary)
- `capability-importer.schema.json`, `capability-exporter.schema.json`, `capability-cms-adapter.schema.json` -- plugin capability schemas for the extensions system

Run `npm run contracts:generate-schemas` after any schema change. It's also part of the postinstall hook, so it runs automatically on every `npm install`. If you change a schema and forget to regenerate, CI will catch it -- the generated schemas are checked in and the catalog build step fails if they're out of date.

## How to add a new variant to an existing union

Let's say you're adding a new element type -- call it `elementFoo`. Here's the checklist:

1. Create `packages/contracts/src/peblor/core/peblor-schemas/element-foo-schemas.ts`. Define the Zod schema with the `defineSchemaEntry` helper from `schema-base.ts`. Give it a `type` field set to the literal `"elementFoo"` plus whatever fields it needs. If it shares sub-shapes with existing element types, import them from the foundation or content schemas.

2. Import the new schema in `packages/contracts/src/peblor/core/peblor-schemas/element-block-schemas.ts` and add it to the `elementBlockSchema` discriminated union array. The order in the array doesn't matter for discriminated unions -- Zod reads the type field, not the array position.

3. If the new type introduces a new content schema (like the 3D scene schemas did, or new trigger actions for Rive), add those in the same file or a dedicated file. Keep related schemas together.

4. Add a component in `packages/runtime-react/src/peblor/elements/` and register it in the `ELEMENT_COMPONENTS` map. If it's heavy, wrap it in `next/dynamic()` for lazy loading. But that's the runtime layer -- the schema layer is done after step 2.

5. Run `npm run contracts:generate-schemas` to regenerate the JSON schemas.

6. Run `npm run type-check` to ensure cross-package type consistency. If your new schema introduces new required fields, downstream code that constructs element objects will need updating.

For the catalog: add the new element ID to the `ENTRIES.ts` array at `packages/catalog/src/intent/ENTRIES.ts` and create a corresponding `*.intent.yaml` file in the same directory. This keeps the schema registry and the component catalog synchronized. Without this step, the catalog coverage check in CI will fail.

The pattern is identical for sections, backgrounds, and trigger actions. Find the appropriate union file, add your variant schema, and add it to the union array. That's it for the schema side.

## Schema versioning

The contract version is defined at `packages/contracts/src/version.ts`. It's a string like `"1.0.0"`. Every page JSON carries a `contractVersion` field, which the migration system uses to determine if a page needs upgrading.

The version is not bumped automatically on every schema change. It only gets bumped when there's a breaking change to the on-disk format that requires migration -- field renames, type changes, structural reorganizations. Adding a new variant to a discriminated union is not a breaking change. Renaming a field that every page uses is.

When a version bump is needed, the migration logic goes in `packages/core/src/index.ts` (the `migratePage` function) and handles the transition between specific version pairs. The pipeline always upgrades old pages to the current version before processing them.

---

Back to [monorepo-map.md](monorepo-map.md). Next: [core.md](core.md).
