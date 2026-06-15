# How Peblor models pages and content

Pages in Peblor are pure JSON. Every page lives in one file, and every visual output on that page — sections, elements, backgrounds, motion, triggers — is a named block in a flat dictionary. There's no deeply nested page tree, no slot-within-slot-within-slot hierarchy, and no JSX that a content author needs to touch.

The data model is designed around three principles that tend to pull in opposite directions in most systems, but here they reinforce each other: mergeability, verifiability, and swappability.

---

## The flat-dictionary model

Every page has exactly two structural primitives.

There's a render-order array — called `sectionOrder` — that tells the system what to draw and in what sequence. It's the only thing in the entire page that cares about ordering. Everything else is unordered.

And there's a flat dictionary — called `definitions` — where every key in `sectionOrder` resolves to a definition block. That's the whole structure. No nesting pages inside pages, no recursive tree of containers, no slots within slots.

### Why flat instead of nested

Deep trees look great on a whiteboard. You draw some boxes, draw some arrows connecting them, and it all feels very clean and architectural. But deep trees are terrible to override. If you want to change one property on a component six levels down, you have to either reproduce the entire parent chain or write a patch function that understands your tree's shape. Both options are fragile and annoying.

A flat dictionary with merge-patch semantics means you override exactly what you want and nothing else changes. You want to swap out the heading text on a section that inherited everything else from a preset? You set the heading text. That's it. The rest of the section carries over untouched. Merge two flat objects, update the order array if you need to, and move on.

Flat also makes validation straightforward. Every key in `sectionOrder` must appear in `definitions`, and every definition block has a type that determines what schema applies. The cross-reference check is a simple set-membership test. No recursive tree walking to find orphaned nodes, no "where did this component come from" debugging when something renders wrong.

### The same pattern repeats one level deep

Inside a section that contains elements — like a `contentBlock` — the same pattern appears again. The section has an element order array and its own nested definitions map. The structure is the same, just one level deeper. Element group containers follow the same pattern. But it never goes further than that. Two levels of nesting is the max, and that's a deliberate design constraint.

Why two levels and not one? Because sections and elements are fundamentally different things with different schemas and different renderers. A section is a container that provides layout context. An element is a piece of content — text, image, button, video. They need to be separate conceptual layers. But anything beyond those two layers would be overcomplicating things.

---

## How presets compose

Presets are standalone JSON files under `content/presets/`, organized by category into subdirectories — `bg/` for background presets, `card/` for card layouts, `type/` for typography, `layout/` for section structure, `player/` for media player configs, `ui/` for interface components, and a few others. A page imports them by listing which preset directories or files it needs in its `presets` metadata array.

When a definition block has a `preset` field, the system resolves that reference by merging the preset's content into the block. The merge follows a specific set of rules that's designed to be predictable and easy to reason about.

### The merge rules

Objects merge recursively. If both the preset and the local block have a `definitions` key, they merge key by key. Local keys override preset keys at every level. This is how you import a section from a preset but swap out its heading text — you override just the heading key in definitions, and everything else from the preset stays.

Arrays replace entirely. If the preset provides an element order array and your local block has one too, the local one wins completely. No array merging, no concatenation, no intelligent diffing. This is a deliberate choice — arrays have order, and merging ordered things in a predictable way is essentially impossible. If you want to reorder elements, you provide the full array.

Scalar values are last-write-wins. Whatever the local block sets overrides the preset. Whatever the preset sets fills in what the local block didn't specify. There's no "three-way merge" logic, no conflict resolution step. The resolution logic in `packages/core/src/internal/peblor-presets.ts` handles all of this — it's surprisingly short for how much work it does.

### Recursive composition

A preset can reference another preset. When that happens, the resolver at `packages/core/src/internal/peblor-presets.ts` walks the chain recursively, merging each preset's fields in sequence. The preset you reference gets its own presets resolved first, then its fields are merged into your definition, and then your local overrides are applied on top.

This means you can build a hierarchy of presets — a basic card preset, a featured-card preset that extends it with extra fields, a product-card preset that extends that one — without the fragility of class-based inheritance. Each level adds or overrides specific fields, and you can always trace exactly which field came from where.

The same file also handles the tricky case of nested definition objects inside element definitions. If both a preset and the local block define a section with their own element order and definitions arrays, they merge independently at each level.

### Circular reference detection

Because presets can reference other presets, the resolver tracks which keys it's currently resolving. If it encounters a key it's already started working on, it stops immediately with a diagnostic that lists the full cycle. The check lives in the `resolvePresetsDeep` function in that same presets file. Circular references are always a mistake — there's no valid reason for preset A to reference preset B which references preset A — so the system fails fast and tells you exactly which preset chain is looping.

---

## Why preset keys have to be globally unique

Every preset file under `content/presets/` gets loaded into a single flat dictionary. The loader, in `packages/core/src/internal/load/peblor-load-presets.ts`, walks each referenced directory, reads every JSON file, and assigns each definition by its filename minus extension into the shared namespace. A page's `presets` metadata array layers more on top, and then any inline preset definitions in the page's own JSON get merged in last.

