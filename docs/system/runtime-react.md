# runtime-react: Turning JSON into pixels

By the time the pipeline's done with a page, you've got a fully resolved blob of data. All the presets are merged in, elements are inlined, entrance motions are expanded, CDN URLs are signed. It's a complete, self-contained description of what the page should look like. But it's still just data. Somebody has to turn it into actual DOM elements.

That's what `packages/runtime-react` is for. It's a pure renderer. It has no hardcoded content, no business logic, no opinions about what your site should look like. It takes the resolved JSON and walks the tree, dispatching each block to the right React component based on its type string. That's basically the whole job.

The entry point is `PeblorRenderer` at `packages/runtime-react/src/peblor/PeblorRenderer.tsx`. It's a client component (marked `"use client"`) because it handles scroll events, hover interactions, and animation playback. But the server does as much as possible before handing off — more on that later.

## The big picture: type-string dispatch

Most frameworks use dependency injection or some kind of registry pattern to wire up components. You decorate a class, register a provider, add an entry to a factory. Peblor does none of that. It uses a plain old JavaScript object mapping type strings to React components.

Open `packages/runtime-react/src/peblor/section/index.ts` and you'll see the `SECTION_COMPONENTS` map. Open `packages/runtime-react/src/peblor/elements/index.ts` and you'll see `ELEMENT_COMPONENTS`. Both are `Record<string, Component>` — that's it. The renderer does `SECTION_COMPONENTS[section.type]` and gets back the right component. No decorators, no providers, no framework ceremony.

This matters for a few reasons. First, you can open the file and see every registered type in one glance. There's no indirection. Second, adding a new type means adding one entry to this map — you don't need to understand a DI system. Third, tree-shaking works naturally because the imports are right there at the top of the file. If a component isn't imported, it doesn't exist in the bundle.

## Section components: the first dispatch

Section types live in `packages/runtime-react/src/peblor/section/index.ts`. There are seven of them, each with a component in the `SECTION_COMPONENTS` map:

- **contentBlock** — the workhorse. A vertical stack of elements, wrapped in a container. Handles padding, background fills, and responsive column layouts.
- **sectionColumn** — lays children out horizontally. Handles column ratios, gutters, and responsive stacking on mobile.
- **scrollContainer** — a full-viewport scrollable area, often used for horizontal scroll sections or parallax-driven layouts.
- **sectionTrigger** — a section that doesn't render visible content but fires trigger actions when it enters the viewport. Think analytics events or background transitions on scroll.
- **formBlock** — renders form elements with validation, submission handling, and state management.
- **revealSection** — a section that starts hidden and reveals on scroll, often used for dramatic entrances.
- **divider** — purely visual: a horizontal rule, a shape divider, or a spacer between sections.

Each section component receives the expanded section data and is responsible for rendering its elements. They all delegate the element rendering to the same shared infrastructure — `SectionContentBlockElementList` and friends — so elements behave consistently regardless of which section type wraps them.

The section component files live in `packages/runtime-react/src/peblor/section/` and are all named with a `Section` prefix followed by the type name. If you're curious how `contentBlock` handles responsive column layouts, poke at `packages/runtime-react/src/peblor/section/SectionContentBlock.tsx`.

## Element components: the second dispatch

Elements work exactly the same way but at a finer granularity. The `ELEMENT_COMPONENTS` map in `packages/runtime-react/src/peblor/elements/index.ts` has 25-plus entries. There are headings, body text, buttons, images, video players, audio players, spacer elements, dividers, 3D model viewers, Rive animations, Lottie animations, tabs, drag-and-drop zones, and more.

About four of these are lightweight enough to import statically — `elementHeading`, `elementBody`, `elementLink`, and `elementImage`. These are components that render simple DOM elements with no heavy dependencies. You want them in the main bundle because they appear on almost every page.

Everything else uses `next/dynamic`. Heavy components like `elementModel3D`, `elementRive`, `elementLottie`, `elementTabs`, and `elementDrag` each land in their own JavaScript chunk. They only load when a page actually uses that element type. SSR still renders the full HTML for these components — `ssr: true` is the default — so the layout never collapses while the JS downloads. The user sees the complete page immediately; interactivity just takes a moment longer to arrive for the 3D model on page three.

