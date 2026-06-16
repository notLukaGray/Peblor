# Sections and backgrounds

Sections are the big building blocks of a page. Stack them vertically, and you've got a page. Each section is a distinct visual chunk — a hero, a features grid, a contact form, a footer. Think of them as the rows of a blueprint.

Backgrounds live alongside sections, but behind everything else. A background paints the foundation of your page — a video, an image, a gradient, whatever — and sections sit on top of it.

There are seven section types and five background types. You'll probably use the same two or three most of the time, but knowing the rest keeps you from fighting the wrong tool.

## The seven section types

### contentBlock

**Your go-to. The workhorse. The one you'll reach for 80% of the time.**

A `contentBlock` is a flexbox container that stacks elements in a single column or row. It's for anything that doesn't need multi-column grid behavior — hero sections, text blocks, call-to-action strips, card lists, feature rows.

Key fields:

- **flow** — dictates direction: `"column"` stacks vertically, `"row"` stacks horizontally.
- **align** — how items align on the cross axis (think `align-items`).
- **distribute** — how items spread out on the main axis (think `justify-content`).
- **wrap** — whether items wrap to the next line when they run out of room.
- **gap** — space between elements. Responsive, so you can have tighter spacing on mobile.
- **contentWidth** / **contentHeight** — control the inner content area independently of the section wrapper. `"full"` fills available space, `"hug"` shrinks to fit, or set a specific size.
- **elements** — the list of element keys you want to render, in order.

If you're building a landing page, `contentBlock` is your default for the hero, the features strip, the testimonial row, and the call-to-action. Start here and only reach for something else when you need grid layouts or scroll behavior.

### sectionColumn

**The grid type. For when things need to sit side by side in defined columns.**

`sectionColumn` is a CSS grid container. Use it when a `contentBlock`'s single-axis flex layout won't cut it — magazine grids, dashboard layouts, navigation bars with items spread across the viewport.

Key fields:

- **columns** — how many columns in the grid.
- **columnAssignments** — maps each element key to a column index. You decide what goes where.
- **columnWidths** — set individual column widths. A narrow sidebar, a wide main content area.
- **columnGaps** — spacing between columns.
- **columnStyles** / **itemStyles** — per-column and per-item style overrides.
- **gridMode** — enables responsive grid behavior. The layout can adapt at different viewport widths.
- **gridAutoRows** — controls automatic row sizing when content overflows.
- **itemLayout** / **columnSpan** — control how elements span multiple columns.

The header and footer overlays are `sectionColumn` types. If you're laying out navigation links across columns, or building a sidebar + main content layout, this is your type.

### scrollContainer

**A content block that scrolls independently. Great for long-form storytelling.**

A `scrollContainer` is like a `contentBlock` but the content area scrolls separately from the rest of the page. This is how you build those cinematic project pages where the background stays fixed while the text scrolls over it.

Key fields:

- **elements** — ordered element keys, same as `contentBlock`.
- **scrollDirection** — vertical, horizontal, or both. Horizontal makes for a side-scrolling gallery.
- **scrollProgressTrigger** / **scrollProgressTriggerId** — lets child elements hook into the scroll position for reveal animations and progress bars.

Pair it with page-level `lockBody: true` when you want a full-viewport scroll experience within a single section. Don't use it for simple content that should just scroll with the page — that's what `contentBlock` is for.

### sectionTrigger

**The invisible ninja. Renders nothing, fires actions based on scroll position.**

A `sectionTrigger` has no visual output. You place it at a specific point in the section order, and it dispatches trigger actions when it scrolls into or out of view. It exists purely for behavior.

Key fields:

- **onVisible** / **onInvisible** — dispatch actions when the trigger enters or leaves the viewport.
- **threshold** — how much (0.0 to 1.0) needs to be visible before it counts.
- **triggerOnce** — if true, fires only the first time.
- **rootMargin** — CSS-style margin that extends or shrinks the detection area.

Use it for scroll-triggered background transitions, analytics events, or coordinating animations between sections. Place it in `sectionOrder` where you want the trigger to activate.

### formBlock

