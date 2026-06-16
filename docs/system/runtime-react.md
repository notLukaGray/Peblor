# runtime-react: How JSON Becomes a Web Page

By the time the pipeline is done with a page, you've got a fully resolved blob of data. Presets are merged in. Elements are inlined. Entrance motions are expanded. CDN URLs are signed. It's a complete, self-contained description of what the page should look like.

But it's still just data. Somebody has to turn it into actual pixels on a screen.

That's what runtime-react does. It's a pure renderer with no hardcoded content, no business logic, and no opinions about what your site should look like. It takes the resolved JSON, walks the tree, and dispatches each block to the right React component based on its type string. That is essentially the whole job.

## The dispatch system: a very fancy lookup table

Most frameworks use dependency injection, registry patterns, or decorators to wire up components. You register a provider, add an entry to a factory, annotate a class. Peblor does none of that. It uses a plain JavaScript object mapping type strings to React components.

```ts
const SECTION_COMPONENTS: Record<string, ComponentType> = {
  contentBlock: memo(SectionContentBlock),
  scrollContainer: memo(ScrollContainerSection),
  sectionColumn: memo(SectionColumn),
  // ... etc
};
```

That's it. The renderer reaches into this map with `SECTION_COMPONENTS[section.type]`, gets back a component, and renders it. No decorators. No providers. No ceremony.

This matters for three reasons. First, you can open a single file and see every registered type at a glance. Zero indirection. Second, adding a new type means adding one entry to a map. You don't need to understand a dependency injection framework to extend the renderer. Third, tree-shaking works effortlessly. If a component isn't imported at the top of the file, it doesn't make it into the bundle.

The same pattern applies at every level. Section types have `SECTION_COMPONENTS`. Element types have `ELEMENT_COMPONENTS`. Background types have `BG_COMPONENTS`. The same pattern, repeated at three granularities. The renderer never needs to know what it's rendering. It just looks up a string and calls the result.

## Section components: the first dispatch

Eight section types are registered, each wrapping a section of the page. Think of them as layout containers with specific jobs.

- **contentBlock** — the workhorse. A vertical stack of elements with padding, backgrounds, and responsive column layouts. Most sections on a typical page are this type.
- **sectionColumn** — lays children out horizontally. Handles column ratios, gutters, and the inevitable stack-on-mobile collapse.
- **scrollContainer** — a full-viewport scrollable area. Powers horizontal scroll sections and parallax-driven layouts.
- **sectionTrigger** — renders nothing visible. It fires trigger actions (analytics events, background transitions) when it scrolls into view. A ghost section.
- **pageTrigger** — fires once when the page mounts. Useful for bootstrapping state or firing an initial analytics event.
- **formBlock** — renders form elements with validation, submission, and state management. Probably the most opinionated section type.
- **revealSection** — starts hidden and animates in on scroll. For dramatic entrances that make visitors go "ooh."
- **divider** — purely visual. A horizontal rule, a shape divider, a spacer. Makes the design breathe.

Each section component receives the expanded data and is responsible for rendering its elements. They all delegate to the same shared element infrastructure, so elements behave consistently regardless of which section type wraps them.

If you're curious how responsive columns work, peek at `SectionContentBlock`. If you wonder how a ghost section fires triggers, look at `PageTrigger`. The naming throughout is intended to be obvious.

## Element components: the second dispatch

Elements work exactly the same way but at a finer granularity. The `ELEMENT_COMPONENTS` map has thirty-one entries covering headings, body text, buttons, images, video players, audio players, spacers, dividers, 3D model viewers, Rive animations, Lottie animations, tabs, drag-and-drop zones, embeds, blockquotes, tables, code blocks, lists, and more.

Four of these are considered lightweight enough to import statically: `elementHeading`, `elementBody`, `elementLink`, and `elementImage`. These render simple DOM elements with no heavy dependencies, and they appear on almost every page. They belong in the main bundle.