This means a preset called `hero` in `bg/hero.json` and a preset called `hero` in `card/hero.json` will collide. The last one loaded wins. There's no namespacing, no scoped lookup. Every preset key across every category and every page has to be unique.

That sounds draconian until you think about what namespacing would actually cost. If presets were scoped, a reference would need to include the scope qualifier — something like `bg/hero` or `card/hero` — which means every reference gets longer and every preset-to-preset reference needs to know its own scope to resolve relative paths. Cross-category references become especially painful: you'd need full paths for any reference that crosses a category boundary.

The global namespace keeps preset references short, readable, and greppable. You can search your entire project for a string like `preset: "hero-title"` and find every single usage in under a second. If keys were scoped, you'd need to know which scope you were in to understand the reference, and searching for usage would require regex patterns that account for all possible scope qualifiers.

If you do have a collision, the error message tells you exactly which preset files are conflicting. Move one of them to a unique name. It's a minor inconvenience that prevents major complexity.

---

## Light and dark mode per property

Colors in Peblor are not CSS class toggles. There's no `.dark` class that gets applied to some wrapper and flips every variable. No media queries in component code. Instead, any color or fill value anywhere in the system can be specified as a theme-aware object with two values — one for light mode, one for dark mode, and an optional fallback.

This object is valid anywhere a color value is expected: section background fills, element text colors, heading colors, button backgrounds, background layers, overlay opacities, border gradients. The schema type accepts either a plain CSS string, which gets used for both themes, or the light-dark-fallback object.

### How the runtime resolves it

Each property independently picks the right value based on the user's system preference — but this resolution happens on the server side during the resolve stage, not in the browser. The resolve function at `packages/core/src/internal/peblor-resolve-assets-server.ts` converts these objects into CSS `light-dark()` function calls. By the time the CSS reaches the browser, it's native CSS theming. No JavaScript runtime checks, no React context providers for "the current theme."

This means you can have a heading that's dark in light mode and light in dark mode, nested inside a section that does the opposite. Each property behaves independently based on its own configuration. There's no master theme toggle that flips everything — every color makes its own choice.

### Why OKLCH and color-mix

Colors use the OKLCH color space. The reason is perceptual uniformity: in OKLCH, a 10% lightness change actually looks like a 10% lightness change to the human eye. In sRGB, the same numerical change looks completely different depending on the starting color. OKLCH also makes color manipulation predictable — you can adjust chroma or hue by a fixed amount and get consistent results across the entire color range.

The `color-mix()` CSS function lets the system blend theme values at the CSS level rather than in JavaScript. A background that needs to be "70% theme color A, 30% theme color B" becomes a CSS function call that the browser evaluates, not JavaScript running on every render.

---

## Density

Three density levels exist in Peblor: comfortable, balanced, and compact. Each level multiplies spacing and border-radius values by a specific factor.

Balanced is the default — space and radius both use a multiplier of 1, meaning no scaling. Comfortable pushes spacing to 1.14 times the default and radius to 1.08 times, giving a more spacious feel. Compact shrinks spacing to 0.88 and radius to 0.92, packing things tighter.

These multipliers live in `packages/contracts/src/peblor/core/page-density.ts`, which defines the three levels and their factors. At the CSS level, density works through two custom properties set on the page root element — one for the space multiplier, one for the radius multiplier. Any spacing or radius value declared as a CSS length gets wrapped in a calc expression that multiplies by the appropriate variable.

The logic that handles this wrapping lives in the same contracts file. It checks whether a value is a scalable length — pixels, rems, ems, viewport units, percentages, or calc/min/max/clamp expressions — and only wraps those. Non-scalable values like `auto`, `fit-content`, or `0` pass through unchanged. Shorthand properties with multiple tokens, like a four-value padding, are scaled per-token individually.

The density level itself is set per-page through its metadata field. If a page doesn't specify density, it defaults to balanced. A content author can prototype a page in balanced, then switch it to compact by changing one field. Every spacing value and corner radius follows automatically — no hunting through CSS files to find which values need adjusting.

---

## Where defaults come from

Every visual default in the system — heading sizes, button styles, image aspect ratios, text alignment rules — comes from a host-config object rather than hardcoded values scattered through component files. The adapter that exposes this config lives at `packages/core/src/internal/adapters/host-config.ts`. It provides functions that return the current defaults and content guidelines for each element type.

A brand or project can call the configuration function to swap every default at once. This is how the same pipeline produces completely different-looking sites without changing any core code. The blue brand and the green brand can check out the same version of the runtime, plug in different host configs, and get pages that look nothing alike. The element components themselves have no opinion about what size a heading should be — they just render whatever the config says.

---

## Where to go next

- [Architecture overview](overview.md) for the big picture if you haven't read it yet
- [Pipeline](pipeline.md) for how the flat-dictionary model flows through load, validate, expand, resolve, and render
- [Motion](motion.md) for the animation side of things
- [Content authors: presets](../content-authors/presets.md) for practical composition with presets
- [Content authors: sections and backgrounds](../content-authors/sections-and-backgrounds.md) for how sections use this data model
- [About these docs](../about-these-docs.md) for the doc philosophy and navigation
