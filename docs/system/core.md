# The content pipeline

This is the most important package in the platform. `@pb/core` is the five-stage pipeline that takes JSON files from `content/pages/` and produces browser-ready page data. It has zero React or Next.js dependencies. The renderer could be swapped for anything tomorrow -- Vue, Svelte, a PDF generator, a command-line page previewer -- and everything before that swap stays exactly the same.

The pipeline is the product. Everything else -- the React renderer, the CLI, the MCP server -- is infrastructure built around it.

## The orchestrator

The entry point to the whole thing is `getPeblorPropsAsync` at `packages/core/src/index.ts`. You give it a page slug like `"/about"` and it gives you back a fully resolved `PeblorPageProps` object ready for rendering. Internally, it composes two functions:

- **`getPageAsync`** -- handles the LOAD and EXPAND stages. Takes a slug, resolves presets, validates the page, expands references into concrete objects, applies defaults.
- **`getPeblorPropsFromPage`** -- handles element defaults (the second defaults pass that needs section context), entrance motion resolution, asset resolution, and overlay loading. Takes the expanded page from `getPageAsync` and finishes the job.

This split exists so callers can inspect or transform the mid-pipeline data before final resolution. A common use case is tag filtering -- you might load a page, look at its tags, decide the user shouldn't see certain sections, remove them from the section order, and then pass the modified page to the second stage. The split means you can do that without duplicating any pipeline work.

The function signatures and return types are all in `packages/core/src/index.ts`. The orchestrator doesn't hide complexity -- it sequences pure functions in a clear order, and that order is visible in the source.

## Stage 1: LOAD

**Where it happens:** `packages/core/src/internal/peblor-load.ts` and everything in `packages/core/src/internal/load/`.

**What goes in:** A page slug (like `"/about"`).

**What comes out:** A fully hydrated `ResolvedPageWithDefinitions` object. Every `preset` string has been replaced with concrete fields. Sidecar section files have been inlined. Global modules have been merged. The output is a single self-contained object that the rest of the pipeline can operate on without touching the filesystem again.

**Why this stage exists:** A page JSON file references things outside itself -- presets, sidecar sections, global modules. None of those references are valid JSON. The load stage resolves every external reference so that everything downstream works with a complete, standalone object.

### How it works

The loader does four things, and it does them in parallel because they all read from disk independently:

**Discover and read.** The slug is resolved to a file path under `content/pages/`. Path traversal attacks are checked at `packages/core/src/internal/peblor-paths.ts` -- the loader won't follow `../` references outside the content directory. Discovery logic lives at `packages/core/src/internal/load/peblor-discover-pages.ts`. The page's `index.json` is read and parsed into a raw `Peblor` object.

**Load definitions with sidecar hydration.** The page's `definitions` dictionary is read. Some sections may be stored in sidecar files -- individual JSON files alongside the page's `index.json` rather than inline in the main file. The hydrator at `packages/core/src/internal/load/peblor-load-definitions.ts` discovers sidecar files by convention: a section key like `"hero"` can be defined in `index.json` directly, or in a file called `hero.section.json` in the same directory. If both exist, the inline version wins. Sidecar files are what keep page files manageable when sections get large.

**Load presets.** Preset JSON files live under `content/presets/`, organized into category directories (bg, element, motion, section, trigger, and more). The loader at `packages/core/src/internal/load/peblor-load-presets.ts` discovers every `.json` file recursively and merges them into a single flat namespace. Each file becomes exactly one key in a global preset dictionary. This is why preset keys must be globally unique across all files -- two files with the same key would collide silently. The console warns when a collision happens, but there's no guard beyond that.

**Resolve preset references.** With definitions and presets both loaded, the resolver at `packages/core/src/internal/peblor-presets.ts` walks every definition block and shallow-merges any referenced preset onto it. The merge uses JSON merge patch semantics from RFC 7396: preset values are the baseline, and any fields on the referencing definition override them. This is recursive -- a preset can reference another preset, which can reference another, and so on. The recursion depth is bounded, and circular references are detected. If preset A references preset B which references preset A, the resolver detects the loop and produces a structured diagnostic rather than entering an infinite loop.

**Merge global modules.** Module configurations from `content/modules/` are merged into definitions. These are self-contained player configs for video and audio -- key bindings, gesture regions, feedback chrome, slot layouts. All data, no code. The merge happens at `packages/core/src/internal/load/peblor-load-definitions.ts`.

The output of the load stage is a `ResolvedPageWithDefinitions` where every reference has been chased down and inlined. The object is self-contained, self-validating, and ready for the next stage.

