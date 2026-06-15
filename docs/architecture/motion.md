# How Peblor handles animation

Motion in Peblor is entirely data-driven. There are no animation functions scattered across components, no imperative animate calls in business logic, and no keyframe strings in CSS files that a developer has to maintain. Every animation — entrance, exit, gesture, loop, parallax, scroll-driven, pointer-following, trigger-based — is declared in JSON. The runtime just plays it back.

This matters because animation is visual design, and visual design should live in the content layer where designers and animators can touch it. A motion designer should be able to tweak an entrance preset or adjust the duration of a hover effect without opening a pull request that touches React components. The motion system makes that possible by separating the "what" from the "how" — the JSON says what should happen, and the runtime figures out the framer-motion plumbing.

There are four motion layers in the system, each with a different scope and lifecycle. Element-level motion covers individual components. Entrance presets handle the most common animation pattern on the web — things that animate in when they scroll into view. Background layer motion handles continuous effects on the page backdrop. And background transitions deal with swapping between entire background configurations as the user scrolls or as events fire.

---

## Layer 1: Element-level motion

Every element can carry an inline motion object. This object maps directly to framer-motion props — things like initial state, animate state, exit state, hover gestures, tap gestures, in-view triggers, drag configuration, variants, and transition settings. Whatever you put in that object gets passed through to the underlying motion wrapper at render time.

The motion object is completely optional. If an element doesn't have one, it renders as a static element with no animation wrapper at all. No performance cost, no extra DOM nodes, no framer-motion overhead.

### How motion defaults work

Not every element needs to specify every key in its motion object. That would be exhausting and repetitive. Instead, the system fills in the gaps with sensible defaults.

The defaults system lives in two places. The schema-level file at `packages/contracts/src/peblor/core/peblor-motion-defaults.ts` defines the full set of default values — it's 645 lines of motion configuration that would be terrible to duplicate across every element. The actual default values come from a JSON file at `content/framer-motion/motion-defaults.json`, which defines the complete framer-motion configuration surface: default initial, animate, and exit keyframes, transition presets covering tween, spring, inertia, and keyframes, viewport settings, drag configuration, layout animation defaults, gesture keyframes for hover, tap, focus, and drag, and even standalone hook configs for framer-motion's imperative animate, scroll, and in-view APIs.

When an element's motion object gets merged with these defaults — through a function called `mergeMotionDefaults` in that same contracts file — any key the element doesn't specify inherits from the defaults. So if an element specifies only `whileHover: { scale: 1.05 }`, the defaults fill in the initial state, the animate state, the transition config, and every other framer-motion binding with something reasonable. The content author only specifies what they want to customize.

This is a key design decision: elements should be concise by default, and verbose only when they need to be special. The defaults system makes "write less, get more" the natural path.

### The inheritMode system

Element groups — containers that hold child elements — have a decision to make about whether their children inherit animation config. Three modes control this, defined alongside the motion defaults in the same contracts file.

Isolate mode means children don't inherit any motion from the parent. Each child starts from the base defaults and applies its own motion independently. This is useful when a container has a bounce-in entrance animation but you don't want every child element bouncing in separately on their own schedule.

Inherit mode means children inherit the parent's motion config as their base, with their own overrides layered on top. This is useful for coordinated animations where the children should share the same entrance style but maybe with staggered delays.

Auto mode is the default. It inherits only when the element type is a container type — like an element group or an infinite scroll container — and that container has explicit motion defined. Otherwise, children are isolated.

This system prevents the classic framer-motion problem where a container with an entrance animation accidentally propagates keyframes to every child, causing nested entrance animations that fight each other. Isolate mode is the escape hatch when inherited motion doesn't make sense for a particular group.

### Layout keyframe stripping

Framer Motion wants to animate layout properties like width, height, padding, margin, and position. But Peblor owns layout through its own CSS system — spacing, alignment, flexbox, and grid properties are set by the section and element schema, not by motion. If motion also tried to animate those properties, they would fight each other, causing janky animations and unpredictable layout behavior.

The solution is automatic keyframe stripping in the motion defaults file. Every keyframe set — initial, animate, exit, and variants — goes through a function that removes known layout properties before the keyframes reach framer-motion. The stripped set covers position properties, display values, flexbox properties, gap, padding, margin, width and height, min and max dimensions, and grid properties.

Gesture keyframes — the ones used for hover, tap, focus, and drag interactions — use a narrower stripped set through a separate function that deliberately allows width and height through. This is because framer-motion can productively animate dimensions in gesture targets. Think of cards that expand slightly on hover — you want width and height to animate there. The element renderer component handles dimension ownership correctly: when a gesture animates width or height, the motion wrapper takes control and the inner component fills its container at 100%.

---

## Layer 2: Entrance presets

Entrance animations are the most common motion pattern on the web — elements that animate in when they scroll into view. Instead of writing manual keyframes for every element, Peblor defines named entrance presets in `content/framer-motion/framer-motion-presets.json`.

### The available presets

