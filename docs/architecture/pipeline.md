# The five-stage pipeline

Everything in Peblor goes through the same pipeline. A JSON file on disk enters stage one, and a rendered HTML page comes out stage five. No shortcuts, no bypasses, no special cases. Every page gets the full treatment.

Each stage is a pure function. It takes data in, transforms it somehow, and passes the result to the next stage. No side effects, no mutable state being passed around by reference, no surprises. You could run the first four stages in a Node script on your laptop and the output would be identical to what the server produces.

The pipeline is framework-agnostic through stage four. The entire `packages/core/` package has zero React or Next.js imports. Stage five happens to use React, but the first four stages have no idea what renderer is coming next — and they don't care. The orchestrator that wires everything together lives at `packages/core/src/index.ts`.

---

## Stage 1: LOAD

**What goes in:** A page slug. Something like `/about` or `/presets/cards-basic`.

**What comes out:** A complete, hydrated page object where every preset reference has been resolved into actual fields and every sidecar section has been inlined. The page is self-contained and ready for validation.

**Where the code lives:** `packages/core/src/internal/peblor-load.ts` with submodules in `packages/core/src/internal/load/`.

**Why this stage exists:** JSON files can't reference other JSON files. When a page says "use the demo-hero preset," that's a promise the JSON file can't fulfill on its own. Somebody has to go find that preset, pull its fields in, and merge them into the definition block. That somebody is the load stage. Without it, every downstream stage would need to know how to find and merge presets, which is exactly the kind of cross-cutting concern that belongs in one place.

### How it works

The loader starts by resolving the slug to a real file path under `content/pages/`. Path traversal protection is handled in `packages/core/src/internal/peblor-paths.ts` — nobody's navigating out of the content directory with a cleverly crafted slug. The page-discovery logic itself lives in `packages/core/src/internal/load/peblor-discover-pages.ts`.

Once the raw JSON is in memory, the loader does four things. It runs I/O in parallel where it can, since loading presets and sidecar files are independent operations.

**First, it loads definitions.** The page's definitions dictionary is read from its `index.json`. But not all sections live inline — some live in sidecar files next to the page's directory. The hydrator at `packages/core/src/internal/load/peblor-load-definitions.ts` discovers those sidecar files and inlines their content into the definitions dictionary. This is how a page can stay small and focused while still composing from larger building blocks.

**Second, it loads presets.** Preset JSON files live under `content/presets/`, organized by category in subdirectories like `bg/`, `card/`, `type/`, and `ui/`. The loader at `packages/core/src/internal/load/peblor-load-presets.ts` walks every referenced directory, reads every JSON file, and merges all of them into a single flat namespace. Each file becomes one key in a global preset dictionary. This is why preset keys have to be globally unique across all categories — two files with the same key would silently collide and one would eat the other.

**Third, it resolves preset references.** With definitions and presets both in memory, the resolver walks every definition block and shallow-merges any referenced preset onto it using RFC 7396 merge-patch semantics. The logic is in `packages/core/src/internal/peblor-presets.ts`. A preset can reference another preset — the resolver handles that recursively. It also handles the special case of elementGroup sections, which have nested definitions dictionaries that need their own merge pass.

If a preset references another preset that references back to the first one, the resolver detects the cycle and produces a structured diagnostic. No infinite loops, no stack overflows — just a clean error saying "these presets form a cycle."

**Fourth, it merges global modules.** Module configurations from `content/modules/` get merged into definitions. These are self-contained player configs (video players, audio players) with their own key bindings, gesture regions, and feedback chrome — all data, no code. The merge happens in the same `peblor-load-definitions.ts` file.

---

## Stage 2: VALIDATE

**What goes in:** The hydrated page object from stage one, with all presets resolved and sidecars inlined.

**What comes out:** Either a parsed object with TypeScript types inferred by Zod, or a list of diagnostics describing what's wrong.

**Where the code lives:** The `validatePage` function in `packages/core/src/index.ts` calls `peblorSchema.safeParse()` from `packages/contracts/src/`.

**Why this stage exists:** JSON has no type system. A string field that should be a number, a missing required key, a reference to a definition that doesn't exist — these are all silent failures in raw JSON. JSON parsers don't care about your data model. They'll happily return `null` for a missing field and leave it to whoever reads it next to figure out something's wrong. The validate stage catches these problems before they reach the renderer.

### How it works

Validation uses Zod 4's `safeParse` method exclusively. It never throws. A valid page produces a clean result object with an empty diagnostics array. An invalid page produces a result with a full array of diagnostic objects.

Each diagnostic contains four things:

- A machine-readable code like `PB_SCHEMA_ISSUE` so automated tools can understand the problem without parsing prose
- A severity level — error, warning, or info — so you can decide what's blocking and what's advisory
- A JSON pointer to exactly where the problem is, like `$.definitions.hero.type`, so you go straight to the offending field
- A human-readable message explaining what was wrong and what value was received

The schema itself, called `peblorSchema`, is built as a discriminated union in `packages/contracts/`. It understands the full shape of a Peblor page:

- **Page structure** — the top-level metadata fields, the section order array, the definitions dictionary
- **Section type rules** — each section type has its own required and optional fields. A `contentBlock` expects different things than a `scrollContainer` or a `divider`
- **Element type rules** — the twenty-plus element types each have distinct field requirements. A heading needs size and text. A button needs action and label. An image needs a source and alt text
- **Cross-reference validation** — every key in an element order array must resolve to a definition that exists. Every trigger action payload must reference an element that's actually on the page. These checks use Zod's `superRefine` mechanism, which lets you validate relationships between fields after the basic type checks pass

There are two validation paths. The synchronous `validatePage` works with inline presets only — useful for quick checks and unit tests. The async `validatePageAsync` also loads global presets from `content/presets/` before validating, mirroring what the full runtime pipeline does. Both are exported from `packages/core/src/index.ts`.

---

## Stage 3: EXPAND

**What goes in:** A validated page object where everything is type-checked and structurally sound.

**What comes out:** A pair of things — a resolved background block and a flat array of section objects with all elements inlined, defaults applied, and entrance motions expanded to concrete keyframes.

**Where the code lives:** `packages/core/src/internal/peblor-expand.ts`, with submodules in `packages/core/src/internal/peblor-expand/`.

**Why this stage exists:** The page JSON stores elements as named keys in definitions and references them by string in element order arrays. That indirection is great for authoring — you can reference the same element from multiple sections, or override it per-section — but the renderer needs concrete objects. It doesn't want to look up keys. It wants a flat array of ready-to-render sections, each with its elements already inlined.

Expansion is also where the pipeline fills in everything the content author didn't specify: default heading sizes, entrance motion keyframes, module configs. By the time the expand stage is done, the page has no more unresolved references.

### How it works

The expand function does six things in sequence, each building on the one before.

**It builds the display order.** The page's `sectionOrder` array is concatenated with any trigger sections and reduced to a single ordered list of section keys. This is the definitive rendering sequence — every section appears once in this list, in the order it should be drawn.

**It resolves the background.** The page's `bgKey` field, if set, is looked up in definitions and type-checked against known background types. If the key doesn't resolve or the referenced definition isn't a background type, the page gets no background — a clean null result rather than a silent fallback to some default that might be wrong.

**It inlines elements.** For each section, the element order array — which could be a responsive object with separate mobile and desktop variants — is resolved against the combined definitions dictionary. The resolution happens in `packages/core/src/internal/peblor-expand/element-resolution.ts`. Each key is looked up, type-checked, and placed into the section's elements array as a concrete object.

**It applies module configs.** Elements with a `module` string reference get their module configuration inlined from the global module definitions. This also happens inside the element-resolution file. Video players and audio players are the most common use case — an element says "I'm a video player" via its module reference, and the expand stage fills in all the key bindings, gesture zones, and UI chrome from the module definition.

**It resolves trigger payloads.** Trigger actions that reference definition keys are resolved at `packages/core/src/internal/peblor-expand/trigger-payload-resolution.ts`. Column sections get their child element namespaces applied at `packages/core/src/internal/peblor-expand/column-namespacing.ts`.

**It applies builder defaults.** Every element variant — heading size, button style, image aspect ratio — has a set of defaults defined at `packages/core/src/internal/peblor-apply-element-defaults.ts`. These come from the host config at `packages/core/src/internal/adapters/host-config.ts`, which is an injectable configuration object, not hardcoded constants. If a heading doesn't specify a variant, the expander applies one based on context. This is how different brands can get completely different default looks without changing any component code.

**It resolves entrance motions.** Motion presets are just strings — `fade`, `slideUp`, `blurIn` — but the renderer can't use strings. It needs keyframes. The resolver at `packages/core/src/internal/peblor-resolve-entrance-motions.ts` converts each named preset into a full framer-motion keyframe object: initial state, animate state, transition config, viewport trigger settings, all computed server-side. The client never opens the motion presets file or does a lookup by name. It receives the expanded keyframes directly.

---

## Stage 4: RESOLVE

**What goes in:** The expanded sections and background from stage three, with all references resolved and defaults applied.

**What comes out:** The same structure, but every asset URL is now a signed CDN URL, every image has its responsive srcSet computed, and every theme-aware color object has been resolved into CSS values.

**Where the code lives:** `packages/core/src/internal/peblor-resolve-assets-server.ts`.

