# Sections and backgrounds

Sections are the top-level building blocks of a page. Each section is a container that holds elements, controls layout, and can carry effects, triggers, and motion. Think of sections as the rows of a page — each one is a distinct visual block that stacks vertically. Backgrounds are standalone definition blocks that a page references by key — they paint behind everything else, giving the page its visual foundation.

This doc covers all seven section types, all five background types, and the properties they share. Most of the time you'll reach for the same two or three section types, but it's worth knowing what the others do so you don't reinvent something that already exists.

## The seven section types

Every section is a variant of the `sectionBlockSchema`, defined at `packages/contracts/src/peblor/core/peblor-schemas/section-block-schemas.ts`. The `type` field determines the section's rendering behavior and which additional fields are available. Pick the type that matches what you're trying to build.

### contentBlock

The workhorse. You'll use this more than any other section type. A `contentBlock` is a flexbox container that holds elements in a single column or row. It's the default choice for almost any layout that doesn't need multi-column grid behavior.

What you can configure:

- **flexDirection**, **flexWrap**, **gap**, **alignItems**, **justifyContent** — standard flexbox properties. Stack things vertically (`column`) or horizontally (`row`). Control how they wrap, how much space between them, and how they align.
- **elementOrder** — an array of string keys that controls which elements render and in what order.
- **definitions** — a nested dictionary where each key from `elementOrder` maps to an element definition.
- **contentWidth** and **contentHeight** — control the inner content area independently of the section's outer dimensions. Set `contentWidth: "full"` to fill available space, `"hug"` to shrink to fit content, or a specific CSS value like `"800px"`.

When to use it: hero sections, text blocks, card layouts, call-to-action strips, feature lists — anything that stacks elements vertically or horizontally in a single column or row. If the page content fits in one column, it's probably a `contentBlock`.

### sectionColumn

A CSS grid container for multi-column layouts. Use this when your content needs to be arranged in discrete columns rather than a single flex flow. Think magazine layouts, dashboard grids, or navigation bars with items spread across the viewport.

What makes it different from contentBlock:

- **columns** — the number of columns in the grid.
- **columnAssignments** — maps each element key to a column index. You decide which element goes in which column.
- **columnWidths** — sets column widths individually. You can have a narrow sidebar column and a wide main content column.
- **columnGaps** — controls the gap between columns.
- **columnStyles** and **itemStyles** — provide per-column and per-item style overrides.
- **gridMode** — enables responsive grid behavior. The grid can adapt its layout at different viewport widths.
- **gridAutoRows** — controls automatic row sizing when content overflows the defined rows.
- **itemLayout** and **columnSpan** — control how elements span multiple columns or occupy specific layout slots.

When to use it: the header and footer overlays are `sectionColumn` types — they lay out navigation links across several columns. Use it for any layout where content should sit side by side in defined columns. If you find yourself fighting with a `contentBlock` to get two columns side by side, switch to `sectionColumn`.

The schema validates that element IDs are unique, column assignments reference real columns, and column spans actually resolve. You'll get clear diagnostics if something doesn't add up.

### scrollContainer

A `contentBlock` variant that makes its content area scrollable. Same `elementOrder` plus nested `definitions` pattern as `contentBlock`, but the content scrolls independently of the page.

When to use it: sections where the content exceeds the viewport and should scroll separately from the rest of the page. Typically used in combination with page-level scroll settings like `lockBody: true` when you want a full-viewport scrolling experience within a specific section. Project pages with long-form content often use this — the background stays fixed while the content scrolls over it.

### sectionTrigger

An invisible section that doesn't render any visual content. Instead, it fires trigger actions based on viewport visibility. It exists purely for behavior, not visuals.

How it works:

- **onVisible** and **onInvisible** — dispatch actions when the section scrolls into or out of view.
- **threshold** — how much of the section needs to be visible before it counts as "visible" (0.0 to 1.0).
- **triggerOnce** — if true, the trigger fires only the first time the section becomes visible. After that, it stops listening.
- **rootMargin** — CSS-style margin around the viewport that extends or shrinks the visibility detection area.

