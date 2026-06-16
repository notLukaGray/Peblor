# Inside the core pipeline

This is the guts of Peblor. The `@pb/core` package is a framework-agnostic content pipeline that turns JSON files into browser-ready page data. Zero React. Zero Next.js. Three thousand lines of TypeScript that don't know or care what happens after they produce their final data structure. You could swap the renderer for Vue, Svelte, a PDF generator, a smoke signal array — and everything before that swap stays exactly the same.

The pipeline is the product. The React renderer, the CLI, the MCP server — they're all infrastructure built around it.

---

## The conductor: `getPeblorPropsAsync`

The entire pipeline starts here. You give it a slug (`"/about"`), it gives you back a `PeblorPageProps` object with everything a renderer needs: resolved sections, signed CDN URLs, entrance motion keyframes, overlays, modals. One function call, five pipeline stages, a few hundred lines of orchestration.

What makes this interesting is the **two-phase split**. The orchestrator doesn't run all five stages in one monolithic function. It divides the work:

```
getPageAsync(slug)                → ResolvedPageWithDefinitions
getPeblorPropsFromPage(page, slug) → PeblorPageProps
```

The first function handles LOAD and EXPAND — getting JSON off disk, chasing preset references, inlining elements, and returning a mid-pipeline object. The second function handles everything after that: element defaults, entrance motion resolution, CDN URL signing, overlay and modal loading.

The split exists so callers can **intercept the mid-pipeline result**. The most common use case is tag filtering: load a page, inspect its tags, decide the user shouldn't see certain sections, remove them, then pass the modified result to the second stage. Without the split, you'd have to either duplicate the loading and expansion work or build a hacky post-processing system. With the split, you just modify the section array and call the next function.

`getPeblorPropsAsync` itself is just composition:

```typescript
async function getPeblorPropsAsync(slug, options) {
  const page = await getPageAsync(slug, options);
  return getPeblorPropsFromPage(page, slug, options);
}
```

It's not hiding complexity. It's sequencing pure functions in a clear order, and that order is visible in the source.

---

## What flows between the stages

The pipeline passes around a small set of data structures. Understanding these is more important than memorizing file paths.

**`Peblor`** — the raw parsed JSON. Section order, definitions (flat dictionary), metadata, presets. This is what comes off disk. Nothing has been resolved yet. Preset references are still strings.

**`ResolvedPageWithDefinitions`** — the output of `getPageAsync`. Every preset string has been chased down and merged. Sidecar section files have been inlined. Global module configs have been merged. Elements are still referenced by key strings in `elementOrder` arrays — they haven't been inlined yet. But the definitions dictionary is complete and self-contained. No filesystem access needed from here on.

**`{ bg, sections }`** — the output of `expandPeblor`. The background block is resolved (or null). Sections are flat arrays with concrete element objects inlined. This is the last structure that's still "pure JSON" — no defaults applied, no motions resolved, no URLs signed.

**`PeblorPageProps`** — the final output. Everything is resolved. Defaults are filled in. Motion presets are expanded to keyframe objects. Asset URLs are signed CDN paths. Overlays and modals are loaded and attached. The renderer never needs to look anything up or compute anything. It just dispatches.

The key insight: **each stage adds information the previous stage couldn't have known**. Load doesn't know about defaults because defaults come from the host config, not the page data. Expand doesn't sign URLs because signing needs environment variables available at render time. The pipeline is split exactly at the natural boundaries where new information sources enter the system.

---

## The actual stage sequence

If you trace through `getPeblorPropsAsync`, here's what actually happens in order:

### 1. LOAD (inside `loadPeblorByPathAsync`)

The slug gets validated against a regex that rejects path traversal — `../` tricks don't work here. The page's `index.json` is read. Then, sequentially:

- **Definitions are extracted** from the page JSON. Sidecar files (`hero.section.json` alongside `index.json`) are discovered and inlined. Inline definitions take priority over sidecar files.
- **Presets are loaded** from `content/presets/`. Every JSON file in the referenced preset directories becomes a key in a flat dictionary. If two files have the same key, one silently wins with a console warning.
- **Preset references are resolved** by walking every definition block and deep-merging any referenced preset onto it. The merge is deep, not shallow — nested definitions dictionaries in element group sections are merged recursively. Circular references are detected and produce a structured diagnostic instead of an infinite loop.
- **Global modules are merged** — video player and audio player configs from `content/modules/` get folded into definitions.