**A form. With fields. Handles submission through trigger actions.**

Unlike other section types that take a generic `elements` array, a `formBlock` has a `fields` array where each field defines its type, label, placeholder, and validation rules.

Key fields:

- **fields** — the form fields themselves. Each field is a block with type (text, textarea, select, checkbox, radio), label, placeholder, validation, and error messages.
- **action** — the trigger action type to fire on submission (like `navigate` or a custom action).
- **method** — HTTP method for the form submission.
- **actionPayload** — static key-value pairs sent alongside the form data.

The form itself doesn't know about your backend. You wire up submission via trigger actions — send data somewhere, show a confirmation, reset the fields. Contact forms, sign-ups, surveys: start here.

### revealSection

**An expandable section. Accordion, FAQ toggle, "read more" — that thing.**

A `revealSection` has a visible preview area and a hidden content area. The user clicks (or hovers) to reveal the full content underneath. Think FAQ lists, expandable project details, progressive disclosure.

Key fields:

- **revealedElements** — which elements are in the hidden content area.
- **collapsedElements** — which elements are visible in the preview state.
- **revealPreset** — controls the reveal animation (slide, fade, expand, etc.).
- **initialRevealed** — start expanded instead of collapsed.
- **toggleOnClick** / **revealOnClick** / **revealOnHover** — how the user triggers the reveal.
- **revealDurationMs** / **collapseDurationMs** — animation timing.
- **triggerMode** — how the reveal is triggered (click, hover, external).

It's better than building the same pattern manually with triggers and motion, because the behavior is standardized. Use it for FAQ sections, "about this project" panels on portfolio pages, or anywhere you need progressive disclosure.

### divider

**A spacer. A visual break. A nice line between sections.**

A `divider` is purely decorative. It doesn't hold elements — it just renders a visual separator (horizontal rule, spacer block, gradient fade) between sections.

Key fields:

- **layers** — multiple stacked layers for creating custom divider visuals (lines, gradients, patterns on top of each other).
- **fill** — background color, theme-aware.
- **height** — how tall the divider is.
- **effects** — glass, blur, drop shadow, same as any section.

Don't use a divider for functional spacing (that's what padding and margin are for). Use it for visual ornamentation — a subtle gradient fade between hero and features, or a thin line separating two major sections.

## Common properties — the shared stuff

All section types share a core set of properties. These live across six axes:

**Layout** — `flow`, `align`, `distribute`, `wrap`, `gap` for flex behavior. `columns` and friend for grid. These control how elements sit inside the section.

**Sizing** — `width`, `height`, `contentWidth`, `contentHeight`, `minHeight`, `maxWidth`. Many of these accept responsive tuples like `["100%", "80%"]` for mobile-first layouts.

**Appearance** — `fill` (background color, theme-aware via `{ light, dark }`), `effects` (glass, backdrop blur, drop shadow, glow, inner shadow, plus filter effects like brightness, contrast, blur, grayscale), `layers`, `border`, `borderRadius`.

**Motion** — `motionTiming` controls entrance animations (fade, slideUp, blurIn, popIn, and more through named presets). `sticky` / `stickyOffset` for sticky positioning. `scrollSpeed` for parallax.

**Triggers** — `onVisible`, `onInvisible`, `onProgress` fire actions based on scroll position and viewport events. Fine-tune with `threshold`, `triggerOnce`, and `rootMargin`.

**Children** — `elements` for most types, `fields` for forms, `revealedElements`/`collapsedElements` for reveal sections.

Many values are responsive or theme-aware. If a field accepts a responsive tuple, pass `[mobile, desktop]` values. If it accepts a theme object, pass `{ light: "...", dark: "..." }` and the right value automatically shows based on the user's theme.

## The five background types

Backgrounds are definition blocks, not sections. They live in the page's `definitions` dictionary, and the page points to one of them via `bgKey`. Each type paints behind your sections.

### backgroundImage

**A static image. Simple, fast, reliable.**

Just an image URL (CDN asset reference) and optional overlay. Renders as a CSS background-image.