When to use it: scroll-triggered background transitions, analytics events, coordinating animations between sections, lazy-loading content — anything that needs to happen at a specific scroll position without the user seeing a visual container. Place a `sectionTrigger` at the point in `sectionOrder` where you want the trigger to activate.

### formBlock

A form container with structured fields. Unlike other section types that use `elementOrder` with individual element types, a `formBlock` has a `fields` array where each field defines everything about itself.

What goes in a field:

- **type** — the kind of input: text, textarea, select, checkbox, radio group, and others.
- **label** — visible label text.
- **placeholder** — placeholder text inside the input.
- **validation rules** — whether the field is required, minimum/maximum length, pattern matching.
- **error messages** — what to show when validation fails.
- **layout properties** — how the field sits in the form layout.

Form submission is configured through trigger actions — you wire up what happens when the user submits (send data somewhere, show a confirmation, reset the form). The form itself doesn't know about your backend; it just fires a trigger.

When to use it: contact forms, sign-up forms, surveys, questionnaires — any page that needs user input. If your page has fields and a submit button, start here.

### revealSection

An expandable or collapsible section. It renders a summary or preview state that the user can click to reveal the full content underneath. Think accordion, FAQ toggle, or "read more" pattern.

How it works:

- **revealPreset** — controls the open/close animation. References a named entrance preset from `REVEAL_PRESET_NAMES` defined at `packages/contracts/src/peblor/core/peblor-motion-defaults.ts`.
- The section has a visible preview area and a hidden content area. When the user triggers the reveal, the content area animates open.
- The animation preset determines how it opens — slide down, fade in, expand, etc.

When to use it: FAQ sections, long-form content with togglable details, progressive disclosure patterns, "about this project" expandable panels on portfolio pages. It's better than building the same pattern manually with triggers and motion because the behavior is standardized.

### divider

A visual spacer or decorative line between sections. Minimal and purely presentational. It doesn't hold elements — it just exists between them.

What it can do:

- Render a horizontal rule, a spacer block, or a more complex decorative element.
- The `layers` field supports multiple stacked layers for creating custom divider visuals (lines, gradients, patterns layered on top of each other). The `dividerLayerSchema` defines what each layer looks like.
- It's a clean alternative to adding margin or padding to adjacent sections. If two sections need breathing room, a `divider` is the semantically correct way to add it.

When to use it: between major sections where you want a visual break — a thin line, a color transition, a gradient fade. Don't use a `divider` for functional separation (that's what section spacing is for). Use it for visual ornamentation.

## Common properties — everything sections share

All seven section types share a common set of properties defined at `baseSectionPropsSchema` in `packages/contracts/src/peblor/core/peblor-schemas/section-block-base-schemas.ts`. These are the properties you'll reach for most often. Understanding them saves you from reinventing the wheel.

### Layout and sizing

- **width** and **height** — set section dimensions. Accepts responsive values: a single string like `"100%"`, or a tuple of `[mobile, desktop]` values if you want different sizes at different breakpoints.
- **minWidth**, **maxWidth**, **minHeight**, **maxHeight** — boundary constraints. Use `maxWidth` to keep a section from stretching too wide on large screens. Use `minHeight` to ensure a section has enough vertical presence even when empty.
- **padding** and **margin** — shorthand properties for all four sides at once. Also available per-side: `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`, `marginLeft`, `marginRight`, `marginTop`, `marginBottom`.
- **align** — horizontal alignment of the section within its parent. Options like `"center"`, `"left"`, `"right"`.
- **overflow**, **overflowX**, **overflowY** — control what happens when content exceeds the section bounds. `"hidden"` clips the content. `"auto"` adds scrollbars when needed.
- **aspectRatio** — forces an aspect ratio on the section, like `"16/9"` or `"1/1"`. The section height adjusts automatically based on its width.
- **zIndex** — stacking order. Higher values sit on top of lower values. Use this when sections overlap.