The system comes with a set of preset types, each designed for a different visual effect. Fade is the simplest — opacity goes from zero to one. SlideUp and slideDown give you vertical movement with configurable distance. SlideLeft and slideRight do the same thing horizontally. ZoomIn and zoomOut handle scale-based entrances. PopIn combines scale with fade and a bit of slide for a punchier effect. BlurIn layers an opacity transition with a blur filter for a smooth reveal. TiltIn adds a slight rotation for visual interest.

Each preset is a pair of keyframe objects — an initial state and an animate state. Elements reference them through their motion timing configuration, where an entrance preset field specifies which preset to use.

### Why entrance presets are resolved at build time

Here's an important design choice that might not be obvious: entrance motion keyframes are computed at build time, not looked up at runtime in the browser.

The resolver function lives in `packages/core/src/internal/peblor-resolve-entrance-motions.ts`. It walks every section and every element on the page, looks up the named preset, resolves any distance, duration, or delay overrides the content author specified, and writes the resulting keyframes directly into the element's data. By the time the page JSON leaves the server, there are no preset names left — every element has its concrete initial and animate keyframes already inlined.

This means the client never opens the framer-motion presets file. The browser never looks up a preset by name. It just receives keyframes and passes them to framer-motion. This eliminates an entire class of runtime errors — no network requests for preset data, no "preset not found" errors in the browser console, no client-side parsing of animation definitions.

Exit presets work the same way. If an element has an exit preset configured, the resolver converts it to keyframes during the build phase, and the runtime's exit wrapper uses those pre-resolved keyframes when the element leaves the DOM.

### Server-side rendering and hydration

Entrance animations have a subtle problem with server-side rendering. If the server sends HTML with opacity zero on elements that are supposed to fade in, the page would be invisible on first paint even if the user can't see the animation because it happened below the fold. To avoid this, the SSR renderer produces elements in their final, visible state. The entrance animation only activates after hydration in the browser, and even then only if the element isn't already in the viewport. Elements that are below the fold get their entrance state applied before the first browser paint, so the animation is seamless.

---

## Layer 3: Background layer motion

Backgrounds of the variable type can have multiple layers, and each layer can have its own motion configuration. A layer's motion is defined as an array of motion objects, where each object has a type that determines its behavior. Six motion types are available per layer, each covering a different class of visual effect.

### Loop

Loop motion creates continuous repeating animations. You define the animate keyframe set — what the layer should animate to — and a transition with duration, easing, and repeat configuration. It runs indefinitely from mount. Common uses include slow pulsing gradients, shimmer effects on metallic backgrounds, and rotating patterns that give a background subtle life.

This is the simplest background motion type. There's no trigger, no scroll dependence, no user interaction. The animation starts when the page loads and runs continuously.

### Entrance

Entrance motion for background layers mirrors the element-level entrance preset system but applies to a whole background layer. It animates the layer in when it first becomes visible, with three trigger options: on mount, on first time it enters the viewport, or every time it enters the viewport.

This is useful for backgrounds that should reveal themselves — a gradient layer that fades in as the hero section scrolls into view, or a texture layer that appears only when the user reaches a specific part of the page.

### Scroll

Scroll motion maps page scroll progress to CSS property values on the layer. Each entry in the configuration maps a property name — including CSS custom properties — to a start-end tuple. As the user scrolls, the property interpolates between the start and end values.

Common uses include scroll-driven opacity on gradient layers that fade out as the user scrolls down, color shifts that transition from warm to cool tones, and position shifts that move a layer vertically at a different rate than the page scrolls — a form of parallax, but applied to a specific CSS property rather than a transform.

### Pointer

Pointer motion follows the mouse cursor with smoothing based on linear interpolation. You define per-axis property maps for X and Y that interpolate based on the cursor's normalized position across the viewport. The easing value controls the interpolation factor — lower values mean smoother, slower tracking. The default is usually around 0.08, which gives a subtle floaty feel.

This runs on a requestAnimationFrame loop and writes directly to DOM style properties. No React re-renders happen during pointer tracking, which is critical for keeping 60 to 120 frames per second performance. The initial layout is set by React during rendering, and then the pointer tracking takes over the specific properties it needs to animate.

Common uses include backgrounds that shift slightly in response to mouse movement, giving a sense of depth and dimensionality, or interactive overlays that follow the cursor for lighting effects.

### Parallax

Parallax motion applies a scroll-linked position offset to a background layer. You configure the axis — X or Y — the speed multiplier, and the scroll offset range. Positive speeds move the layer faster than the page scroll, creating a foreground-style parallax effect. Negative speeds move it slower, creating a background-depth effect.

The implementation uses framer-motion's scroll position tracking and transform mapping internally. The parallax value is a live MotionValue — a reactive value that doesn't trigger React re-renders. This means parallax runs entirely outside React's rendering cycle, which is essential for smooth scroll-linked animation.

### Trigger

Trigger motion responds to custom events dispatched on the window object. Each trigger has an event name that it listens for, from and to keyframe sets defining what to animate between, a transition config, and an optional toggle mode for two-way animations. There's also an auto-play option with a delay for timed animations that fire without an external event.