**Why this stage exists:** Raw asset references like `images/hero.jpg` are not useful to a browser. They need to become full CDN URLs with authentication tokens. Images need multiple resolution variants so the browser can pick the right one. Theme-aware values like `light: "#fff", dark: "#111"` need to become CSS `light-dark()` functions. This is the stage that makes the data browser-ready — after this point, you could hand the output to any renderer and it would have everything it needs.

### How it works

The resolve stage walks every section, every background, and every background transition to do four things.

**It collects asset references.** It builds a set of every asset key used anywhere on the page — images, videos, background fills — using the `collectPeblorAssetRefs` function from `packages/core/src/internal/peblor-resolved-assets.ts`. This happens before any URL signing so the system knows exactly what needs authentication.

**It signs CDN URLs.** Each asset key is validated against CDN patterns. The URL builder lives in `packages/core/src/lib/cdn-asset-server.ts`, which constructs the full URL and signs it through `packages/core/src/lib/proxy-url.ts`. By the time a browser requests an image, the URL includes everything needed to authenticate and serve it.

**It computes responsive image sizes.** Image elements get responsive srcSet attributes computed based on container width estimates from the section type and viewport width. Multiple image widths are generated — the browser picks the right one at render time based on the actual viewport and device pixel ratio.

**It resolves theme strings.** Background fills, border colors, and any other property with light/dark values get resolved to CSS `light-dark()` functions. This happens inside `lowerBackgroundThemeFillsToCss` and related functions in the same resolve-assets-server file. The result is CSS that the browser can evaluate without any JavaScript — just native CSS theming.

**It builds the background definitions map.** Background definitions from the page's definitions dictionary are extracted, their assets are resolved, and they're returned separately. This separate map feeds the runtime's background transition system, which swaps between backgrounds as the user scrolls.

---

## Stage 5: RENDER

**What goes in:** The resolved page data from stage four, plus overlay sections (header, footer, navigation) and any modals the page references.

**What comes out:** A rendered React tree that the browser can paint.

**Where the code lives:** The main renderer is at `packages/runtime-react/src/peblor/PeblorRenderer.tsx`. Section components dispatch from `packages/runtime-react/src/peblor/section/index.ts`, and element components dispatch from `packages/runtime-react/src/peblor/elements/index.ts`.

**Why this stage exists:** Data doesn't render itself. The resolve stage produces a complete, browser-ready data structure, but it's still just a JavaScript object. Something needs to translate that object into actual DOM elements. Stage five is that something.

### How it works

The renderer is a client component called `PeblorRenderer`. It receives its data through `PeblorPageProps`, defined in `packages/runtime-react/src/peblor/PeblorPage.tsx`, and produces a full page tree.

The render chain goes roughly like this. The renderer starts by setting up background transitions and section overrides through a trigger system. Then it renders the current background. Then it starts walking through sections. Each section gets its own error boundary — if a section fails to render, the error boundary catches it and that section becomes a no-op, but the rest of the page keeps going. A broken section never takes down the whole page.

Inside each section, elements are rendered in sequence. Each element goes through several layers: an entrance animation wrapper if the element has an entrance preset, an exit animation wrapper for elements that animate out, a gesture motion wrapper for hover and tap interactions, and finally the actual component that renders the element's content.

Dispatch is a simple lookup map — a plain object that maps type strings to React components. Section types are registered in the `SECTION_COMPONENTS` map. Element types are in `ELEMENT_COMPONENTS`. That's it. No dependency injection, no decorators, no registry pattern. Adding a new type means touching exactly two places: the Zod union in `packages/contracts/` and the component map in `packages/runtime-react/`.

The runtime has seven section types — contentBlock, sectionColumn, scrollContainer, sectionTrigger, formBlock, revealSection, divider — and something like twenty-five element types covering heading, body, button, image, spacer, video, audio, 3D, Lottie, Rive, tabs, drag, and more. They all follow the same pattern: a discriminated union in Zod, a component in the lookup map.

Backgrounds are lazy-loaded through dynamic imports to keep the initial bundle small. Heavy interactive elements like 3D, Rive, Lottie, tabs, and drag use the same pattern — they only load when the page actually needs them.

The orchestrator function `getPeblorPropsFromPage` at `packages/core/src/index.ts` ties the whole thing together. It runs stages one through four, then loads overlay sections and modals alongside the main page data. Overlays come from `packages/core/src/internal/overlay/peblor-overlay-loader.ts` — the header, footer, and navigation are all loaded separately and appended to the render output. This means the page JSON never has to worry about chrome; overlays are applied globally based on the page's overlay configuration.

---

## Pipeline diagram

There's a visual flowchart of all five stages in `assets/pipeline.mmd` if you prefer diagrams to prose.

---

Back to [overview.md](overview.md). Next: [data-model.md](data-model.md).