### Fill and effects

- **fill** — the section's background color or gradient. Accepts a theme-aware value: a plain CSS string like `"#000"`, or an object with `{ light, dark }` fields for automatic theme switching. When you set `{ "light": "#fff", "dark": "#111" }`, the section automatically picks the right value based on the user's theme.
- **effects** — an array of visual effect objects. Multiple effects can combine on a single section. Here's what's available:
  - **glass** — frosted glass / glassmorphism. Configurable blur, bezel width, refractive index, and specular highlights. This is how the header and overlays get that translucent look.
  - **backdropBlur** — backdrop blur filter on the section. Blurs whatever is behind the section.
  - **dropShadow** — box shadow below the section. Good for giving sections depth on light backgrounds.
  - **innerShadow** — inset box shadow. Creates a recessed look.
  - **glow** — outer glow via box-shadow. Good for accent sections or buttons.
  - **opacity** — section opacity as a visual effect. Unlike the opacity property, this one is processed as a CSS filter effect.
  - **blur** — Gaussian blur on the section content itself.
  - **brightness**, **contrast**, **saturate** — CSS filter adjustments for the section.
  - **grayscale**, **sepia** — color transformation filters. Use sparingly.

  Effects are processed by `packages/core/src/internal/section-effects.ts`, which converts each effect object into CSS properties. You can stack multiple effects on one section — a glass effect plus a drop shadow, for example.

- **borderRadius** — rounded corners. Responsive, so you can have different radii on mobile and desktop.
- **border** — full border shorthand. Or use per-side variants: `borderTop`, `borderRight`, `borderBottom`, `borderLeft`.
- **boxShadow**, **filter**, **backdropFilter**, **clipPath** — direct CSS property passthroughs. If there's an effect not covered by the effects array, you can set the raw CSS property here.

### Positioning

- **fixed** / **fixedPosition** / **fixedOffset** — pins the section to the viewport edge. The header uses `fixed: true` with `fixedPosition: "top"` and a `fixedOffset` to control exact placement.
- **sticky** / **stickyOffset** / **stickyPosition** — sticky positioning within the scroll container. The section stays in the normal flow until you scroll past it, then sticks to the viewport edge. Great for sidebars or persistent controls.
- **position**, **top**, **right**, **bottom**, **left**, **inset** — raw CSS positioning overrides when the shorthand properties don't cover your use case.

### Interaction and visibility

- **cursor** — CSS cursor style. Accepts values like `"pointer"`, `"grab"`, `"zoom-in"`, `"not-allowed"`. Changes the mouse cursor when hovering over the section.
- **pointerEvents** and **userSelect** — control input interaction and text selection. Set `pointerEvents: "none"` to make a section transparent to mouse events. Set `userSelect: "none"` to prevent text selection.
- **visibleWhen** — a conditional visibility rule based on variable state. A section with a `visibleWhen` condition only renders when the condition is met. This lets you show or hide sections dynamically without editing the page file.
- **opacity** — section opacity from 0 (invisible) to 1 (fully visible).

### Scroll-based behavior

- **scrollOpacityRange** — maps scroll progress to an opacity fade. Configured with an `input` range (scroll progress, like `[0, 0.5]`) and an `output` range (opacity values, like `[1, 0]`). The section fades in or out as the user scrolls through the specified range.
- **scrollSpeed** — parallax scroll speed multiplier. Values less than 1 make the section scroll slower than the page. Values greater than 1 make it scroll faster. A value of 0 makes it fixed. Use subtle values — `0.5` or `1.5` — to avoid disorienting effects.

### Triggers

Sections can carry trigger configurations that fire actions based on events. These are how you make your page respond to user behavior without writing JavaScript.

