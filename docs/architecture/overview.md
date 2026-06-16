# The Architecture Overview

## Another Content Platform? We Know.

But here's the thing: nobody has actually fixed the core problem. The CMS market is a graveyard of products that were fine at managing content and terrible at getting it onto a screen. You'd write the data model, wire up the API, negotiate for more editor seats, build your own image optimization wrapper for the third time, and six months later you're maintaining a thousand lines of glue code that has nothing to do with what you set out to build.

Peblor is what happens when you get fed up enough with that pattern to do something about it.

It's not a CMS -- that word comes with baggage about databases, dashboards, and WYSIWYG editors that sync to nowhere. It's not a new framework -- the world has enough of those. And it's definitely not a site builder -- those trap you in someone else's idea of what a website should look like.

Peblor is a pipeline. You put structured JSON files in one end. Rendered pages come out the other. The pipeline is the product. Everything else -- the React renderer, the CLI, the Figma plugin -- is optional infrastructure built around it.

## Why JSON

Because data and code are different things that shouldn't live in the same file.

JSON is portable. You can version it in git, diff it in a pull request, validate it against a schema, and render it with anything that can read a dictionary. A React component can do exactly none of those things. If you wake up tomorrow and decide Next.js was a terrible life choice, your JSON content walks out the door with you untouched. Your JSX stays behind.

The bet is simple: content should look like content, and code should look like code. A content author should never need to open a TSX file. A page should survive a framework migration. If you want to swap React for Svelte or web components or a PDF generator, the pipeline doesn't care. The content is just data.

This isn't a rejection of code as a tool -- the pipeline itself is plenty of code. But the boundary between "content you edit" and "infrastructure that renders it" is sharp, and Peblor enforces it.

## The Ideas That Hold It Together

### Flat dictionaries, not deep trees

Every Peblor page has exactly two structural parts: a render-order array telling the system what to draw, and a flat dictionary of named definition blocks telling it what each thing is. No nested component hierarchies. No slots inside slots inside slots.

Why flat? Because deep nesting makes everything harder. If you want to change one property on a component six levels deep, you need to reproduce the entire parent chain or write a patch function that understands your tree's shape. With a flat dictionary and merge-patch semantics, you override exactly what you want and nothing else changes. Merge two dicts, update the order array, move on.

Flat also makes validation trivial. Every key in the order array must exist in the definitions map. That's a simple set-membership check -- no recursive tree-traversal to find orphaned nodes. The same pattern repeats one level deep inside sections that contain elements, but it never goes further than that. Two levels of nesting, by design, and that's enough.

The full data model, including how presets compose on top of this structure, has its own doc.

### Presets compose by merging, not inheriting

A preset is a JSON file with some fields. Applying one means shallow-merging those fields onto your definition block: local values win, preset values fill the gaps. That's the whole rule. No class hierarchies, no `super()` calls, no fragile chains that break when someone reorders them.

Recursive composition works the same way -- a preset can reference another preset, and the system walks the chain merging at each level. Circular references get detected and reported as clean diagnostics rather than stack overflows. And since every preset key lives in a single global namespace, any reference is a simple name lookup with no scope qualifiers to parse.

You can trace every field to its source. You can explain the override rules to someone in ten seconds. Most systems cannot make either of those claims.

### Motion lives in the data layer

Entrance animations, hover gestures, scroll-driven parallax, background transitions -- every motion in the system is JSON data, not imperative JavaScript. The runtime receives keyframes it didn't compute and just plays them back.

This means a motion designer can tweak an entrance preset by editing a JSON file, no pull request that touches React code. It also means the same fade preset works identically on every element type that uses it -- which is more than most codebases can say.

The motion system has four distinct layers, and there's a dedicated doc that goes deep on each one. Here it's enough to know that animation is a data concern, not a component concern.

### All defaults are swappable

Heading sizes, button styles, image aspect ratios, spacer heights -- every visual default comes from a single config object, not from hardcoded magic numbers scattered through component files. A different brand calls one function to swap the entire default set and moves on with their life.

The platform doesn't get to decide what looks good for your project. It shouldn't pretend to.

### The server does the heavy lifting

Breakpoints are resolved server-side from the User-Agent header. Entrance motion keyframes are computed at build time -- the client never opens a motion preset file or does a lookup by name. CDN URLs are signed before the page ever reaches a browser.

The client receives a pre-resolved tree and focuses on what it's actually good at: rendering pixels and handling user interaction. The `"use client"` directive is an explicit opt-in on this project, not a default you stumble into by accident.

### Errors are structured, not thrown

When something is wrong with a page's JSON, you get back an array of diagnostics, each with a path, a message, a severity level, and a machine-readable code. Not a crash. Not a red screen. Not a 500 error.