The pattern for adding a dynamic import is always the same. You import the component file at the top of the elements index with `next/dynamic`, giving it a meaningful webpack chunk name. Then you add it to the `ELEMENT_COMPONENTS` record with its type string as the key. That's it. The dynamic import handles code splitting and lazy loading automatically.

## The render chain, layer by layer

When `PeblorRenderer` mounts, it starts building the React tree from the outside in. Here's the full chain, and what each layer does.

**PeblorRenderer** (`packages/runtime-react/src/peblor/PeblorRenderer.tsx`) is the top-level entry point. It receives the resolved page data including background config, sections, overlays, and the page's definition dictionary. On mount it calls `usePeblorTriggers` from `packages/runtime-react/src/peblor/hooks/use-peblor-triggers.ts`, a hook that wires up background transitions and section content overrides. This is where scroll-driven background changes and trigger sections get their behavior attached.

**PeblorBackground** (`packages/runtime-react/src/peblor/PeblorBackground.tsx`) renders the current background. If the page has a background transition configured (say, scrolling through three color layers), this component handles the interpolation. Backgrounds are lazy-loaded via `next/dynamic` from `packages/runtime-react/src/peblor/background/index.ts`, same pattern as heavy elements. Five background types are registered: `backgroundImage`, `backgroundVideo`, `backgroundVariable`, `backgroundPattern`, and `backgroundTransition`.

Then the sections render in display order. Each section gets wrapped in a **SectionErrorBoundary** (`packages/runtime-react/src/peblor/SectionErrorBoundary.tsx`). If anything inside the section throws, the boundary catches it and renders nothing for that section. The page keeps going.

Inside the boundary, the section component is looked up from `SECTION_COMPONENTS` by its type string. A `contentBlock` section, for example, uses `SectionContentBlock` at `packages/runtime-react/src/peblor/section/SectionContentBlock.tsx`. The section component receives its expanded data and renders its elements through a shared element list component.

Each element goes through its own sub-chain inside `ElementRenderer` at `packages/runtime-react/src/peblor/elements/Shared/ElementRenderer.tsx`. This is the central dispatch for all elements and it handles theme resolution, motion configuration, visibility conditions, and responsive breakpoint selection in one pass. The sub-chain looks like this:

1. **ElementErrorBoundary** — catches failures in a single element so the rest of the section survives. A broken image component doesn't take down the entire content block, just that one slot.
2. **ElementEntranceWrapper** — handles entrance animations. The expanded JSON contains a pre-computed `motionTiming.resolvedEntranceMotion` object with keyframes, timing, easing, and viewport trigger settings. This wrapper passes them to framer-motion's `motion.div` with `initial` and `animate` props.
3. **ElementExitWrapper** — handles exit and presence animations via framer-motion's `AnimatePresence`. Elements with an `exitPreset` or `motionTiming.exitPreset` get wrapped so they animate out when removed from the tree. Configurable presence modes control how multiple exiting elements sequence.
4. **MotionFromJson** — takes the raw JSON motion object from the element data and translates it directly to framer-motion props. This covers gesture motion: `whileHover`, `whileTap`, `whileFocus`, `whileInView`, plus continuous `animate` and layout animations. The important thing is that the element data just has a `motion` field with JSON in it, and this wrapper makes it work — no element component ever imports framer-motion directly.
5. The element component itself, looked up from `ELEMENT_COMPONENTS` by its type string.

This layered approach means every element gets entrance animations, exit animations, gesture motion, and error isolation automatically. An element component only needs to handle its own rendering — it doesn't know about motion, boundaries, or theme resolution. That's all handled by the wrappers upstream.

## Server components: shipping less JavaScript

Not every section on a page needs to be interactive. A section with static text, an image, and no entrance animations doesn't need to hydrate in the browser. It can render entirely on the server and never ship a byte of JavaScript to the client.

The package exports a server component entry at `packages/runtime-react/src/server.ts`. This provides `PeblorServerPage` and `PeblorServerRenderer`, which run during SSR and SSG. They analyze the page's block capabilities at `packages/runtime-react/src/peblor/analyze/block-capabilities.ts` to determine which sections need client-side hydration and which can remain server-only.

The analysis is straightforward: a section that has no interactive features (no triggers, no motion, no variable subscriptions, no form inputs) gets a low hydration priority. A section with entrance animations, gesture handlers, or variable subscriptions gets a high priority. The server renderer assigns these priorities and wraps only the necessary parts in client islands.