The remaining twenty-seven use `next/dynamic` for code splitting. Each heavy component lands in its own JavaScript chunk and only loads when a page actually uses that element type. This includes video players, audio players, the 3D model viewer, Rive and Lottie animations, tabs, marquees, image comparators, tooltips, the drag system, scroll progress bars, form fields, counters, infinite scroll, embeds, SVGs, vectors, rich text, range inputs, and the module group system.

Three of these -- `elementModel3D`, `elementRive`, and `elementLottie` -- go further and disable SSR entirely with `ssr: false`. These render nothing on the server. The page loads with an empty slot, and the component hydrates in the browser. This avoids shipping a WebGL-powered animation framework to the server, which would be pointlessly expensive for content that won't be interactive until JavaScript loads anyway.

The rest of the dynamic imports keep SSR enabled (`ssr: true` by default), so the browser receives full HTML immediately. The user sees the complete page on first paint. Interactivity just takes a moment longer to arrive for components farther down the page.

## The render chain, from outside in

When a page renders, the React tree builds from the outside in. Each layer adds something the layers below don't need to know about.

**PeblorRenderer** is the client-side entry point. It receives the resolved page data -- background config, sections, overlays, definitions, transitions -- and starts building. On mount it wires up the triggers system, which handles scroll-driven background transitions and section content overrides. This is where the page comes alive, behaviorally speaking.

**PeblorBackground** renders the current background layer behind everything. If the page has a background transition (say, scrolling through three color layers), this component interpolates between them. If the page has a static image or video, it renders that. Backgrounds dispatch through their own `BG_COMPONENTS` map with five registered types: `backgroundImage`, `backgroundVideo`, `backgroundVariable`, `backgroundPattern`, and `backgroundTransition`. All five are dynamically imported.

**Section components** render in page order, each wrapped in a `SectionErrorBoundary`. If a section throws during render, the boundary catches it, logs the error with the section key so you can debug it, and renders nothing for that section. The rest of the page -- the background, the header, every other section -- keeps working. One broken section does not take down the entire page.

**ElementRenderer** handles individual element dispatch with all the trimmings: responsive prop resolution, live variable bindings, visibility conditions, motion configuration, entrance animations, exit animations, gesture motion, and border gradient overlays. The order matters:

1. **Resolve the element** -- responsive props are resolved against the current viewport. Entrance timing, motion config, and wrapper styles are pre-computed. This is the data prep layer.

2. **Check variable bindings** -- if the element has `visibleWhen` conditions or variable bindings, those are evaluated against the current runtime state. Elements can subscribe to specific variables and only re-render when those change.