- **onVisible** / **onInvisible** — fire when the section enters or leaves the viewport. Good for analytics, starting animations, or lazy-loading content.
- **onProgress** / **onViewportProgress** — fire continuously based on scroll progress through the section. The callback receives a progress value from 0 to 1.
- **keyboardTriggers** — fire actions on key press. Supports modifiers like shift, ctrl, alt, meta. Use for keyboard shortcuts within a section.
- **timerTriggers** — fire actions after a delay or at an interval. Use for timed animations, auto-advancing content, or delayed reveals.
- **cursorTriggers** — fire actions based on cursor position within the section. Detect hover, enter, leave, or movement within bounds.
- **scrollDirectionTriggers** — fire on scroll up or scroll down within the section.
- **idleTriggers** — fire after the user has been idle for a period. Good for showing secondary content or triggering attention-grabbing effects when someone stops scrolling.
- **variableTriggers** — fire when a watched variable changes value. Links into the variable system for reactive behavior.

### Motion

- **motion** — inline framer-motion animation properties. Includes `initial`, `animate`, `exit`, `transition`, `whileHover`, `whileTap`, `whileInView`, and more. This is where you put custom animation values that don't come from a preset.
- **motionTiming** — entrance animation configuration. Includes the `entrancePreset` name (fade, slideUp, blurIn, popIn, tiltIn, etc.) and timing parameters like delay and duration. The entrance presets themselves live at `content/framer-motion/`. You don't write JavaScript to add a new animation; you add JSON to that directory.
- **reduceMotion** — opt-in to reduced motion behavior for this section, independent of the user's system setting. Use this when a section's animation would be disorienting or problematic for users sensitive to motion.

## The five background types

Backgrounds are definition blocks, not sections. They live alongside sections in the page's `definitions` dictionary, and the page points to one via `bgKey`. The schema is defined at `packages/contracts/src/peblor/core/peblor-schemas/background-block-schemas.ts`.

The runtime component map at `packages/runtime-react/src/peblor/background/index.ts` dispatches each type to its lazy-loaded component. If a background type doesn't have a renderer registered, it simply doesn't render — the schema validates, but nothing appears on screen.

### backgroundVariable

Multi-layer CSS gradients with per-layer motion. This is the most expressive background type, and the most complex. It lets you build layered, animated backgrounds entirely in JSON — no video file, no image asset, just math that the browser renders.

Each layer is defined as a `bgVarLayerSchema` object with:

- **fill** — a gradient or color. Can be a CSS gradient string like `"linear-gradient(135deg, #667eea 0%, #764ba2 100%)"` or a flat color.
- **blendMode** — how this layer blends with the layer below. Values like `"multiply"`, `"screen"`, `"overlay"`, `"soft-light"`. CSS background-blend-mode values, all available.
- **opacity** — layer opacity.
- **backgroundSize** and **backgroundPosition** — control the layer's size and position within the background area.

Layers stack in order — the first layer renders at the bottom, subsequent layers render on top. This is important: if you want a gradient behind a pattern, the gradient goes first.

**The magic is per-layer motion.** Each layer can have a `motion` array that animates the layer independently from every other layer. Six motion types are supported:

- **loop** — continuous animation. The layer rotates, pans, or pulses on an infinite cycle. Good for subtle ambient motion — a slow-rotating gradient, a drifting nebula effect.
- **parallax** — moves the layer relative to scroll position at a different speed than the page scrolls. Creates depth — foreground layers move faster, background layers move slower.
- **pointer** — follows the cursor position. The layer shifts slightly as the user moves their mouse. A small amount goes a long way here — too much and it's disorienting.
- **scroll** — ties the layer position to page scroll progress. The layer moves through a defined range as the user scrolls. Different from parallax in that it's bound to a specific scroll range, not a speed multiplier.
- **entrance** — animates the layer in when the page loads. The layer fades, slides, or scales into position.
- **trigger** — animates in response to a trigger action event. The layer stays still until something tells it to move.

Multiple motion types can run simultaneously on the same layer. A layer can have a slow loop, a parallax effect, and an entrance animation, and they compose additively. The motion schema lives at `packages/contracts/src/background/motion/bg-layer-motion-schema.ts`.