Under the hood, trigger motion uses framer-motion's imperative animate function — not the declarative motion component. This lets the animation be initiated and controlled entirely through event-driven code.

### How multiple motion types compose per layer

A single background layer can have all six motion types running simultaneously. Loop runs continuously. Parallax shifts the layer based on scroll. Pointer follows the cursor. Scroll drives additional property interpolation. Each motion type operates independently on its own set of properties, and they compose because they target different CSS properties. Scroll moves transform or opacity. Pointer targets different transform properties. Parallax uses its own scroll-linked transform. They read and write from the same DOM element but through different mechanisms, and framer-motion's underlying animation engine handles the coordination.

The implementation lives in the `useBgLayerMotion` hook at `packages/runtime-react/src/peblor/integrations/framer-motion/use-bg-layer-motion.ts`. This hook manages the lifecycle of each motion type — starting, stopping, and cleaning up as the background layer mounts and unmounts.

---

## Layer 4: Background transitions

Beyond per-layer continuous motion, Peblor supports transitions between entire background configurations. A background transition block defines two background references — a from-background and a to-background — along with easing configuration and a trigger mechanism. Each background can be any type: image, video, gradient variable, solid color, whatever the background system supports.

### Progress-driven transitions

In progress-driven mode, the transition progress is driven by page scroll position. You define a progress range as start and end fractions of the total scroll range, and the system maps that range to a zero-to-one progress value. The from-background fades out while the to-background fades in.

This is how you get common effects like a hero image that gradually dissolves into a solid color gradient as the user scrolls down, or a textured background that replaces a flat one mid-page. The transition component renders both backgrounds simultaneously with overlapping opacity — the from-background stays visible with decreasing opacity while the to-background appears with increasing opacity. The system never removes the from-background until the transition fully completes.

### Time-driven transitions

In time-driven mode, the transition fires on an event or a timer. It uses a CSS opacity transition with a configured duration and easing. When triggered — by a timer firing, by the user reaching a section, or by a custom event — the from-background crossfades to the to-background over the configured duration.

This mode is simpler than progress-driven and works for cases where scroll position isn't the right input. A page that cycles through background images on a timer, for example, would use time-driven transitions.

### Easing configuration

Background transitions support CSS easing function names like `ease-in-out`, `linear`, and `ease` for common cases, plus cubic bezier tuples for custom easing curves. The easing applies to the crossfade opacity curves, controlling whether the transition feels gradual throughout or accelerates at the start and decelerates at the end.

---

## How the runtime dispatches motion

The render chain for a motion-enabled element goes through several distinct layers, all in `packages/runtime-react/src/peblor/integrations/framer-motion/`.

The element renderer is the entry point. It checks whether the element has entrance timing configured. If it does, the element gets wrapped in an entrance animation wrapper. If not, but the element has gesture or layout motion — things like hover effects or tap animations — a motion-from-JSON component handles it directly.

The entrance animation wrapper receives the pre-resolved entrance motion keyframes that were computed during the pipeline's expand stage. It merges any gesture overrides from the element's inline motion object — so an element could have a fade entrance and also a hover scale-up, for example — and renders a framer-motion motion wrapper that drives the entrance animation. On the server side, it renders a plain div with no initial animation state, so the element is visible in static HTML. After hydration, if the element is already in the viewport, the entrance animation is skipped entirely to prevent a visible layout shift where elements pop in after being visible.

Exit motion goes through a separate exit wrapper that uses framer-motion's AnimatePresence. It resolves exit presets the same way entrance presets are resolved — all keyframes are pre-computed server-side.

Background layer motion runs independently through its own hook, which manages scroll, pointer, parallax, and trigger effects outside React's render cycle. This separation is deliberate: background animations, especially scroll-linked ones, must not cause React re-renders. The initial background layout is set by React, and then the motion hook takes over for runtime updates, writing directly to DOM style properties.

The full dispatch chain for any element on a page looks like this: the page renderer calls the section renderer, which wraps each section in an error boundary so a broken section doesn't take down the whole page. Inside each section, elements render through their entrance wrapper (if they have entrance motion), then their exit wrapper (if they have exit motion), then the motion-from-JSON layer for gesture and hover effects, and finally the actual element component that renders the content. Each layer is optional and skips itself if the element doesn't have the corresponding motion configuration.

---

## Where to go next

- [Architecture overview](overview.md) for the big picture of how motion fits into the system
- [Pipeline](pipeline.md) for how entrance motion resolution fits into the expand stage of the pipeline
- [Data model](data-model.md) for understanding how flat dictionaries and presets compose with motion configuration
- [Content authors: elements and motion](../content-authors/elements-and-motion.md) for practical authoring of element motion
- [Content authors: sections and backgrounds](../content-authors/sections-and-backgrounds.md) for background motion configuration
- [About these docs](../about-these-docs.md) for how these docs are organized and cross-reference each other
