# Wait, you built another content platform?

Yeah, we know how that sounds. But hear us out.

Every web project hits the same wall eventually. You spin up Next.js, spend three days wrestling the app router into submission, wire up a headless CMS, negotiate pricing for the fifth editor seat, write the same image-optimization wrapper you wrote on the last three projects, and six months later you're maintaining a thousand lines of glue code that has nothing to do with what you actually set out to build. The thing you wanted to make — the site, the experience, the content — is buried under infrastructure.

Peblor is what happens when you get tired enough of that pattern to do something about it.

It's a content platform. Not a CMS — that word comes with baggage about databases and dashboards and WYSIWYG editors that sync to nowhere. Not a framework — nobody needs another framework. And definitely not a site builder — those things trap you in someone else's idea of what a website should be.

Peblor is a pipeline. You put structured JSON files in one end, and rendered pages come out the other. That's it. The pipeline is the product. Everything else — the React renderer, the CLI, the Figma plugin — is optional infrastructure around it.

## Why go all-in on JSON

Because data and code are different things that shouldn't live in the same file.

A JSON file is portable. You can version it in git, diff it in a pull request, validate it against a schema, and render it with anything that can read a dictionary. A React component can do exactly none of those things. If you wake up tomorrow and decide Next.js was a terrible life choice, your JSON content moves with you untouched. Your JSX? Not so much.

The bet here is simple: content should look like content, and code should look like code. A content author should never need to open a TSX file. A page should survive a framework migration. If you want to switch from React to something else down the road, the pipeline doesn't care. The content is just data.

It's also worth saying what this isn't: it's not a rejection of code as a tool. The pipeline itself is plenty of code. But the line between "content you edit" and "infrastructure that renders it" is sharp, and Peblor enforces it.

## The ideas that hold it together

### Pages are flat dictionaries, not trees

Every page in Peblor has two parts: a render-order array that tells the system what to draw and in what sequence, and a flat dictionary of named definition blocks. That's it. No nested component hierarchies, no slots inside slots inside slots, no recursive tree of containers.

Why flat? Because deep nesting makes everything harder. If you want to change one property on a component six levels deep, you need to reproduce the entire branch or write a patch function that understands your tree's shape. With a flat dictionary and merge-patch semantics, you override exactly what you want and nothing else changes. Merge two dicts, update the order array, move on.

Flat also makes validation trivial. Every key in the order array must exist in the definitions map. That's a simple set-membership check — no recursive tree traversal to find orphaned nodes. The same pattern repeats one level deep inside sections that contain elements, but it never goes further than that. Two levels of nesting, by design.

### Presets compose by merging, not inheriting

A preset is a JSON file with some fields. Applying it means shallow-merging those fields onto your definition block — local values win, preset values fill in the gaps. No class hierarchies, no `super()` calls, no fragile chains that break when someone reorders them. The merge logic lives in `packages/core/src/internal/peblor-presets.ts` if you want to see exactly how it works.

You can trace every field to its source. You can explain the override rules to someone in ten seconds. Inheritance chains cannot make either of those claims.

### All defaults are swappable

Heading sizes, button styles, image aspect ratios, spacer heights — every visual default comes from a config object, not from hardcoded magic numbers buried in component files. That config lives at `packages/core/src/internal/adapters/host-config.ts`. A different brand calls one function to swap the entire default set and moves on with their life.

The platform doesn't get to decide what looks good for your project. It shouldn't pretend to.

### Motion lives in the data layer

Entrance animations, hover gestures, scroll-driven parallax, background transitions — all of it lives in JSON files under `content/framer-motion/`. The runtime just plays back whatever keyframes it receives. A motion designer can tweak an entrance preset without opening a pull request that touches JavaScript. The same fade preset works the same way on every element type that uses it, which is more than most codebases can say.

The full motion system has four layers, and there's a dedicated [motion doc](motion.md) that goes deep on each one.

### The server does the heavy lifting

Breakpoints are resolved server-side from the User-Agent header. Entrance motion keyframes are computed at build time in `packages/core/src/internal/peblor-resolve-entrance-motions.ts`. Asset URLs are signed through the CDN before the page ever reaches a browser — that happens in `packages/core/src/internal/peblor-resolve-assets-server.ts`. The client gets a pre-resolved tree and focuses on what it's actually good at: rendering pixels and handling user interaction.