3. **Check visibility** -- if the element should not be visible right now (because a condition isn't met), it renders nothing. This is how content can appear and disappear based on analytics state or user interactions without imperative code.

4. **Look up the component** -- `ELEMENT_COMPONENTS[resolvedBlock.type]` gets the right React component. If the type isn't registered, it throws. Better a loud crash during development than a silent blank spot on the page.

5. **Wrap for entrance animation** -- if the element has entrance timing, an `ElementEntranceWrapper` handles the animation. The expanded JSON contains a pre-computed motion configuration with keyframes, timing, easing, and viewport trigger settings. This wrapper passes them to framer-motion's `motion.div` with `initial` and `animate` props. Elements can animate once on first visibility, or replay every time they enter the viewport.

6. **Wrap for gesture motion** -- if the element has hover, tap, focus, or drag animations but no entrance timing, a `MotionFromJson` wrapper handles those. This takes the raw JSON motion object from the element data and maps it directly to framer-motion props. `motion.whileHover.scale` becomes `whileHover={{ scale: ... }}`. The mapping is mechanical and straightforward.

7. **Wrap for exit animation** -- if the element has an exit preset or exit motion, an `ElementExitWrapper` handles animations when the element leaves the DOM. This uses framer-motion's `AnimatePresence` so exiting elements animate out smoothly before being removed.

8. **Handle dimension-animating gestures** -- if a gesture animates width or height, the motion wrapper takes ownership of the dimensions and the inner component fills 100%. This prevents the component and the animation from fighting each other.

The important architectural insight: an element component never imports framer-motion. It never knows about motion, boundaries, or theme resolution. Those are all handled by wrappers upstream. The element component just renders its content. Everything else is someone else's problem.

## Server rendering: shipping less JavaScript

Not every section needs JavaScript in the browser. A section with static text and an image and no entrance animations can render entirely on the server and never ship a byte of client code.

The server analysis classifies each section and element into one of two buckets: **static** (renders fine on the server, no hydration needed) and **always-client** (needs browser APIs for interactivity). The classification is granular. A `contentBlock` section with no triggers, no motion, and no variable subscriptions is static. The same section with a single entrance animation becomes a client island. The analysis propagates: if a parent section has a client-child, the parent becomes client too.

Sixteen element types are considered static-capable: headings, body text, rich text, links, images, spacers, dividers, groups, vectors, counters, embeds, lists, blockquotes, tables, code blocks, and buttons (mostly -- buttons with vector refs but no fallback fill get pulled client-side).

The remaining element types are always client. Video, audio, 3D, Rive, Lottie, infinite scroll, range inputs, input fields, video time displays, quality selectors, scroll progress bars, marquees, image comparators, tabs, tooltips, and form fields all need the browser to function.

For sections, only `divider`, `contentBlock`, and `sectionColumn` can render on the server. `scrollContainer`, `sectionTrigger`, `pageTrigger`, `formBlock`, and `revealSection` always need client hydration.

The server renderer handles the seam between static and client content with **mixed-content islands**. A `contentBlock` with eight elements where two need client JavaScript doesn't render the entire section as a client island. It renders the six static elements on the server and wraps only the two interactive ones in client islands. The result is less JavaScript shipped, faster page loads, and a smaller carbon footprint. Every byte that doesn't cross the wire was a conscious choice, not an accident.

Pages with zero interactive content -- no triggers, no motion, no variable subscriptions, no forced theme -- render with zero client JavaScript. The HTML is pre-built at build time. The browser downloads it, parses it, and the user sees the page immediately with no hydration step, no framework initialization, nothing. Just HTML and CSS, the way the web used to work.

## Error boundaries: failing gracefully

Content authors make mistakes. A JSON field gets the wrong type. A reference points to a definition that doesn't exist. A component throws because a value it expected is suddenly absent. These things happen. The question is whether one mistake takes down the whole page.

Two error boundaries, both class components, provide isolation. They're the only class components in the entire codebase. React error boundaries require `componentDidCatch`, which hooks can't provide. It's the one place the codebase breaks its own conventions, and it's entirely justified.

**SectionErrorBoundary** wraps every section. If a section throws, the boundary catches it, logs the error with the section key for debugging, and renders nothing for that section. The page continues. The background, the header, the footer, every other section -- all still work.

**ElementErrorBoundary** wraps individual elements inside sections. This is finer-grained. If an image component throws, that single element slot renders nothing. The heading above it and the button below it keep working. A broken element doesn't drain the entire content block.

Both boundaries render a visually hidden alert for screen readers so assistive technology knows content failed to load, even if sighted users don't see it.

## Motion wrappers: from JSON to animation

Three wrappers transform JSON motion data into framer-motion behavior. Each handles a different kind of animation, and each receives pre-computed data from the pipeline's expand stage.

**ElementEntranceWrapper** handles how elements appear when they enter the viewport. The expanded JSON contains a `motionTiming.resolvedEntranceMotion` object with keyframes, timing, easing, and viewport trigger settings already computed by the server. The wrapper just passes these to framer-motion's `motion.div` with `initial` and `animate` props. Two viewport trigger modes exist: `onFirstVisible` animates once when the element scrolls into view, then never again. `onEveryVisible` replays the animation every time the element enters the viewport.

**ElementExitWrapper** handles how elements leave the DOM. It uses framer-motion's `AnimatePresence`. Elements with an exit preset get wrapped so they animate out smoothly when removed from the tree. Configurable presence modes (`sync`, `wait`, `popLayout`) control how multiple exiting elements sequence.

**MotionFromJson** handles gesture motion: `whileHover`, `whileTap`, `whileFocus`, `whileInView`, plus continuous `animate` and layout animations. It takes the raw JSON motion object from the element data and maps it directly to framer-motion props. The mapping is entirely mechanical -- read the JSON structure, produce the corresponding framer-motion prop structure. It can render as `m.div`, `m.span`, `m.section`, or any other HTML tag. When no motion is configured, it falls back to plain `<div>` with zero overhead.

The framer-motion integration is strictly centralized in a single directory. This is the only place framer-motion is imported across the entire peblor runtime. If you ever wanted to swap framer-motion for a different animation library, you would change exactly this directory. Not a single other file would need modification.

Background motion -- parallax, pointer-follow, scroll-driven transitions -- is handled separately through `useBgLayerMotion`. Backgrounds have their own motion layer because they live outside the element render chain and operate at the page level.

## Overlays: the header, footer, and everything around the page

Global overlays like the header and footer are rendered separately from the main page content. They're sections too, rendered through the same dispatch system, but with different positioning.

When `PeblorPage` mounts, it sorts overlay sections by their `position` field. Top-positioned overlays (headers, top bars) come first. Bottom-positioned overlays (footers) come last. Each overlay gets its own `PeblorRenderer` instance and renders as a fixed-position div. They're completely independent of the main page renderer.

This separation means overlays can be interactive without forcing the entire page to hydrate. The header can have a hamburger menu and search bar while the main content remains static. It also means an error in the main content can't take down the navigation.

The overlay sections strip their `fixed`, `fixedPosition`, and `fixedOffset` fields before rendering, since PeblorPage handles their positioning at the shell level. This keeps the rendering path simple: overlays are just sections that happen to be pinned to the edges of the viewport.

## The variable store: state without ceremony

Trigger actions like `setVariable`, `appendToArray`, `mergeVariable`, and `deleteVariable` all read and write to a central variable store powered by Zustand. Elements can subscribe to specific variables so unrelated `setVariable` calls don't trigger unnecessary re-renders.

The subscription model is simple: each element registers which variables its `visibleWhen` condition and `bindings` reference. Only those variables cause a re-render when they change. The store also supports nested dot-path access, array manipulation, and conditional removal.

The store is deliberately not persisted. Every route change clears it. This keeps state management predictable: what happens on a page stays on that page.

## Adding a new element type

This is the most common thing you'll do when extending the platform. Five steps, two of which are often optional.

**One: add the schema variant.** Go to the contracts package and add a new variant to the discriminated union of element types. The variant follows the pattern of a `z.object` with `type: z.literal("elementYourNewType")` extended with whatever fields your element needs.

**Two: add builder defaults (optional).** If your element needs default values for variant, size, or aspect ratio, add them in the host config. The expand stage reads these and fills in unspecified fields. Skip this if your element doesn't need defaults.

**Three: add expand logic (optional).** Most elements don't need custom expand logic. The standard expansion -- inline presets, resolve definitions, apply defaults -- covers them. If your element has special resolution requirements like module inlining or custom trigger resolution, hook into the expand stage.

**Four: create the component file.** Write your React component and place it in the elements directory. If it's heavy, use `next/dynamic` for lazy loading. If it's lightweight (heading, spacer, divider), import it statically.

**Five: register in the map.** Add your type string and component to `ELEMENT_COMPONENTS`. That's the final connection point. The renderer will now dispatch elements with your type string to your component automatically.

That's it. No registry decorator. No provider setup. No dependency injection configuration. Five steps, and two are often optional.

---

Back to [about-these-docs.md](../about-these-docs.md). See also: [pipeline.md](../architecture/pipeline.md), [extending-the-platform.md](extending-the-platform.md), [contracts.md](contracts.md).