This sequence is sequential, not parallel. Presets need to be in memory before they can be resolved. Definitions need to be loaded before modules can be merged. The load stage doesn't parallelize because there's nothing to parallelize — each step depends on the previous one.

### 2. VALIDATE (inside `validatePeblor`)

Zod 4's `safeParse` against `peblorSchema` from `@pb/contracts`. Never throws. Returns either the parsed object with types inferred, or a list of `PeblorDiagnostic` objects.

The validation checks three layers:

- **Page shape** — section order is an array of strings, definitions is a dictionary, metadata fields have the right types
- **Type rules** — each section and element type has its own required fields. A `sectionColumn` without `columnDefinitions` fails. An `elementImage` without `src` fails.
- **Cross-references** — every key in `sectionOrder` must exist in `definitions`. Every key in `elementOrder` must point to an element definition, not a section or background. The cross-reference checks use Zod's `superRefine` mechanism, which runs after the basic type checks pass.

There are two validation paths. `validatePage` (sync) works with inline presets only — fast for unit tests. `validatePageAsync` (async) loads global presets from disk first, mirroring the runtime pipeline. If you're validating a page that uses presets, use the async version.

### 3. EXPAND (inside `expandPeblor`)

This is where indirection becomes data. The page stores elements as named keys in `definitions` and references them by string in `elementOrder`. The expand stage converts all those string references into actual objects.

It does this by iterating the display order — which concatenates `sectionOrder` with any trigger section references — and for each section:

1. Looks up the background via `bgKey`. If the key doesn't exist or doesn't point to a background type, the page gets no background. Null, not a silent fallback.
2. Resolves the section's `elementOrder` (which can be a plain array or a responsive object with separate `mobile`/`desktop` variants) against the definitions dictionary. Each key is looked up, type-checked, and placed into the section's elements array.
3. Applies element IDs and module configs via `applyElementIdsAndModules` — elements get namespaced IDs, and elements with a `module` string get their module configuration inlined.
4. Namespaces column sections so child elements in multi-column layouts have unique reference keys.
5. Resolves trigger action payloads — any action payloads that reference definition keys get those references chased down.

Missing element keys are skipped with a diagnostic. The section still renders with whatever elements could be resolved. The pipeline is designed to degrade gracefully, not crash on the first missing reference.

This is also where `buildPageForExpansion` is called, which promotes preset entries into definitions for any `sectionOrder` key that lacks an explicit inline definition. It's a last-resort fallback: if a section key appears in `sectionOrder` but has no definition, the loader checks if a preset with that key exists and uses it.

### 4. DEFAULTS + MOTION (inside `getPeblorPropsFromPage`)

After expansion, the pipeline applies element defaults, resolves entrance motions, precompiles rich text, and precompiles theme strings — all in **a single tree walk** via `transformElementsInSectionsCombined`.

This is an important optimization. Each of these transforms needs to visit every element in the page. Doing them sequentially would mean N tree walks. Instead, the pipeline composes them into a single walk: for each element, apply defaults, then entrance motions, then exit motions, then rich text precompilation, then button loop CSS, then theme strings. One pass, six transforms, one tree walk.

The element transformer handles recursion into nested structures automatically: `elementGroup` and `elementInfiniteScroll` sections, `moduleConfig` slots, and `revealSection` branches. If you add a new element type that contains nested elements, you register it in `NESTED_SECTION_ELEMENT_TYPES` and the transformer picks it up — no per-transform changes needed.

The defaults system (`applyDefaultsToElement`) dispatches by element type. Each type has its own defaults function: headings get size defaults, images get aspect ratio defaults, buttons get style defaults. The defaults come from the injectable host config, not from hardcoded constants. A heading with no `variant` field gets its size from whatever the current brand has configured. Swap the host config, and every heading on every page looks different — no code changes.

Entrance motion resolution (`resolveEntranceMotionForSingleElement`) converts named presets like `"fade"` or `"slideUp"` into concrete framer-motion keyframe objects: `initial`, `animate`, `exit`, `transition`, viewport trigger settings. All computed server-side. The client never looks up a motion preset by name.

