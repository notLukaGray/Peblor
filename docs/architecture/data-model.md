# How Peblor models pages and content

Pages in Peblor are pure JSON. Every section, element, background, animation, and trigger is a named block in a flat dictionary. There is no deeply nested page tree, no slot-within-slot-within-slot hierarchy, and no JSX for a content author to touch.

The data model orbits three principles that most systems treat as trade-offs but here play nice together: **mergeability** (two pages should combine without a fight), **verifiability** (broken structure should be obvious, not hiding), and **swappability** (swap one preset for another and the page just works).

---

## The flat-dictionary model

Every page has exactly two structural primitives.

There is a render-order array called `sectionOrder`. It is the only thing in the entire page that cares about sequence. Everything else is unordered.

And there is a flat dictionary called `definitions` where every key in `sectionOrder` resolves to a definition block. That is the whole structure. No nesting pages inside pages, no recursive tree of containers, no slots within slots.

### Why flat instead of nested

Deep trees look great on a whiteboard. You draw boxes, draw arrows, and it feels very architectural. Then someone needs to change one property on a component six levels down and suddenly you are either reproducing the entire parent chain or writing a patch function that knows the tree's shape. Both options are fragile and nobody remembers how they work six months later.

A flat dictionary with merge-patch semantics means you override exactly what you want and nothing else changes. Want to swap the heading text on a section that inherited everything from a preset? Set the heading text. That is it. The rest carries over untouched. Merge two flat objects, update the order array if you need to, and move on with your day.

Flat also makes validation boring in the best way. Every key in `sectionOrder` must appear in `definitions`. Every definition block has a type that determines what schema applies. The cross-reference check is a set-membership test. No recursive tree walking to find orphaned nodes, no "where did this component come from" debugging sessions at 4 PM on a Friday.

### The same pattern, one level deeper

Inside a section that contains elements (like a `contentBlock`), the same pattern appears again. The section has an element-order array and its own nested definitions map. Element groups follow the same structure. But it never goes further than two levels, and that is a deliberate ceiling.

Two levels, not one, because sections and elements are fundamentally different things with different schemas and different renderers. A section is a container that provides layout context. An element is a piece of content: text, image, button, video. They need to be separate conceptual layers. Anything beyond those two layers would be adding complexity for no real gain.

---

## How presets compose

Presets are Peblor's secret sauce. They are standalone JSON files that bundle a chunk of a page definition -- a section, a card, a typography style, a background -- into something reusable. A page imports them by name, overrides whatever it needs, and the system merges the rest automatically.

Think of them less like templates and more like mixins that solve merge conflicts by having a clear set of rules.

### The merge rules

The merge resolution lives in one file and follows three rules, each with a clear rationale:

**Objects merge recursively.** If both the preset and the local block have a `definitions` key, they merge key by key. Local keys override preset keys at every level. This is how you import a full section from a preset but swap out the heading text: you override just the heading key, and everything else from the preset stays put.

**Arrays replace entirely, with exactly one exception.** If the preset provides an element-order array and your local block has one too, the local one wins completely. No merging, no concatenation, no diffing. Arrays have order, and merging ordered things predictably is a fool's errand -- so the system does not try.

The one exception is the `elements` array inside a definition block. There, local elements **append** after preset elements instead of replacing. This lets you add items to a section from a preset without reproducing the full array. The default rule is replacement; the exception is additive. Both are deliberate.

**Scalar values are last-write-wins.** Whatever the local block sets overrides the preset. Whatever the preset sets fills in whatever the local block left unspecified. No three-way merge, no conflict resolution step. The code that handles all of this is refreshingly short for how much work it does.

### Recursive composition

A preset can reference another preset. When that happens, the resolver walks the chain, merging each preset's fields in sequence. The preset you reference gets its own presets resolved first, then its fields merge into your definition, and then your local overrides apply on top.

This means you can build a hierarchy of presets -- a basic card, a featured-card that extends it, a product-card that extends that one -- without the fragility of class-based inheritance. Each level adds or overrides specific fields, and you can always trace which field came from where.

Both sides of a merge get resolved before they meet, so a local override that references a preset works the same as a top-level one. The recursive walk handles nesting at any depth: sections with elements, elements with groups, groups with more elements. Each level follows the same three rules independently.

### Circular reference detection

Because presets can reference presets, the resolver keeps a "currently resolving" set. If it encounters a key it has already started working on, it stops with a diagnostic that lists the full cycle. Circular references are always a mistake -- there is no valid reason for preset A to reference preset B which references preset A -- so the system fails fast and tells you exactly which chain is looping.

---

## Why preset keys have to be globally unique

Every preset file gets loaded into a single flat dictionary. The loader walks each referenced directory, reads every JSON file, and assigns each definition by its filename into the shared namespace. A preset called `hero` in `bg/hero.json` and a preset called `hero` in `card/hero.json` will collide. The last one loaded wins. No namespacing, no scoped lookup.

This is a constraint, and it is worth the trade-off.

