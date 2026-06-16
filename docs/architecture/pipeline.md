# The five-stage pipeline

Every Peblor page goes through the same five stages from disk to DOM. No shortcuts, no VIP lanes, no exceptions. A JSON file goes in one end and rendered HTML comes out the other.

Each stage is a pure function: data in, data out, no side effects, no surprises. You could run the first four stages in a Node script on a laptop and the output would look identical to what the production server produces. (We do this in tests. Every day. It works.)

The pipeline is framework-agnostic through stage four. The core package has exactly zero React or Next.js imports. Stage five happens to use React because browsers expect DOM elements, not JSON objects, but the first four stages have no idea what's coming next. They do not care. Their job is turning JSON into a resolved, browser-ready data structure. Period.

---

## Stage 1: LOAD

**What goes in:** A URL slug like `/about` or `/presets/cards-basic`.

**What comes out:** A complete page object where every preset has been resolved into concrete fields, every sidecar section has been inlined, and every global module has been merged in. The page is fully self-contained and ready for validation.

**Where the code lives:** The entry point is in the `load/` subdirectory of the core package's internal modules.

**Why this stage exists:** JSON files can't reference other JSON files. A page that says "use the demo-hero preset" has made a promise it can't fulfill on its own. Someone has to go find that preset in the `content/presets/` directory, pull its fields into memory, and merge them into the definition. That someone is the load stage. Without it, every other stage would need to understand file I/O and preset resolution — exactly the kind of cross-cutting concern that belongs in exactly one place.

### How it works

The loader takes a slug, resolves it to a real file path under `content/pages/`, and reads the raw JSON. A path traversal check makes sure nobody escapes the content directory with a cleverly crafted slug. (Nice try.)

Once the JSON is in memory, the loader does four things, all in parallel where possible:

**First, it discovers definitions.** The page's `definitions` dictionary is read from its `index.json`. But not every section lives inline — some live in sidecar files alongside the page directory. The hydrator discovers those sidecar files and inlines their contents, so a page can stay small while composing from larger building blocks.

**Second, it loads presets.** Preset files live under `content/presets/`, organized by category. The loader walks every referenced directory, reads every JSON file, and merges the whole lot into a single flat namespace. Each file becomes one key in a global preset dictionary. This is why preset keys must be globally unique — two files with the same key would collide silently, and one would simply eat the other.

**Third, it resolves preset references.** With definitions and presets both in memory, the resolver walks every definition block and shallow-merges any referenced preset using RFC 7396 merge-patch semantics. A preset can reference another preset — the resolver handles that recursively, including nested definitions dictionaries in element group sections. If a preset references back to one already in the chain, the resolver detects the cycle and produces a clean diagnostic. No stack overflows. No infinite loops. Just a message: "these presets form a cycle."

**Fourth, it merges global modules.** Module configurations from `content/modules/` get merged into definitions. These are self-contained player configs — video players, audio players — with their own key bindings, gesture regions, and feedback chrome. All data, no code.

---

## Stage 2: VALIDATE

**What goes in:** The hydrated page from stage one — all presets resolved, all sidecars inlined, ready to be checked.

**What comes out:** Either a validated, type-safe page object, or a list of structured diagnostics explaining what's wrong and exactly where.

**Where the code lives:** The validation entry point is exported from the core package's `stages` module, which calls the canonical Zod schema from the contracts package.

**Why this stage exists:** JSON has no type system. A string field where a number belongs, a missing required key, a reference to a definition that doesn't exist — these are all silent failures in raw JSON. Parsers don't care about your data model. They'll cheerfully return `null` for a missing field and let whoever reads it next figure out something is wrong. The validate stage catches these problems before they reach the renderer, which would cheerfully crash with a cryptic error.

### How it works

Validation uses Zod 4's `safeParse` — it never throws. A valid page produces a clean result with an empty diagnostics array. An invalid page produces a list of diagnostic objects, each containing four fields:

- A machine-readable code like `PB_SCHEMA_ISSUE` so automated tools understand the problem without parsing English.
- A severity level — error, warning, or info — so you decide what blocks a build and what's just advisory.
- A JSON pointer like `$.definitions.hero.type` that takes you straight to the offending field.
- A human-readable message explaining what was wrong and what value was received.

The schema itself, `peblorSchema`, is a discriminated union that understands the full shape of a Peblor page: top-level metadata, the section order array, the definitions dictionary, section type rules, element type rules, and cross-reference validation. The cross-reference checks use Zod's `superRefine` mechanism, which validates relationships between fields after the basic type checks pass — so every key in an element order array must resolve to a definition that actually exists, and every trigger action payload must reference an element that's actually on the page.

There are two validation paths. The synchronous version works with inline presets only — useful for quick checks and unit tests. The async version also loads global presets from disk first, mirroring what the full runtime pipeline does.

---

## Stage 3: EXPAND

**What goes in:** A validated page object where everything is type-checked and structurally sound.

**What comes out:** A resolved background block and a flat array of section objects — all elements inlined, defaults applied, and entrance motions expanded to concrete keyframes.

**Where the code lives:** The main expand function lives in the core package's internal modules.

**Why this stage exists:** The page JSON stores elements as named keys in definitions and references them by string in element order arrays. That indirection is great for authoring — you can reference the same element from multiple sections — but the renderer wants concrete objects, not treasure hunts. Expansion is also where the pipeline fills in everything the content author didn't specify: default heading sizes, button styles, entrance motion keyframes. By the time expansion is done, there are no more question marks.

### How it works

The expand stage does its work in a few sequential passes, each building on the one before:

**It builds the display order.** The `sectionOrder` array is concatenated with any trigger sections and reduced to a single ordered list. This is the definitive rendering sequence — every section appears once, in the exact order it should be drawn.