Key fields: **image** (required), **overlay** (optional theme-aware color), plus CSS background properties like **backgroundSize**, **backgroundPosition**, **backgroundRepeat**, **backgroundAttachment**.

When to use it: almost any page that needs something behind the content but doesn't need video or animated gradients. If you're not sure which background to use, start here. It loads fast, works everywhere, and doesn't need special handling.

### backgroundPattern

**A repeating image. For textures, dots, grid lines, and brand patterns.**

Like `backgroundImage`, but the image repeats by default. Set `repeat` to `"repeat-x"`, `"repeat-y"`, or `"no-repeat"` if you only want one instance.

Key fields: **image** (required), **repeat** (optional, defaults to both axes).

When to use it: decorative backgrounds with repeating textures or patterns. Subtle noise overlays, brand watermarks, geometric grid backgrounds.

### backgroundVideo

**A video background. Cinematic, but heavy.**

Full-viewport video that plays automatically and loops. Requires a CDN video reference and an optional poster image for the loading state.

Key fields: **video** (required), **poster** (optional image shown while loading), **overlay** (optional theme-aware color overlay for readability).

The overlay is important — a semi-transparent layer between the video and your content makes text readable. Always provide a poster image so the page looks good while the video loads.

When to use it: sparingly. Project hero pages where atmosphere matters. Splash pages built around brand video. Video backgrounds are heavy and impact load times. Reserve them for moments where motion genuinely adds something.

### backgroundVariable

**CSS gradients with per-layer motion. No video file needed, just math.**

`backgroundVariable` builds layered, animated backgrounds entirely in CSS. Each `layers` entry is a gradient or color with its own blend mode, opacity, and — here's the fun part — its own motion behavior.

Each layer can have a **motion** array with any combination of:

- **loop** — the layer rotates, pans, or pulses continuously. Good for slow ambient motion.
- **parallax** — moves at a different speed than the scroll. Creates depth.
- **pointer** — follows the cursor. A subtle shift as the user moves their mouse.
- **scroll** — tied to page scroll progress. Moves through a defined range.
- **entrance** — animates in when the page loads.
- **trigger** — responds to a trigger action event.

Multiple motion types can run simultaneously on the same layer. A layer can have a slow loop, a parallax effect, and an entrance animation, all composing together.

When to use it: hero backgrounds, splash pages, any page that needs rich animation without loading a video file. More performant than video, more expressive than a static image. It's also the most complex background type, so start simple and layer up.

### backgroundTransition

**Not a standalone background — it's a bridge between two backgrounds.**

A `backgroundTransition` defines an animated transition from one background to another. You tell it where to start (a `from` background), where to end (a `to` background), and how to animate between them.

Key fields: **from** (source background definition), **to** (target background definition), **mode** — how the transition activates:

- `"progress"` — driven by scroll position via `progressRange` (start/end values between 0 and 1).
- `"time"` — driven by a timer over a set duration.
- Trigger-based — activated by a trigger action event.

Plus **duration**, **easing** (CSS easing like `"ease-in-out"`), and more.

When to use it: a project page that fades from a video hero to a solid color as you scroll down. A landing page that transitions through several gradient states based on scroll position. Any page where the background should evolve as the user moves through the content.

## Connecting backgrounds to pages

A page connects to its background via the `bgKey` field at the page level. The value is a string key that must exist in the page's `definitions` dictionary.

For background transitions, the `transitions` array on the page references `from` and `to` keys instead.

If a page doesn't set `bgKey`, it has no background — just whatever the browser provides as a default. This is fine for content-heavy pages, but for project pages, hero pages, or any page with a visual identity, pick a background.

## Where to go next

- [Elements and motion](elements-and-motion.md) — the element types, nesting with elementGroup, entrance animations, gesture-based motion
- [Presets](presets.md) — how presets compose, naming conventions, common pitfalls
- [Pages and overlays](pages-and-overlays.md) — page structure, metadata, sectionOrder, overlay system
- [Getting started](getting-started.md) — editing workflow, tools, troubleshooting

---

Back to [about-these-docs.md](../about-these-docs.md) | Architecture: [overview.md](../architecture/overview.md)