The `"use client"` directive is an explicit opt-in on this project, not a default you stumble into by accident.

### Errors are structured, not thrown

When something's wrong with a page's JSON, you get back a list of diagnostics — each one with a path, a message, a severity level, and a machine-readable code. Not a crash, not a red screen, not a 500. Content authors make mistakes all the time, and those mistakes should be discoverable and fixable, not catastrophic.

The platform throws exceptions only when the programmer screwed up, not when the content author made a typo.

### The renderer is replaceable; the pipeline is not

Everything through stage four of the pipeline has zero React or Next.js imports. The entire `packages/core/` package loads JSON, validates it against Zod schemas, expands references into concrete data, and resolves assets — all in pure TypeScript. Stage five happens to use React, but it could be anything. If you want to swap the renderer for something else, the pipeline doesn't care. The pipeline is the product.

### CSS is the theming platform, not JavaScript

Colors use custom properties, the OKLCH color space for perceptual uniformity, and `color-mix()` for blending. Light and dark mode is a per-property object — `light: "#fff"` paired with `dark: "#111"` — not a class-name toggle applied to some wrapper element. The browser already knows how to handle this. We're not going to build a JavaScript layer on top of a perfectly good CSS feature and call it innovation.

### Figma is an input, not an authority

Design tools export to Peblor's format, not the other way around. The Figma plugin at `tools/figma-plugin/` sends its output through a bridge layer at `tools/figma-bridge/` that strips Figma-specific noise and produces clean Peblor JSON. Your design file is a source of inspiration, not the source of truth. The content files in version control are the source of truth.

### Content goes through CI, just like code

Pages live in `content/` at the repo root, right next to the code, going through the same pull request pipeline, the same lint checks, the same validation. A broken page is a failing build. You can bisect your content history, revert a bad page change, and grep every page on the site in under a second. Try doing any of that in a headless CMS.

### Media players are configuration, not custom components

Video and audio players are defined entirely in JSON — key bindings, gesture regions, slot layouts, feedback chrome, every last behavior. There are no bespoke React components for different player variants. The schemas for these live in `packages/contracts/src/peblor/core/` and the module definitions are under `content/modules/`.

## How it all connects

The whole system follows a five-stage pipeline defined in `packages/core/src/index.ts`. Each stage is a pure function — it takes data in, transforms it, and hands it off to the next one. No side effects, no mutable state, no surprises.

Stage one loads JSON from disk, discovers any sidecar files alongside the page, resolves preset references into inline definitions, and merges in global module configs. Stage two validates everything against the canonical Zod schemas in `packages/contracts/`. Stage three expands all the indirections — element references become concrete objects, builder defaults get applied, entrance motion presets get resolved to keyframes. Stage four signs CDN URLs, computes responsive image srcsets, and resolves theme-aware color objects into CSS values. Stage five renders the whole thing through React component dispatch maps in `packages/runtime-react/`.

Every stage through four has zero React in it. The runtime only handles rendering. The content is just data that made it through a pipeline.

The orchestrator function `getPeblorPropsFromPage` at `packages/core/src/index.ts` is the entry point that ties it all together. It loads the page, runs it through the pipeline, and also pulls in overlay sections — header, footer, navigation — from `packages/core/src/internal/overlay/peblor-overlay-loader.ts` so the renderer has everything it needs for a full page.

## Where to go next

The [pipeline documentation](pipeline.md) is the deep dive into each of those five stages. It's the central document everything else cross-references, so start there.

After that, pick your track:

- [Data model](data-model.md) — flat dictionaries, preset composition, merge-patch semantics, theming, density
- [Motion](motion.md) — the four motion layers: element-level, entrance presets, background layers, background transitions
- [Content authors: getting started](../content-authors/getting-started.md) — editing pages, working with presets, configuring modules
- [System docs](../system/monorepo-map.md) — extending the platform, adding new component types, understanding the packages

Back to [about-these-docs.md](../about-these-docs.md).