### 5. RESOLVE (inside `resolvePeblorAssetsOnServer`)

All asset references — image `src` fields, video `poster` fields, background fill `image` fields — are collected, validated, and signed. This is where raw paths like `"images/hero.jpg"` become fully qualified CDN URLs with authentication tokens.

The resolver does five things:

- Collects every asset reference across sections, backgrounds, and background transitions
- Signs each CDN URL with an HMAC token and expiration timestamp
- Computes responsive image `srcSet` attributes based on container width estimates
- Resolves theme-aware `{ light, dark }` values to CSS `light-dark()` functions
- Builds a separate background definitions map for the scroll-driven background transition system

After resolution, overlay sections are loaded (header, footer, nav) and any modals the page references are resolved. These are appended to the render output as separate structures — the page JSON never worries about chrome.

---

## Working with the cache

The expand stage has an in-memory cache that's worth understanding because it affects how changes propagate.

The cache keys by route plus a hash of source file modification times. On cache miss, the pipeline runs normally and stores the result. On cache hit (same route, same file hashes), the pipeline returns the cached result without touching disk.

The hash only covers the page's own `index.json` and the preset files the page actually references — not every preset on disk. This means editing an unrelated preset doesn't invalidate every cached page.

In development mode, the cache switches to a 5-second TTL and skips file hashing entirely (because `statSync` on every preset directory blocks the event loop during HMR). Entries expire quickly enough that a hot reload picks up new changes within one refresh cycle.

The cache is process-local and not persisted. Each server process warms its own cache. For SSG builds this doesn't matter — every page is rendered exactly once per build. For SSR with ISR, the cache fills on first request and stays warm for subsequent ones.

---

## Adding to the pipeline

The pipeline stages are composed as pure functions called in sequence. There is no plugin system for injecting custom stages into the middle. This is deliberate — it keeps the pipeline predictable. You always know what ran and in what order.

Extension points exist at the boundaries:

- **Before defaults/motion/assets:** The `transformSections` option on `getPeblorPropsFromPage` lets you modify the section array before the defaults/motion/asset passes. This is where tag filtering, A/B testing, or section reordering would go. You get the expanded sections, you transform them, the pipeline picks up the transformed result.

- **Host config:** The entire defaults system is injectable via `setPeblorHostConfig`. Every element type's default variant, every size, every style — all set from one config object at app startup.

- **Element defaults:** To add defaults for a new element type, add a function to the dispatch map in `applyDefaultsToElement`. The type dispatched is the element's `type` string, which must also be registered in the contracts package's Zod union.

- **After resolution:** The renderer is a separate package. Replace it entirely without touching `@pb/core`. This is the escape hatch for any rendering approach that doesn't involve React.

---

## Debugging a pipeline issue

When a page fails, the pipeline produces structured diagnostics — arrays of `PeblorDiagnostic` objects with a code, severity, JSON pointer path, and human-readable message. These are the first thing to check.

Common failure modes and where to look:

| Symptom                                       | Likely stage | What to check                                                                                                                   |
| --------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Preset values not showing up                  | LOAD         | Is the preset key globally unique? Does the preset file exist in the right directory?                                           |
| Missing elements in rendered page             | EXPAND       | Check `elementOrder` keys against `definitions`. Are the keys spelled right? Do they point to element types, not section types? |
| Element looks wrong (wrong size, wrong style) | DEFAULTS     | Is the host config set at app startup? Does the element type have a defaults function registered?                               |
| Animations don't play                         | MOTION       | Is the motion preset string valid? Does it exist in `content/framer-motion/`?                                                   |
| Images don't load                             | RESOLVE      | Are the asset keys valid? Is the CDN base URL configured? Are environment variables set?                                        |
| Page doesn't render at all                    | VALIDATE     | Run `validatePageAsync` directly. The diagnostics will tell you exactly what's wrong and where.                                 |
| Overlay not showing                           | RESOLVE      | Check the page's `disableOverlays` array. Is the overlay listed there? Is the overlay file in `content/site/overlays/`?         |

The diagnostics are designed for tooling, not just humans. The `path` field uses JSON pointer syntax (`$.definitions.hero.type`), which editors and CI systems can parse and use to highlight the exact location of the problem.

---

## Testing patterns

