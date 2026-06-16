# Elements and motion

Sections are the skeleton of a page. Elements are everything else -- the muscle, the skin, the parts people actually see and click. Headings, body text, images, videos, buttons, dividers, 3D models, audio players, marquees, tabs, tooltips, even the thing that counts numbers up real fast. If it's on screen, it's an element.

Peblor ships **34 element types**, each with its own field set. You don't need to memorize them all -- the MCP tools (`explain_element_type` and `get_element_schema`) will tell you exactly what fields an element accepts. But you should know the lay of the land so you reach for the right one when you're building.

## How elements live inside sections

Elements don't float around loose. They live in sections. A `contentBlock` section has two things: an `elementOrder` array (keys in render order) and a `definitions` map (a flat dictionary of actual element blocks). The renderer walks through `elementOrder`, looks up each key in `definitions`, and draws them in sequence.

Sound familiar? It should. Pages do the same thing with sections: `sectionOrder` plus `definitions`. Sections do it with elements: `elementOrder` plus `definitions`. The pattern repeats wherever ordering matters. Give it a list of keys and a flat dictionary of content, and it figures out what to render.

Most sections are single-level -- a flat list of elements, rendered top to bottom (or left to right, depending on the section's layout). But one element type changes the game.

## elementGroup -- the container with its own gravity

ElementGroup is an element that holds other elements. It has its own `elementOrder` and `definitions`, just like a section does. This is the escape hatch from flat-land: a group inside a section that holds its own children with their own layout rules.

Why bother? Say you have a card with a heading, some body text, and a button. That's a flat list, works fine. Now say the heading and body need to stack vertically while the button sits below. Or you've got a toolbar with a row of icons. Or stat numbers with labels beneath each one. You want a container that moves and animates as a unit, with layout properties that apply only to its children.

That's elementGroup. Children inside it position relative to the group, not the section. The group controls its own flex direction, alignment, gap, and padding. Groups can nest inside other groups, though you rarely need more than two levels before you start questioning your life choices.

## elementInfiniteScroll -- groups that keep loading

Works just like elementGroup, but with an extra trick: it loads more content when you scroll to the bottom. Its children can use a loading preset for skeleton states while new content arrives. Feed layouts, paginated galleries, anything that keeps coming as you scroll.

## The full element catalog

This is not a specification. This is a tour. Here's what you can reach for.

### Text elements

**elementHeading** -- Renders text as an h1 through h6. You control both the semantic level (which heading number) and the visual variant (display, section, label, meta, kicker). A display variant is giant and dramatic for hero sections. A kicker is a small uppercase lead-in that floats above a heading.

**elementBody** -- Paragraph text. The workhorse for prose. Variants let you pick the right feel: standard for body copy, fine for small print, lead for opening paragraphs, mono for code-like text, serif for editorial vibes, truncated for previews that trail off with an ellipsis. If you're writing words that aren't a heading, this is your friend.

**elementRichText** -- HTML content rendered as innerHTML. Use sparingly. It bypasses Peblor's styling system entirely, which means you're on your own for making it look right. Exists mainly for importing formatted content from external sources -- WordPress exports, converted markdown, CMS embeds. For anything you're writing by hand, stick with heading and body.

**elementBlockquote** -- A pull quote with attribution. Got a quote that needs to stand out visually? This is it.

**elementCode** -- Displays code with syntax highlighting. Language detection, line numbers, the works.

**elementList** -- Ordered and unordered lists. Because sometimes you just need bullet points.

### Media elements

**elementImage** -- Your standard image. Set the path, tell it how to fit (cover, contain, fill), pick an aspect ratio, and you're done. Behind the scenes, the pipeline signs your CDN URLs and computes responsive srcsets. You just point it at an image and say how it should behave.

**elementVideo** -- A lightweight inline video player with poster image, autoplay, loop, mute, and basic controls. Good for a background clip or a simple embed. If you need keyboard shortcuts, gesture regions, and overlay controls, reach for a video module instead (covered in the modules doc).

**elementAudio** -- An inline audio player. Same deal as elementVideo: lightweight option. If you need full transport controls and waveform visualization, use an audio module.

**elementVector** -- An inline SVG defined entirely in JSON. Shapes, paths, gradients, stroke and fill styling -- all as data, not an SVG file. Great for theme-aware icons without loading external files.

**elementSVG** -- The opposite approach: embeds an external SVG by URL. Use this when you have a complex SVG that would be silly to describe inline.

**elementModel3D** -- A full Three.js 3D model viewer. This is one of the heaviest elements -- it's code-split so it doesn't slow down pages that don't want 3D models. Camera controls, lighting, environment maps, materials, post-processing effects. For when flat images just aren't cutting it.

**elementRive** -- Plays Rive vector animations with state machine controls. Rive lets you build interactive animations with state machines, and this element gives you artboard selection, animation triggers, and playback controls.

**elementLottie** -- Plays Lottie animations (Airbnb's JSON-based animation format). Code-split like elementModel3D, so it only loads when a page uses it.

**elementEmbed** -- Embeds external content by URL. YouTube, Vimeo, maps, anything you'd put in an iframe. Controls for sandboxing, permissions, and loading behavior.

### Interactive elements

**elementButton** -- A clickable button. Visual variants (primary, secondary, ghost, outline, text), icon slots on either side of the label, and trigger actions. The action system is how things happen when a user clicks: navigate to another page, open a modal, set a variable, or control media playback.

**elementLink** -- An anchor element. Takes an href (external URL or internal route), optional new-tab behavior, and visual styling. For internal routes, the runtime handles smooth client-side navigation.

**elementTabs** -- A tabbed interface. Each tab has a label and a content area. Clicking a tab switches which content is visible. Purely declarative -- you define the tabs and their content in JSON, and the runtime handles the interaction. Supports orientation, keyboard navigation, and mobile collapse behavior.

**elementTooltip** -- A hover-triggered tooltip with positioned overlay. You control the placement (top, bottom, left, right), show and hide delays, whether it follows the cursor, and whether it auto-flips to stay on screen.

**elementDrag** -- Makes its children draggable. Set constraints (bounding box), elasticity (how much it bounces back), and snap behavior (snap to grid or positions). Uses framer-motion's drag under the hood.

**elementInput** -- A text input field for forms. Used inside formBlock sections.

**elementRange** -- A range slider input. Volume controls, filters, adjustable values.

**elementFormField** -- A complete form field with label, input, validation rules, and error display. Used inside formBlock sections.

### Layout and decoration

**elementSpacer** -- Invisible spacer that adds vertical or horizontal space. Simple, essential, one job.

**elementDivider** -- A visual divider line. Horizontal or vertical, any color, any thickness. Good for separating groups of content.

**elementMarquee** -- A scrolling ticker. Text that scrolls horizontally or vertically on a loop. Set the speed and whether it pauses on hover.

**elementCounter** -- An animated number counter. Counts from a start value to an end value, typically triggered when it scrolls into view. Good for stats, metrics, "people served" numbers.

**elementScrollProgressBar** -- A progress bar that tracks scroll position through a container or the full page. Custom height, fill color, track background. Great for article pages.

**elementImageCompare** -- A before-and-after image comparison slider. Two images on top of each other, draggable divider to scrub between them.

**elementTable** -- Good old-fashioned tables. Define your rows, headers, captions, and column alignment. No more.

**elementVideoQualitySelect** -- A quality selector dropdown for video players. Pairs with the video module system.

**elementVideoTime** -- Displays the current time of a playing video. Like a smart clock for your media.

### Containers

**elementGroup** -- Covered above. A container with its own elementOrder and definitions. For anything that should move and animate as a unit.

**elementInfiniteScroll** -- Also covered above. elementGroup with scroll-to-load pagination.

## Motion for content authors

Every element can carry a `motionTiming` object. That object controls animation: entrance effects, exit behavior, scroll-triggered reveals, stagger timing. It handles the when and how of motion.

If an element doesn't have `motionTiming`, it's static. No animation wrapper, no entrance effect, no gesture feedback. It just shows up.

Motion itself is split across two keys: `motionTiming` handles orchestration (trigger, preset, stagger, viewport rules), while `motion` handles gesture responses (what happens when someone hovers or clicks). The pipeline resolves entrance presets into baked keyframes at build time, so the browser never needs to look up animation files. Your animations are computed, resolved, and ready to play before anyone visits.

### Entrance presets

The most common thing you'll do is make elements animate in when they scroll into view. Instead of writing keyframes -- and nobody wants to do that -- you reference a named entrance preset. Nine of them live in the framer-motion presets file:

- **fade** -- fades from invisible to visible. The simplest.
- **slideUp** and **slideDown** -- slides vertically into position, with configurable distance.
- **slideLeft** and **slideRight** -- slides horizontally.
- **zoomIn** and **zoomOut** -- scales in or out as it appears.
- **popIn** -- scale up, fade in, and slide slightly, all at once. Great for cards and grid items.
- **blurIn** -- fades in while a blur filter resolves. Gives a lens-focusing effect.
- **tiltIn** -- rotates slightly as it enters. A subtle touch for gallery items or decorative elements.

To apply one, set `entrancePreset` on the element's `motionTiming` block:

```json
"motionTiming": {
  "entrancePreset": "fade",
  "trigger": "onFirstVisible"
}
```

The `trigger` field tells the runtime when to fire the animation:

- **onMount** -- animate as soon as the element renders. For things that should appear immediately but with a bit of motion.
- **onFirstVisible** -- animate the first time it scrolls into view. The most common choice. Elements below the fold slide or fade in as you scroll down, but only the first time.
- **onEveryVisible** -- animate every time it enters the viewport. Good for things that should catch attention each time they appear.

### Exit presets

Same idea, just in reverse. Set `exitPreset` on `motionTiming`, picking from the same nine presets. The exit animation plays when the element leaves the DOM -- when a modal closes, when tab content switches, or when the element scrolls out of view. The runtime uses AnimatePresence under the hood for smooth unmount animations.

### Stagger children

Set `staggerChildren` on a section's motionTiming, and its children won't all animate at once -- they'll cascade. A stagger of 0.1 seconds with three children means child 2 starts one-tenth of a second after child 1, and child 3 starts one-tenth after child 2. Creates a polished ripple effect instead of everything jumping in at once.

This only works if the children have their own entrance presets. The parent controls the timing -- the when. Each child controls the animation itself -- the what.

### Gesture-based motion

Beyond entrance and exit, elements can respond to user gestures through the `motion` object:

- **onHover** -- what happens when the user hovers over the element. Common uses: scale up slightly, change color, reveal an underline. That button that grows a bit when you mouse over it? That's onHover.
- **onPress** -- what happens while the user is pressing down. A button that compresses slightly when clicked uses onPress.
- **onVisible** -- what happens while the element is in the viewport. Different from entrance: this is a continuous state, not a one-time animation. An element could pulse gently while it's visible.
- **onDrag** -- what happens while the user is dragging the element (only relevant if drag is enabled). Typically a slight scale-up to indicate it's being manipulated.

Gesture keyframes let you animate dimensions (width, height) -- unlike entrance keyframes, where layout properties are deliberately stripped. This is because a hover-expand card needs to animate its size, and the renderer handles that correctly.

### The inheritMode system

When you put an element inside an elementGroup and both the group and the child have motion, things can get weird. Framer Motion can produce conflicting behavior -- nested entrance animations that fight each other, children animating in ways that conflict with the parent's layout.

Three modes on the group's `motion.inheritMode` control this:

- **isolate** -- children don't inherit any motion from the parent. Each child starts from its own defaults. Use this when the group's entrance shouldn't affect its children. If the group fades in as a unit but the children have their own stagger timing, isolate keeps them from fighting each other.
- **inherit** -- children inherit the parent's motion config as their base, with their own overrides layered on top. Use this when the group and its children should animate as a coordinated unit.
- **auto** -- the default. Children inherit only when the element is a container (elementGroup, elementInfiniteScroll) with explicit motion defined. Covers the common case without you having to think about it.

If you ever see weird animation behavior in a group -- elements animating when they shouldn't, or not animating when they should -- check inheritMode. Isolate is usually the fix.

### What happens with partial motion configs

If you only set `onHover` with a scale value, the defaults system fills in everything you left out. Missing initial and animate keyframes come from the motion defaults. Missing transition defaults to a tween with 300ms duration and easeOut. Missing viewport defaults to triggering once with a 10% visibility threshold.

You only specify what you want to customize. The defaults handle the rest.

### Layout keyframe stripping (the one you'll never think about)

There's one subtle thing Peblor does with motion that occasionally surprises people. Framer Motion wants to animate layout properties -- width, height, padding, margin, position. That's fine for gesture animations. But Peblor owns layout through its own system: spacing, alignment, flexbox, and grid properties are set by the section and element schemas, not by motion. If entrance keyframes also tried to animate those properties, they'd fight each other.

So every entrance and exit keyframe set goes through a filter that removes layout properties before they reach the animation engine. Width, height, padding, margin, border radius, position -- all stripped from entrance and exit keyframes.

You never need to think about this. But if you ever wonder why a certain property in your entrance keyframes seems to have no effect, this is why. The layout system wins. Motion animates what's left.

Gesture keyframes (onHover, onPress) use a narrower filter that lets width and height through. Because hover-expand needs them.

## Where to look things up

The fastest way to explore is through the MCP tools. Use `explain_element_type` for root-field guidance on any element type. Use `get_element_schema` for the full field schema with examples and valid enum values. Use these when you're authoring content and need to know what fields an element accepts.

---

Back to [about-these-docs.md](../about-these-docs.md). Architecture context: [motion system](../architecture/motion.md), [data model](../architecture/data-model.md), [pipeline](../architecture/pipeline.md). Related content: [presets](presets.md), [modules](modules.md), [sections and backgrounds](sections-and-backgrounds.md).