If presets were scoped, a reference would need the scope qualifier -- something like `bg/hero` or `card/hero`. Every reference gets longer. Preset-to-preset references need to know their own scope to resolve relative paths. Cross-category references become especially painful: full paths for anything that crosses a boundary.

The global namespace keeps references short, readable, and trivially greppable. Searching for `preset: "hero-title"` across the entire project takes under a second and finds every usage. With scoped keys, you would need regex patterns that account for every possible scope qualifier, and you would never be quite sure you caught them all.

If you do have a collision, the system tells you exactly which files are conflicting. Move one of them to a unique name. It is a minor inconvenience that prevents a major source of complexity.

---

## Light and dark mode per property

Colors in Peblor are not CSS class toggles. There is no `.dark` wrapper class that flips every variable. No media queries stashed in component code. Instead, any color or fill value can be a theme-aware object with up to three keys: a fallback `value`, a `light` variant, and a `dark` variant.

This object is valid anywhere a color is expected: section background fills, text colors, heading colors, button backgrounds, background layers, overlay opacities, border gradients. A plain CSS string also works and gets used for both themes. The schema accepts either.

What makes this powerful is that each property resolves independently. You can have a heading that is dark in light mode and light in dark mode, nested inside a section that does the opposite. There is no master theme toggle that flips everything. Every color makes its own choice.

### How it becomes CSS

The conversion from theme objects to CSS happens entirely on the server during the precompile and resolve pipeline stages. The system walks every section and element, finds theme-aware color objects, and emits native CSS `light-dark()` function calls. By the time the styles reach the browser, they are standard CSS. No JavaScript runtime checks, no React context providers for "the current theme."

This approach means zero client-side cost for theming. The browser handles the `light-dark()` function natively, switching between values based on the system preference without a single line of JavaScript.

### Why OKLCH and color-mix

Colors use the OKLCH color space. The reason is perceptual uniformity: in OKLCH, a 10% lightness change actually looks like a 10% lightness change to the human eye. In sRGB, the same numerical change looks completely different depending on the starting color. OKLCH also makes color manipulation predictable -- adjust chroma or hue by a fixed amount and get consistent results across the entire color range.

The `color-mix()` CSS function, always paired with `in oklab` as the interpolation space, blends colors at the CSS level rather than in JavaScript. A background that needs to be "70% theme color A, 30% theme color B" becomes a CSS function call that the browser evaluates at paint time. Across the project, there are over a thousand of these `color-mix()` usages in presets and page content -- all of them running in the browser's CSS engine, not in framework code.

---

## Density

Three density levels exist: comfortable, balanced, and compact. Each level multiplies spacing and border-radius values by a specific factor.

| Level       | Space multiplier | Radius multiplier |
| ----------- | ---------------- | ----------------- |
| comfortable | 1.14             | 1.08              |
| balanced    | 1                | 1                 |
| compact     | 0.88             | 0.92              |

Balanced is the default -- space and radius both use a multiplier of 1, meaning no scaling. Comfortable pushes spacing to 1.14 and radius to 1.08, giving a more spacious feel. Compact shrinks spacing to 0.88 and radius to 0.92, packing things tighter.

At the CSS level, density works through two custom properties set on the page root element: one for the space multiplier, one for the radius multiplier. Any spacing or radius value declared as a CSS length gets wrapped in a calc expression that multiplies by the appropriate variable.

The wrapping logic checks whether a value is scalable -- pixels, rems, ems, viewport units, percentages, or calc/min/max/clamp expressions -- and only wraps those. Non-scalable values like `auto`, `fit-content`, or `0` pass through unchanged. Shorthand properties with multiple tokens, like a four-value padding, are scaled per-token individually.

The density level is set per-page through its metadata. If a page does not specify density, it defaults to balanced. A content author can prototype in balanced, then switch to compact by changing one field. Every spacing value and corner radius follows automatically. No hunting through CSS files.

---

## Where defaults come from

Visual defaults -- heading variants, button styles, image layout modes, gap sizes, padding -- come from a host-config object rather than being hardcoded in component files. A single adapter provides typed accessors for builder defaults and content guidelines.

A brand or project can call the configuration function to swap every default at once. This is how the same pipeline produces completely different-looking sites without changing any core code. The blue brand and the green brand check out the same runtime version, plug in different host configs, and get pages that look nothing alike. Element components have no opinion about what size a heading should be -- they render whatever the config says.

The host-config is lightweight by design. It does not duplicate the design token system. It provides variant mappings, default text alignments, border-radius preferences, and gap sizes -- the structural defaults that make a page look intentional out of the box. Everything else comes from the preset and theme systems.

---

## Where to go next

- [Architecture overview](overview.md) for the big picture if you haven't read it yet
- [Pipeline](pipeline.md) for how the flat-dictionary model flows through load, validate, expand, resolve, and render
- [Motion](motion.md) for the animation side of things
- [Content authors: presets](../content-authors/presets.md) for practical composition with presets
- [Content authors: sections and backgrounds](../content-authors/sections-and-backgrounds.md) for how sections use this data model
- [About these docs](../about-these-docs.md) for the doc philosophy and navigation