**It resolves the background.** The `bgKey` field, if set, is looked up in definitions and type-checked against known background types. If the key doesn't exist or the referenced definition isn't a background type, the page gets no background — a clean `null` rather than a silent fallback that would be wrong.

**It inlines elements.** For each section, the element order array — which can be a responsive object with separate mobile and desktop variants — is resolved against the combined definitions dictionary. Each key is looked up, type-checked, and placed into the section's elements array as a concrete object.

**It resolves trigger payloads and column namespaces.** Trigger actions that reference definition keys are resolved. Column sections get their child element namespaces applied.

**It applies builder defaults.** Every element variant — heading size, button style, image aspect ratio — has a set of defaults that come from an injectable host configuration rather than hardcoded constants. If a heading doesn't specify a variant, the expander applies one based on context. This is how different brands get completely different default looks without changing any component code.

**It resolves entrance motions.** Motion presets are just strings — `fade`, `slideUp`, `blurIn` — but the renderer needs keyframes. The resolver converts each named preset into a full framer-motion keyframe object: initial state, animate state, transition config, viewport trigger settings, all computed server-side. The client never opens the motion presets file or does a lookup by name. It receives the expanded keyframes directly.

**It precompiles theme strings.** Colors and fills with light/dark variants get compiled to CSS `light-dark()` functions. Rich text gets sanitized. Button loop animations get their CSS precomputed. All of this is done once, server-side, so the client never has to do string manipulation or data transforms.

---

## Stage 4: RESOLVE

**What goes in:** The expanded sections and background from stage three — all references resolved, all defaults applied, but still using raw asset paths.

**What comes out:** The same structure, but every asset URL is now a signed CDN URL, every image has responsive srcSet variants, and every theme-aware color has been resolved to CSS values.

**Where the code lives:** The asset resolution function is in the core package's internal modules.

**Why this stage exists:** `images/hero.jpg` is not useful to a browser. It needs to become a full CDN URL with an authentication token. Images need multiple resolution variants so the browser can pick the right one. Theme-aware values like `light: "#fff", dark: "#111"` need to become `light-dark()` CSS functions. This stage makes the data browser-ready — after this point, you could hand the output to any renderer on any platform and it would have everything it needs.

### How it works

The resolve stage walks every section, every background, and every background transition to do four things:

**It collects asset references.** It builds a set of every asset key used anywhere on the page — images, videos, background fills — so it knows exactly what needs authentication before signing anything.

**It signs CDN URLs.** Each asset key is validated against CDN patterns and the URL builder constructs the full authenticated URL. By the time a browser requests an image, the URL includes everything needed to serve it securely.

**It computes responsive image sizes.** Image elements get responsive `srcSet` attributes computed based on container width estimates from the section type and viewport width. Multiple image widths are generated — the browser picks the right one at render time based on actual viewport and device pixel ratio.

**It resolves theme strings.** Background fills, border colors, and any other property with light/dark values get resolved to CSS `light-dark()` functions. The result is CSS the browser can evaluate without any JavaScript. Just native CSS theming.

**It builds the background definitions map.** Background definitions get extracted from the page's definitions dictionary, their assets resolved, and returned separately. This separate map feeds the runtime's background transition system, which swaps between backgrounds as the user scrolls.

---

## Stage 5: RENDER

**What goes in:** The resolved page data from stage four, plus overlay sections (header, footer, navigation), any modals the page references, and the page metadata stripped for client consumption.

**What comes out:** A rendered React tree the browser can paint.

**Where the code lives:** The main renderer lives in the runtime package. Section and element component dispatch maps live alongside it.

**Why this stage exists:** Data doesn't render itself. Stage four produces a complete, browser-ready data structure, but it's still just objects. Something has to translate those objects into actual DOM elements. That something is stage five.

### How it works

The orchestration starts before rendering. The `getPeblorPropsFromPage` function ties stages one through four together: it loads the page, expands it, applies defaults and motions, resolves assets, then loads overlays and modals. Overlays (header, footer, navigation) are loaded separately from the page definition and appended to the render output — so the page JSON never worries about chrome; overlays apply globally based on the page's configuration.

The renderer itself is a client component. It receives the resolved data and produces the full page tree:

**It sets up background transitions.** The trigger system manages which background is active, tracks scroll-driven transitions, and provides section-level overrides.

**It renders the current background.** Backgrounds are lazy-loaded through dynamic imports to keep the initial bundle small.

**It walks sections in order.** Each section gets its own error boundary. If a section fails to render, the error boundary catches it and that section becomes a no-op. The rest of the page keeps going. A broken section never takes down the whole page.

**Each section renders its elements in sequence.** Every element goes through several layers: an entrance animation wrapper (if the element has a motion preset), an exit animation wrapper, a gesture motion wrapper for hover and tap interactions, and finally the actual component that renders the element's content.

Dispatch is a simple lookup map — a plain object mapping type strings to React components. Section types are registered in one map, element types in another. No dependency injection, no decorators, no registry pattern. Adding a new type means touching exactly two places: the Zod union in the contracts package and the component map in the runtime package.

Heavy interactive elements like 3D scenes, Rive animations, Lottie, tabs, and drag interactions use the same lazy-load pattern as backgrounds — they only load when the page actually needs them. The initial bundle stays lean.

---

## Pipeline diagram

There's a visual flowchart of all five stages in `docs/assets/pipeline.mmd` (and a rendered SVG at `docs/assets/pipeline.svg`) if you prefer moving boxes to moving prose.

---

Back to [overview.md](overview.md). Next: [data-model.md](data-model.md).