When to use it: splash pages, hero backgrounds, project landing pages, any page that needs a rich animated background without loading a video file. It's more performant than video and more flexible than a static image.

### backgroundVideo

A full-viewport video background. Requires a `video` path (a CDN asset reference to the video file) and an optional `poster` image (shown while the video loads). The video plays automatically and loops by default.

- **overlay** — an optional color overlay on top of the video. Can be a theme-aware light/dark object. This is how you make a video background readable underneath text — put a semi-transparent overlay between the video and the page content.
- The playback component lives at `packages/runtime-react/src/peblor/background/BackgroundVideo.tsx`.

When to use it: project landing pages with cinematic hero video, splash pages where motion and atmosphere matter more than performance, pages where the brand identity is tied to video content. Use it sparingly — video backgrounds are heavy and can hurt page load times. Always provide a poster image so the page looks good while the video loads.

### backgroundImage

A static image background. Simple and performant. Requires an `image` path (a CDN asset reference). Renders as a CSS `background-image`.

When to use it: almost any page that needs a background but doesn't need video or animated gradients. It's the default choice for "I need something behind my content." It loads fast, doesn't require any special handling, and works everywhere. If you're not sure which background type to use, start here.

### backgroundPattern

A repeating image pattern. Requires an `image` path and an optional `repeat` value (`"repeat"`, `"repeat-x"`, `"repeat-y"`, `"no-repeat"`). Default repeat behavior follows CSS background-repeat conventions — if you don't specify, it repeats on both axes.

When to use it: decorative backgrounds where you want a repeating texture, pattern, or logo. Use it for subtle textures (noise, dots, grid lines) or brand patterns. If you set `"no-repeat"`, it renders as a single instance of the image at its natural size, positioned at the top-left by default.

### backgroundTransition

An animated transition between two background definitions. This isn't a standalone background itself — it's a bridge between two backgrounds.

Each transition contains:

- **from** — a full nested background definition (any type) to transition from.
- **to** — a full nested background definition (any type) to transition to.
- Three activation modes:
  - **"progress"** — driven by scroll position. The `progressRange` field (`start` and `end` as values between 0 and 1) controls when the transition activates during scroll. Start at 0, end at 0.5 means the transition completes by the time the user has scrolled halfway down the page.
  - **"time"** — driven by a timer. The transition happens automatically over a set duration.
  - Activated by a trigger action — something on the page fires an event, and the transition runs.
- **easing** — CSS easing function string like `"ease-in-out"` or `"cubic-bezier(0.4, 0, 0.2, 1)"`.

The page-level `transitions` array can reference multiple background transitions. A SCROLL-based transition uses `source: "page"` or `source: "trigger"` for different activation behaviors.

When to use it: pages where the background changes as the user scrolls — a project page that fades from a video background at the top to a solid color as you scroll down, or a landing page that transitions through several gradient states based on scroll position.

## Connecting backgrounds to pages

A page connects to its background through the `bgKey` field at the page level. The value is a string key that must exist in the page's `definitions` dictionary. For page-level background transitions, the `transitions` array on the page references `from` and `to` background keys.

Background transitions are processed at the page level, not the section level. A section can trigger a background transition via its trigger actions, but the transition definition lives on the page. The code that handles background resolution and transitions is at `packages/core/src/internal/peblor-resolve-assets-server.ts`.

If a page doesn't set `bgKey`, it renders with no background — the page background is whatever the browser or parent provides. This is fine for content-heavy pages, but for project pages, hero pages, or any page with a visual identity, you'll want a background.

## Where to go next

- [Elements and motion](elements-and-motion.md) — the 25+ element types, nesting with elementGroup, entrance animations, gesture motion
- [Presets](presets.md) — how presets compose, naming conventions, common mistakes
- [Pages and overlays](pages-and-overlays.md) — page structure, metadata, sectionOrder, overlay system
- [Getting started](getting-started.md) — editing workflow, tools, troubleshooting

---

Back to [about-these-docs.md](../about-these-docs.md) | Architecture: [overview.md](../architecture/overview.md)