Content authors make mistakes all the time. Those mistakes should be discoverable and fixable, not catastrophic. The platform throws exceptions only when the programmer screwed up -- not when the content author made a typo. That distinction matters more than most projects realize.

### Type strings, not dependency injection

Every section and element on a page resolves through a plain `Record&lt;string, Component&gt;` lookup. The renderer reads the type field -- `"elementHeading"`, `"contentBlock"`, `"backgroundVideo"` -- and pulls the matching component from a map. No decorators. No providers. No injection tokens. No framework ceremony.

This means you can open a single file and see every registered type at a glance. Adding a new type touches exactly one map entry. Tree-shaking works without configuration because unused imports are simply not in the file. And nobody has to learn a dependency injection mental model before they can understand how a button gets on screen. A plain object is easier to debug, easier to extend, and fits in your head.

### The renderer is replaceable; the pipeline is not

Everything through stage four of the pipeline has zero React or Next.js imports. The pipeline loads JSON, validates it against Zod schemas, expands references into concrete data, and resolves assets -- all in pure TypeScript with no framework dependencies.

Stage five happens to use React, but it could be anything. If you want to swap the renderer for Svelte, web components, or a command-line tool that prints pages to the terminal, the pipeline doesn't care. The pipeline is the product.

### CSS is the theming platform, not JavaScript

Colors use CSS custom properties, the OKLCH color space, and `color-mix()` for blending. Light and dark mode is a per-property object -- `light: "#fff"` paired with `dark: "#111"` -- not a class-name toggle on some wrapper element.

The browser already knows how to handle this. We're not going to build a JavaScript layer on top of a perfectly good CSS feature and call it innovation.

### Figma is an input, not an authority

Design tools export to Peblor's format, not the other way around. The Figma pipeline strips design-tool noise and produces clean Peblor JSON. Your design file is a source of inspiration, not the source of truth. The content files in version control are the source of truth. That direction matters -- if the design tool disappears or you switch to a different one, your content doesn't skip a beat.

### Content goes through CI, just like code

Pages live in the same repository as the code, going through the same pull request pipeline, the same lint checks, the same validation. A broken page is a failing build.

You can bisect your content history, revert a bad page change, and grep every page on the site in under a second. Try doing any of that in a headless CMS.

### Media players are configuration, not custom components

Video and audio players are defined entirely in JSON -- key bindings, gesture regions, slot layouts, feedback chrome. Every behavior is a declarative rule in a config file. There are no bespoke React components for different player variants. The same player engine reads different configs and produces different behaviors.

## How It All Connects

The pipeline is the skeleton everything hangs on. Five stages, every page goes through every one.

**Stage one -- Load.** JSON comes off disk. Preset references get resolved into inline definitions. Sidecar files next to the page get inlined. Global module configs merge in. What comes out is a self-contained page object with no remaining external dependencies.

**Stage two -- Validate.** That object is checked against the canonical Zod schemas. Every field gets type-checked. Every cross-reference is verified. If something is wrong, you get structured diagnostics -- not a crash, not a silent failure.

**Stage three -- Expand.** Element references become concrete objects. Builder defaults fill in whatever the content author didn't specify. Entrance motion presets resolve to keyframes. Trigger payloads resolve to their targets. What comes out is a flat, ready-to-render data structure.

**Stage four -- Resolve.** Asset URLs get signed through the CDN. Responsive image sizes are computed. Theme-aware colors become native CSS values. The output is browser-ready -- you could hand it to any renderer at this point and it would have everything it needs.

**Stage five -- Render.** React component dispatch maps turn the resolved data into DOM elements. Error boundaries keep one broken section from taking down the whole page. This is the only stage that cares what renderer you're using.

Each stage is a pure function: data goes in, transforms, comes out. No side effects, no mutable state, no surprises. The orchestrator that ties them together is the single entry point for the entire pipeline.

The deep dive on all five stages -- with diagrams, file-by-file breakdowns, and edge-case coverage -- lives in the pipeline documentation.

## Where to Go Next

The [pipeline documentation](pipeline.md) is the deep dive into each of the five stages. It's the central document everything else cross-references, so start there.

After that, pick your track:

- [Data model](data-model.md) -- flat dictionaries, preset composition, merge-patch semantics, theming, density
- [Motion](motion.md) -- the four motion layers: element-level, entrance presets, background layers, background transitions
- [Content authors: getting started](../content-authors/getting-started.md) -- editing pages, working with presets, configuring modules
- [System docs](../system/monorepo-map.md) -- extending the platform, adding new component types, understanding the packages

Back to [about-these-docs.md](../about-these-docs.md).