This is the "server does the work; the browser does the fun" philosophy. The server renders the full HTML. The browser only hydrates the parts that need JavaScript. If you're building a mostly-static marketing site, the vast majority of your page never hydrates. The JavaScript you do ship is proportional to the interactivity on the page, not the size of the page.

The server entry also re-exports `PeblorPage` at `packages/runtime-react/src/peblor/PeblorPage.tsx`, which handles the full page shell. That includes overlays (header, footer, navigation — sorted by `position` field), density CSS variables, forced theme application, and the scroll container shell. The overlays themselves follow the same pattern: they're sections rendered through the same dispatch system, just positioned by the page shell rather than the section order.

## Error boundaries: failing gracefully

Content authors make mistakes. A JSON field gets the wrong type, a reference points to a definition that doesn't exist, a component throws because a value it expected isn't there. These things happen. The question is whether one mistake takes down the whole page.

Two error boundaries provide isolation at different granularities, both defined in `packages/runtime-react/src/peblor/SectionErrorBoundary.tsx`.

**SectionErrorBoundary** wraps every section. If a section's component throws during render, the boundary catches it, logs the error along with the section key for debugging, and renders nothing for that section. The rest of the page — the background, the header, the footer, every other section — continues to work normally.

**ElementErrorBoundary** wraps individual elements inside sections. This is finer-grained. If an image element renders a URL that 404s and the component throws, that one element slot renders nothing. The heading above it and the button below it in the same content block keep working.

Both boundaries are class components. They're the only class components in the entire codebase. React error boundaries require `componentDidCatch`, which hooks can't provide. It's the one place where the codebase breaks its own conventions, and it's entirely justified.

## Motion wrappers: from JSON to animation

Three wrapper layers transform JSON motion data into framer-motion behavior. Each handles a different kind of animation.

**ElementEntranceWrapper** handles entrance animations — the "how does this element appear when it first comes into view." The expanded JSON contains a `motionTiming.resolvedEntranceMotion` object. The server already computed the keyframes, timing, easing curve, and viewport trigger settings during the expand stage. The wrapper just passes these to framer-motion's `motion.div` with `initial` and `animate` props. It also handles viewport triggers: `onFirstVisible` (animate once when the element scrolls into view, then never again) and `onEveryVisible` (replay the animation every time the element enters the viewport).

**ElementExitWrapper** handles exit and presence animations — "what happens when this element leaves the DOM." It uses framer-motion's `AnimatePresence`. Elements with an `exitPreset` or `motionTiming.exitPreset` get wrapped so they animate out smoothly when removed from the tree. Configurable presence modes (`sync`, `wait`, `popLayout`) control how multiple exiting elements sequence.

**MotionFromJson** at `packages/runtime-react/src/peblor/integrations/framer-motion/motion-from-json.tsx` handles gesture motion: `whileHover`, `whileTap`, `whileFocus`, `whileInView`, plus continuous `animate` and layout animations. It takes the raw JSON motion object from the element data and maps it directly to framer-motion props. The mapping is mechanical — it reads the JSON structure and produces the corresponding framer-motion prop structure. If the element has `motion.whileHover.scale`, the wrapper produces `whileHover={{ scale: ... }}`.

The framer-motion integration lives in `packages/runtime-react/src/peblor/integrations/framer-motion/`. The file `packages/runtime-react/src/peblor/integrations/framer-motion/index.ts` re-exports everything from this folder. This is the only place framer-motion is imported across the entire peblor runtime. Everything else works through the abstractions these wrappers provide. If you ever wanted to swap framer-motion for a different animation library, you'd change exactly this directory and nothing else.

Background motion (parallax, pointer-follow, scroll-driven transitions) is handled separately through `useBgLayerMotion` at `packages/runtime-react/src/peblor/integrations/framer-motion/use-bg-layer-motion.ts`. Backgrounds have their own motion layer because they're not elements and they don't go through the element render chain.

## Analytics-driven visibility

Elements can be conditionally visible based on runtime state. The `visibleWhen` field in the element JSON specifies a condition — a variable check, essentially. The `ElementRenderer` evaluates these conditions using `evaluateConditions` from the contracts package. If the condition isn't met, the element renders nothing.