### Edge cases in the load stage

- **Missing preset:** If a definition references a preset that doesn't exist, the loader produces a diagnostic with the preset key and the definition path. The page doesn't hard-crash -- it continues loading with the missing preset fields as undefined, and the missing reference is reported so the author can fix it.

- **Missing sidecar file:** If a sidecar file is expected but doesn't exist, it's silently skipped. The section key simply won't be present in definitions, and the validation stage will catch the missing reference.

- **Circular presets:** Detected and diagnosed, not infinitely looped. The diagnostic tells you which preset keys are involved.

- **Empty presets directory:** Treated as "no presets available." The namespace is empty, and any preset references will produce missing-preset diagnostics.

## Stage 2: VALIDATE

**Where it happens:** `packages/core/src/index.ts` -- the `validatePage` and `validatePageAsync` functions.

**What goes in:** The hydrated `ResolvedPageWithDefinitions` object from stage 1.

**What comes out:** Either the parsed object with types inferred by Zod, or a list of `PeblorDiagnostic` objects describing what's wrong. It never throws.

**Why this stage exists:** JSON has no type system. A string field that should be a number, a missing required key, a reference to a definition that doesn't exist -- these are all silent failures in raw JSON. Validation catches them before they reach the renderer, and it catches them with messages that tell the content author exactly what to fix.

### How it works

Validation uses Zod 4's `safeParse` exclusively. Not `parse`, which throws on failure. `safeParse` always returns a result object with either the parsed data or a list of issues. This means validation is always safe to call, always returns structured diagnostics, and never requires a try/catch.

A valid page produces a result with `valid: true` and an empty diagnostics array. An invalid page produces a result with `valid: false` and an array of `PeblorDiagnostic` objects.

Each diagnostic contains:

- **code** -- a machine-readable error code like `PB_SCHEMA_ISSUE`, `PB_VALIDATION_ERROR`, or `PB_REFERENCE_ERROR`
- **severity** -- `"error"`, `"warning"`, or `"info"`
- **path** -- a JSON pointer to the problem location, like `$.definitions.hero.type`
- **message** -- what's wrong and what value was received, in plain English

The schema used for validation is `peblorSchema` from `@pb/contracts`. It validates:

- **Page shape:** `sectionOrder` must be an array of strings, `definitions` must be a dictionary of definition blocks, metadata fields must be the right types.
- **Section type rules:** Each section type (`contentBlock`, `sectionColumn`, etc.) has its own required and optional fields. A `sectionColumn` without `columnDefinitions` fails. A `divider` with an `elementOrder` array fails (dividers can't have elements).
- **Element type rules:** Each element type (`elementHeading`, `elementBody`, etc.) has distinct field requirements. An `elementImage` without `src` fails. An `elementButton` without `text` or `icon` fails.
- **Cross-reference validation:** The superRefine on the page schema checks that every key in `sectionOrder` exists in `definitions`, and that every key in each section's `elementOrder` resolves to an element definition (not a section or background).

There are two validation paths. The synchronous `validatePage` validates against the schema only -- it doesn't load presets. It's fast and useful for unit tests and quick checks where you already have a fully-resolved object. The async `validatePageAsync` also loads global presets from `content/presets/` before validating, which mirrors what the full runtime pipeline does. If you're validating a page that uses presets, use the async version.

### Edge cases in validation

- **Empty page:** A page with no `sectionOrder` and no `definitions` is technically valid -- it would render as an empty page. The validation passes but linting might flag it.
- **Orphaned definitions:** Definitions that aren't referenced by `sectionOrder` or any `elementOrder` pass validation but show up as warnings. They don't break the page, but they're dead code.
- **Duplicate section keys:** If `sectionOrder` has the same key twice, the superRefine catches it and produces a diagnostic pointing to the duplicate entry.
- **Wrong type in definition:** A section that references an element key in its `elementOrder` that actually points to a section definition in `definitions` -- the superRefine catches the type mismatch.

## Stage 3: EXPAND

**Where it happens:** `packages/core/src/internal/peblor-expand.ts` and everything in `packages/core/src/internal/peblor-expand/`.

**What goes in:** A validated `ResolvedPageWithDefinitions` object from stage 2.

**What comes out:** A pair -- a resolved background block (or null) and a flat array of `SectionBlock` objects with all elements inlined, defaults applied, and entrance motions expanded.

**Why this stage exists:** The page JSON stores elements as named keys in `definitions` and references them by string in `elementOrder`. That indirection is great for authoring -- you can reference the same element from multiple sections, reuse definitions across sections, and keep the page file modular. But the renderer needs concrete objects. It can't look up strings at render time. The expand stage converts all key references into actual data objects.

### How it works

The expand function does seven things in sequence, each building on the results of the previous step:

**1. Build the display order.** The page's `sectionOrder` array defines the primary render order. But trigger-based sections can also appear in response to scroll position or user interaction. The expander concatenates `sectionOrder` with any trigger sections and reduces them to a single ordered list. The ordering logic is in `peblor-expand.ts` -- it's a straightforward array concat with deduplication.

**2. Resolve the background.** The page may have a `bgKey` field that points to a background definition in `definitions`. The expander looks it up and type-checks it against the known background types. If the key doesn't resolve, or resolves to something that isn't a background type, the page gets no background -- a clean null result. No silent fallback, no invisible background slot. Null means "render nothing here."

**3. Inline elements.** For each section, the `elementOrder` array is resolved against the combined definitions dictionary. This happens at `packages/core/src/internal/peblor-expand/element-resolution.ts`. The `elementOrder` can be a plain array of key strings, or a responsive object with `mobile` and `desktop` variants for different breakpoints. Each key is looked up, type-checked to confirm it's an element (not a section or background), and placed into the section's `elements` array. String references become real element objects. If a key doesn't resolve, the expander skips it and reports a diagnostic -- the other elements still render.

**4. Apply module configs.** Elements with a `module` string reference get their module configuration inlined from the global module definitions. This happens inside `applyElementIdsAndModules` in the same element-resolution file. A video player element with `"module": "video-player"` gets its key bindings, gesture regions, and chrome configuration merged in from the `video-player` module definition in `content/modules/`.

**5. Resolve trigger payloads.** Trigger actions that reference definition keys in their payloads need those references chased down. For example, a `three.playAnimation` action might reference a 3D scene definition by key. The resolver at `packages/core/src/internal/peblor-expand/trigger-payload-resolution.ts` handles this. Column sections also get their child element namespaces applied at `packages/core/src/internal/peblor-expand/column-namespacing.ts`, which sets up the column-to-element mapping for multi-column layouts.

**6. Apply builder defaults.** This is the defaults system, and it's significant -- the file at `packages/core/src/internal/defaults/pb-builder-defaults.ts` is over 1,200 lines. Every element variant has a set of defaults that come from the host config, not from hardcoded constants. A heading with no `variant` field gets a default variant based on context. A button with no `style` field gets a default button style. An image with no `aspectRatio` gets a default aspect ratio. The defaults function at `packages/core/src/internal/peblor-apply-element-defaults.ts` walks every element, checks for missing fields, and fills them in from the host config. Different brands get different default looks by swapping the host config -- no component code changes needed.

**7. Resolve entrance motions.** Motion presets like `"fade"` or `"slideUp"` are just strings in the page JSON. The resolver at `packages/core/src/internal/peblor-resolve-entrance-motions.ts` converts them into framer-motion keyframe objects with computed `initial`, `animate`, and `exit` props. Viewport triggers (`onFirstVisible`, `onEveryVisible`), transition durations, easing curves, and animation keyframes are all computed server-side at build time. The client never looks up a motion preset by name -- it receives the expanded keyframes directly. This means the client doesn't need to know what "fade" means; it just animates from opacity 0 to opacity 1. Loop animations -- like continuous background parallax or rotating elements -- are also resolved here.

The output of the expand stage is a pair of values: a resolved background object (or null) and a flat array of `SectionBlock` objects. Every reference has been chased, every default applied, every motion preset expanded. The data is ready for asset resolution.

### Edge cases in the expand stage

- **Missing element key in elementOrder:** The expander reports a diagnostic and skips the missing key. The section still renders with whatever elements could be resolved.
- **Preset override conflicts:** If a preset defines a motion animation and the local definition also defines motion, the local value wins (merge patch semantics). The override is silent -- no warning, no conflict resolution, just last-write-wins.
- **Empty elementOrder:** A section with no elements renders as an empty container. This is valid for background-only sections or sections that are placeholders.
- **Responsive elementOrder mismatch:** If `mobile` has elements that `desktop` doesn't (or vice versa), each breakpoint resolves independently. Missing keys in one breakpoint are non-fatal -- that breakpoint just gets fewer elements.

## Stage 4: RESOLVE

**Where it happens:** `packages/core/src/internal/peblor-resolve-assets-server.ts`.

**What goes in:** The expanded sections and background from stage 3.

**What comes out:** The same structure with all asset URLs signed, responsive image sizes computed, and theme strings resolved to CSS values.

**Why this stage exists:** Raw asset references like `"images/hero.jpg"` are not useful to a browser. They need to become fully qualified, signed CDN URLs that expire after a reasonable window. Images need responsive `srcSet` attributes so the browser can pick the right size for the viewport. Theme-aware values like `{ light: "#fff", dark: "#111" }` need to become CSS `light-dark()` functions. This is the stage that makes the data browser-ready, and it's the last stage that runs server-side.

### How it works

The resolve stage walks every section, background, and background transition to do five things:

**1. Collect asset references.** It builds a set of every asset key referenced across the entire page -- images, videos, background fills, background transition layers. The collection function is `collectPeblorAssetRefs` at `packages/core/src/internal/peblor-resolved-assets.ts`. It traverses the section tree, the background definitions, and any background transitions, extracting every `src`, `srcDark`, `poster`, and `fallback` field it finds.

**2. Sign CDN URLs.** Each raw asset key is validated against CDN patterns at `packages/core/src/lib/cdn-asset-server.ts` and signed through a proxy URL builder at `packages/core/src/lib/proxy-url.ts`. Signing adds an expiration timestamp and a signature that the CDN edge validates before serving the asset. This prevents hotlinking and limits the window in which a stolen URL is usable. The signing key and CDN base URL come from the environment, not from the page data.

**3. Compute responsive image sizes.** Image elements receive responsive `srcSet` attributes. The resolver estimates container width from the section type and viewport width, then generates multiple image widths. An image in a full-width hero section gets different breakpoints than the same image in a narrow sidebar section. The browser picks the right width at render time based on the actual viewport. This means images are never larger than they need to be, and the server doesn't need to know the client's exact dimensions.

**4. Resolve theme strings.** Background fills, border colors, text colors, and any other property with a `{ light, dark }` value object get resolved to CSS `light-dark()` functions. The resolution happens inside `lowerBackgroundThemeFillsToCss` and related functions in the resolve-assets-server file. The result is a single CSS value that the browser interprets based on the user's color scheme preference. No class toggles, no media query switches in JavaScript, no flash-of-wrong-theme.

**5. Build the background definitions map.** Background definitions from the page's `definitions` dictionary are extracted, asset-resolved, and returned as a separate map. This map is what the runtime's background transition system uses during scroll-triggered background changes -- it needs all background definitions available in a single lookup structure so it can transition between them without additional network requests.

The resolve stage is also where `src` and `srcDark` pairs (for images that have different versions for light and dark mode) are consolidated into a single responsive structure. The client never has to choose which image source to use based on the theme -- the server pre-resolves that too.

## Stage 5: RENDER (delegated to runtime-react)

The final stage isn't in `@pb/core` -- it lives in `@pb/runtime-react`. The renderer receives `PeblorPageProps` and produces a React tree. This doc covers only what's relevant to understanding the pipeline boundary.

The key design choices in the renderer:

- Dispatch is a plain `Record<string, Component>` lookup. Sections register in `SECTION_COMPONENTS` at `packages/runtime-react/src/peblor/section/index.ts`. Elements register in `ELEMENT_COMPONENTS` at `packages/runtime-react/src/peblor/elements/index.ts`. No dependency injection, no registry pattern, no decorators. Just a map.
- Heavy components (3D, Rive, Lottie, tabs, drag) use `next/dynamic()` for code splitting. The initial bundle doesn't include them.
- Error boundaries exist at the section level and the element level. A broken element doesn't take down the section. A broken section doesn't take down the page.
- The renderer is a client component (`"use client"`) because it handles browser APIs and interaction. Everything upstream is server-side.

For full renderer details, see the runtime-react doc at [runtime-react.md](runtime-react.md).

## The host-config system

Every brand-specific default in the system is injectable through the host config. The function `setPeblorHostConfig` at `packages/core/src/internal/adapters/host-config.ts` accepts a partial config object and merges it into the running defaults. Call it once at app startup, and the pipeline uses those defaults for every page it processes.

The host config contains two major sections:

**pbBuilderDefaults** -- variant-level defaults for every element type. This file at `packages/core/src/internal/defaults/pb-builder-defaults.ts` is over 1,200 lines. It defines defaults for:

- Heading sizes for every variant (h1, h2, h3, h4, h5, h6, display, subtitle, caption)
- Button styles (default, accent, ghost, text, icon) with their respective padding, border radius, font weight, and color tokens
- Image aspect ratios for different layout modes (cover, contain, fill)
- Video player chrome (show/hide controls, autoplay behavior, loop behavior)
- Spacer heights for different breakpoints
- Input field styles (border, padding, background, font)
- Audio player layout variants
- 3D scene defaults (camera position, lighting setup)
- And more -- each element type that has visual variants has defaults here

The defaults are not hardcoded constants scattered through component files. They live in one file, they're loaded from one config, and they can be swapped for an entirely different set by a different consumer app.

**pbContentGuidelines** -- higher-level rules that govern content behavior beyond individual element variants. Defined at `packages/core/src/internal/defaults/pb-guidelines-expand.ts`. This includes things like default text alignment, font style bindings, and responsive behavior rules that span multiple element types.

The demo consumer in `apps/web` provides its own host config at `src/app/theme/pb-content-guidelines-config.ts` and injects it at startup via `setPeblorHostConfig()`. A different consumer app -- say, for a different brand or a different site -- would provide different values. The pipeline code never changes. The brand config changes.

This is how the platform stays brand-agnostic. If a heading has no `variant` field, the host config decides what size it should be. If a button has no `style` field, the host config decides its appearance. The pipeline doesn't have opinions about what looks good. It only knows how to apply the opinions it's given.

## The MIGRATE path

Schema version upgrades are handled by `migratePage` at `packages/core/src/index.ts`. It checks the page's `contractVersion` field, determines what transforms need to run, stamps the current version, and validates the result.

The function takes a `fromVersion` and `toVersion` and returns an object with the migrated page, the list of applied transforms, and any diagnostics produced during migration.

Currently the migration path covers the transition from 0.x to 1.0.0. The transform is minimal -- stamp the contract version and inject an asset base URL if one is missing. There's a `noopFallback` function that handles unknown version-pairs by returning the page unchanged with an info-level diagnostic.

Real structural migration -- field renames, shape changes, data transformations -- would be added as explicit version-pair handler functions. The migration framework supports it, but no one has needed it yet. When a breaking schema change happens, this is where the conversion logic goes.

## Plugin architecture

The pipeline stages are composed as pure functions called in sequence by the orchestrator. There is no plugin system for injecting custom stages into the middle of the pipeline. This is deliberate. Extension points exist at the boundaries, not in the middle:

- **Before expand:** The `transformSections` option on `getPeblorPropsFromPage` lets callers modify the section array between the EXPAND and DEFAULTS/MOTION/ASSETS passes. This is how a consumer app could implement tag-based section filtering or A/B testing of section layouts without modifying pipeline internals.

- **Host config:** The entire defaults system is injectable through `setPeblorHostConfig`. This is how brands customize appearance, responsive behavior, and content guidelines without touching pipeline code.

- **After resolve:** The renderer is a separate package (`@pb/runtime-react`). You could replace it entirely -- with a different framework, a static HTML generator, a PDF renderer -- without touching `@pb/core`.

- **Import/export:** The extensions package (`@pb/extensions`) defines plugin interfaces for importing from external sources (Figma, CMS) and exporting to external targets (CMS, static files). These operate on complete pages, not pipeline internals. More in the [extensions doc](sdk-extensions-catalog.md).

This design is intentional. Adding extension hooks inside the pipeline would make it harder to reason about what happens in what order. The pipeline is kept simple and predictable: load, validate, expand, resolve, render. Each stage does exactly one thing, and no stage can be intercepted or reordered by external code. When you're debugging a rendering issue, you know the pipeline ran its five stages in order, and the bug is in one of them.

## Caching

The expand stage has an in-memory cache at `packages/core/src/internal/expand-cache.ts`. It hashes the page source files (the page JSON, sidecar sections, and presets) and caches the expanded result by slug plus hash. On subsequent requests for the same page, if none of the source files have changed, the cache returns the previously expanded result.

The cache is invalidated when any source file for that page changes -- the page JSON, any sidecar section file, or any preset the page references. The hash is recomputed on every request, so cache invalidation is automatic. There's no TTL-based expiration, no manual cache-busting, no stale-data window.

The cache is purely an optimization for SSR and build-time rendering. It's not persisted across process restarts -- when the server restarts, the cache starts empty. It's also process-local, so in a multi-process deployment each process has its own cache. This is fine because the cache is fast to warm up (a few hundred milliseconds per page) and the hit rate is high for pages rendered frequently.

---

Back to [contracts.md](contracts.md). Next: [sdk-extensions-catalog.md](sdk-extensions-catalog.md).