Tests use Vitest with happy-dom. The pattern is straightforward: construct a minimum viable page object, run it through the pipeline stage you're testing, assert on the output.

```typescript
// A minimal page needs just enough structure to exercise the code path.
const page: Peblor = {
  slug: "test",
  title: "Test",
  sectionOrder: ["hero"],
  definitions: {
    hero: { type: "contentBlock", elements: [] },
  },
};
const { sections } = expandPeblor(page);
expect(sections).toHaveLength(1);
```

The test files mock nothing that isn't a side effect. The pipeline functions are pure data transformations, so there's nothing to mock. File I/O tests use real temp directories with `fs.writeFileSync` + `fs.unlinkSync` in try/finally blocks. There are no mock filesystem libraries.

Key test files and what they cover:

- **`peblor-load.test.ts`** — slug validation (path traversal rejection), page discovery, preset loading, sidecar hydration. Tests that `loadPeblorAsync("..")` returns null.
- **`peblor-expand.test.ts`** — background resolution, element inlining, trigger payload URL resolution, invalid section order entries, empty element orders.
- **`peblor-apply-element-defaults.test.ts`** — per-type default application. Tests that an elementImage without `aspectRatio` gets one. Tests that an elementButton without `style` gets one.
- **`peblor-resolve-entrance-motions.test.ts`** — motion preset resolution, viewport trigger settings, loop animation merging.
- **`peblor-resolve-assets-server.test.ts`** — CDN URL signing, responsive srcSet computation, theme string resolution. Also tests immutability (that the resolver doesn't mutate its inputs).
- **`peblor-presets.test.ts`** — circular reference detection, deep merge behavior, missing preset handling.
- **`expand-cache.test.ts`** (tested implicitly through the load/expand tests) — cache hit/miss, hash invalidation.

The integration test pattern chains stages together:

```typescript
const result = validatePage(page);
expect(result.valid).toBe(true);
expect(result.page).not.toBeNull();

const { bg, sections } = expandPeblor(result.page!);
// ... assert on expanded structure
```

---

## The host config

Every element default in the system is injectable through `setPeblorHostConfig`. This is how Peblor stays brand-agnostic: a different consumer app provides different defaults, and every page rendered through that app picks them up automatically.

The host config has two sections:

**`pbBuilderDefaults`** — variant-level defaults for every element type. Split across four files under `internal/defaults/`: types (~350 lines), values (~540 lines), animation helpers (~590 lines), and a barrel re-export. Total about 1,550 lines of type definitions and default value factories. This covers heading sizes, button styles, image aspect ratios, video chrome, spacer heights, input field styles, 3D scene defaults — everything a content author might omit.

**`pbContentGuidelines`** — higher-level rules: default text alignment, frame spacing, button padding, border radius. These apply across element types rather than to individual variants.

The demo consumer in `apps/web` provides its own host config at startup. A different brand swaps the whole config. The pipeline code never changes.

---

## The migrate path

Schema version upgrades live in `migratePage`. It checks the page's `contractVersion`, determines what transforms to apply, stamps the new version, and validates the result.

Currently the only migration path covers 0.x to 1.0.0: stamp the contract version and optionally inject an `assetBaseUrl`. The migration infrastructure supports arbitrary version-pair handlers — if a future schema change renames a field or restructures a definition shape, this is where the conversion logic goes.

There's a `noopFallback` (the "identity" transform when `fromVersion === toVersion`) and an error path when no handler exists for the requested version pair. The migration system is designed to be non-destructive: it produces a new object rather than mutating the input, and it validates the output before returning it.

---

## The plugin architecture (or lack thereof)

There is no plugin system for injecting custom stages into the pipeline. This is intentional, and it's worth understanding why.

Every extension hook adds complexity. Every interception point makes the pipeline harder to reason about. The Peblor pipeline keeps extension at the boundaries rather than in the middle: transform callbacks, host config, and a replaceable renderer. That's it.

The result is a pipeline you can trace through from beginning to end without wondering "did a plugin modify this?" When you're debugging a rendering issue, you know the pipeline ran exactly five stages in exactly this order, and the bug is in one of them.

---

Back to [contracts.md](contracts.md). Next: [sdk-extensions-catalog.md](sdk-extensions-catalog.md).