This is how analytics-driven content visibility works. You configure the condition in JSON, and the renderer handles the rest. No imperative code, no hardcoded logic, no magic.

The variable store at `packages/runtime-react/src/peblor/runtime/peblor-variable-store.ts` tracks runtime variables set by triggers. Elements subscribe to only the variables their `visibleWhen` references, so unrelated `setVariable` calls don't trigger unnecessary re-renders. This is a simple subscription model — each element registers which variables it cares about, and only those variables cause a re-render when they change.

## Adding a new element type

This is the most common thing you'll do when extending the platform. Here's the full walkthrough.

**Step one: add the schema variant.** Go to `packages/contracts/src/` (look for the element block schemas file, likely `element-block-schemas.ts`). Add a new variant to the discriminated union. The variant uses the pattern `z.object({ type: z.literal("elementYourNewType") })` extended with whatever fields your element needs. Required fields, optional fields, motion support — it's all part of the Zod schema definition. The variant name gets added to the discriminated union, which is the top-level union type the validators use.

**Step two: add builder defaults (if needed).** If your new element type needs default values for things like variant, size, or aspect ratio, add them in `packages/core/src/internal/defaults/pb-builder-defaults.ts`. These defaults come from the host config, which is the injectable configuration object the consumer app provides. If you skip this step, the expand stage won't fill in defaults for fields the element leaves unspecified.

**Step three: add expand logic (if needed).** Most element types don't need custom expand logic — the standard expansion (inline presets, resolve definitions, apply defaults) covers them. But if your element type has special resolution requirements (like module inlining or custom trigger resolution), hook into `packages/core/src/internal/peblor-expand/`.

**Step four: create the component file.** Create your component in `packages/runtime-react/src/peblor/elements/`. The file should export a React component. If your element is heavy (3D, animation, media player), use `next/dynamic` in the elements index to lazy-load it. If it's lightweight (heading, body text, spacer), import it statically.

**Step five: register in the map.** Add your type string and component to `ELEMENT_COMPONENTS` in `packages/runtime-react/src/peblor/elements/index.ts`. That's the final connection. The renderer will now dispatch elements with your type string to your component automatically.

That's it. Five steps, and steps two and three are often optional. The pattern is the same for every element type. There's no registry decorator, no provider setup, no dependency injection to configure.

## Key files

- `packages/runtime-react/src/peblor/PeblorRenderer.tsx` — top-level renderer, entry point for the React tree
- `packages/runtime-react/src/peblor/section/index.ts` — section component registry (`SECTION_COMPONENTS`)
- `packages/runtime-react/src/peblor/elements/index.ts` — element component registry (`ELEMENT_COMPONENTS`) with dynamic imports
- `packages/runtime-react/src/peblor/elements/Shared/ElementRenderer.tsx` — central element dispatch with motion wrapping
- `packages/runtime-react/src/peblor/SectionErrorBoundary.tsx` — section and element error boundaries
- `packages/runtime-react/src/peblor/PeblorPage.tsx` — page shell with overlays, density, forced theme
- `packages/runtime-react/src/peblor/PeblorBackground.tsx` — background rendering and transitions
- `packages/runtime-react/src/peblor/background/index.ts` — background component registry (lazy-loaded)
- `packages/runtime-react/src/peblor/integrations/framer-motion/index.ts` — framer-motion integration, the only framer-motion import point
- `packages/runtime-react/src/peblor/integrations/framer-motion/motion-from-json.tsx` — JSON-to-framer-motion prop translation
- `packages/runtime-react/src/peblor/integrations/framer-motion/element-exit-wrapper.tsx` — exit/presence animation wrapper
- `packages/runtime-react/src/peblor/hooks/use-peblor-triggers.ts` — background transitions and section overrides
- `packages/runtime-react/src/peblor/analyze/block-capabilities.ts` — server/client split analysis
- `packages/runtime-react/src/peblor/runtime/peblor-variable-store.ts` — runtime variable store for triggers
- `packages/runtime-react/src/server.ts` — server component entry point

---

Back to [about-these-docs.md](../about-these-docs.md). See also: [pipeline.md](../architecture/pipeline.md), [extending-the-platform.md](extending-the-platform.md), [contracts.md](contracts.md).
