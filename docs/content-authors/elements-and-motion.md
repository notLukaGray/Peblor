# Elements and motion

If sections are the skeleton of a page, elements are everything else -- the muscle, the skin, the parts people actually see and interact with. Headings, body text, images, videos, buttons, links, dividers, 3D models, audio players, form fields, progress bars, marquees, tabs, tooltips. If it's on screen, it's an element.

Peblor has about 25 element types, and each one has its own set of fields. You don't need to memorize them all -- the MCP tools (explain_element_type and get_element_schema) can tell you exactly what fields any element type accepts -- but you should know what's available so you reach for the right one when you're building a page. The full list of types lives in the runtime component map, and each type's schema is defined in its own file following a naming pattern you'll recognize once you've seen a few.

## How elements nest inside sections

Elements don't float around loose on a page. They live inside sections. A contentBlock section, for example, has an elementOrder array (a list of keys in render order) and a definitions map (a flat dictionary of actual element blocks). The renderer walks through elementOrder, looks up each key in definitions, and draws them in sequence.

This is the exact same pattern that pages use for sections. Pages have a sectionOrder array and a definitions map. Sections have an elementOrder array and a definitions map. The pattern repeats at every level where ordering matters. Same idea every time: give me the order as a list and the content as a flat dictionary, and I'll figure out what to render when.

Most sections are single-level -- they hold a flat list of elements and render them top to bottom (or left to right, depending on the section type's layout). But one element type changes the game.

## elementGroup -- the container

ElementGroup is an element that holds other elements. It has its own elementOrder and definitions, just like a section does. This is how you get more than one level of nesting -- a group inside a section that holds its own children.

Why would you need this? Imagine a card layout. The card is a section. Inside the card, you have a heading, some body text, and a button. That's a flat list, and it works fine. But now imagine the heading and body need to be stacked vertically in one column while the button sits below them. Or imagine a toolbar with a row of icons. Or a set of stat numbers with labels beneath each one. In each case, you want a container that moves and animates as a unit, with its own layout properties that apply only to its children.

That's what elementGroup does. Children inside the group are positioned relative to the group, not the section. The group has its own flex direction, alignment, gap, and padding. Groups can nest inside other groups, though you rarely need more than two levels.

The schema for elementGroup lives alongside the other element schemas.

## elementInfiniteScroll -- groups that keep loading

ElementInfiniteScroll works like elementGroup but with an extra trick: it loads more content when the user scrolls to the bottom. Its children can use a loading preset for skeleton states while new content arrives. This is useful for feed layouts, paginated galleries, or any content that keeps coming as the user scrolls.

## The full element catalog

Here's every element type and what it's good for. Scan through this and get a feel for what's available. You'll know which one to reach for when you're building a page.

### Text and content

**elementHeading** -- Renders text as an h1 through h6 tag. You control both the level (which heading number) and the visual variant (display, section, label, meta, or kicker). A display variant is huge and attention-grabbing for hero sections. A kicker is a small uppercase lead-in that sits above a heading. You can also apply inline styling -- color, weight, letter spacing -- right on the element without needing a separate preset. The schema is in the element content schemas file.

**elementBody** -- Paragraph text. This is the workhorse for prose content. Variants let you pick the right feel: standard for body copy, fine for small print, lead for opening paragraphs, mono for code-like or technical text, serif for editorial vibes, truncated for previews that end with an ellipsis. If you're writing text that isn't a heading, this is probably what you want.

**elementRichText** -- HTML content rendered as innerHTML. Use this sparingly. It bypasses Peblor's styling system entirely, which means you're responsible for making it look right. It exists mainly for importing formatted content from external sources -- think WordPress exports, markdown converted to HTML, or CMS embeds. For anything you're writing by hand, stick with elementHeading and elementBody.

### Media

**elementImage** -- Your standard image element. You set the image path, object-fit (cover, contain, fill), aspect ratio, and responsive sizing. The interesting part is what happens behind the scenes: at the resolve stage of the pipeline, the runtime signs your CDN URLs and computes srcset for responsive images. You just provide the path and say how it should fit.

**elementVideo** -- An inline video player with poster image, autoplay, loop, mute, and basic controls. This is the lightweight option -- good for a background clip or a simple embed. If you need keyboard shortcuts, gesture regions, overlay controls, and feedback indicators, you want a video module instead (covered in the modules doc).

**elementVector** -- An inline SVG defined entirely in JSON. You describe paths, shapes, gradients, stroke and fill styling -- all as data, not as an SVG file. Great for simple graphics, icons, or illustrations that need to be theme-aware without loading external files.

**elementSVG** -- The opposite approach: embeds an external SVG file by URL. Use this when you have a complex SVG that doesn't make sense to describe inline.

**elementModel3D** -- A full Three.js 3D model viewer. This is one of the heaviest elements -- it's code-split via dynamic import so it doesn't slow down pages that don't use it. The schema covers camera controls, lighting, environment maps, materials, and post-processing effects. You give it a 3D model file and configure how it should look and behave. The 3D schemas are in their own file because there's a lot to configure.

**elementRive** -- Plays Rive animations with state machine controls. Rive is a vector animation tool that lets you create interactive animations with state machines. This element gives you artboard selection, animation triggers, state machine inputs, and playback controls. The Rive schemas file has the full story.

**elementAudio** -- An inline audio player. Like elementVideo, this is the lightweight option. For a full-featured audio player with key bindings, waveform visualization, and transport controls, use an audio module instead.

**elementLottie** -- Plays Lottie animations (the JSON-based animation format from Airbnb). Like elementModel3D, this is code-split and only loads when a page uses it. The Lottie schemas file has the details.

### Interactive

**elementButton** -- A clickable button. Supports visual variants (primary, secondary, ghost, outline, text), icon slots on either side of the label, and trigger actions. The action system is how things happen when a user clicks: navigate to another page, open a modal, set a variable, or control media playback. The full list of trigger actions is in the schema primitives file.

**elementLink** -- An anchor element. Takes an href (external URL or internal route), optional new-tab behavior, and visual styling. For internal routes, the runtime handles smooth client-side navigation.

**elementTabs** -- A tabbed interface. Each tab has a label and a content area. Clicking a tab switches which content is visible. This is purely declarative -- you define the tabs and their content in JSON, and the runtime handles the interaction. The tabs schemas file has the field definitions.

**elementTooltip** -- A hover-triggered tooltip. When the user hovers over the trigger element, a positioned overlay appears with the tooltip content. You control the position (top, bottom, left, right), the content, and the styling. The tooltip schemas file covers all the options.

**elementDrag** -- Makes its children draggable. You configure constraints (bounding box), elasticity (how much it bounces back), and snap behavior (snap to grid or positions). Uses framer-motion's drag under the hood. The drag schemas file has the details.

**elementInput** -- A text input field for forms. Used inside formBlock sections. Schema is alongside the form field schemas.

**elementRange** -- A range slider input. Good for volume controls, filters, or any adjustable value. Schema in the element schemas directory.

**elementFormField** -- A complete form field with label, input, validation rules, and error display. Used inside formBlock sections. The form field schemas file covers validation types, error messages, and field layout.

### Layout and decoration

**elementSpacer** -- An invisible spacer that adds vertical or horizontal space. You tell it how much space and it makes room. Supports responsive values so you can have more space on desktop and less on mobile. Simple but essential.

**elementDivider** -- A visual divider line. You set the orientation (horizontal or vertical), color, thickness, and line style. Good for separating sections of content.

**elementMarquee** -- A scrolling ticker element. Text that scrolls horizontally or vertically on a loop. You set the speed and whether it pauses on hover. Presets for marquees live in the type motion presets directory.

**elementCounter** -- An animated number counter. It counts from a start value to an end value, typically triggered when it scrolls into view. Presets exist for currency, percentage, and stat display. Check the type motion presets directory for examples.

**elementScrollProgressBar** -- A progress bar that tracks scroll position through a container or the full page. You customize the height, fill color, and track background. Good for article pages or long-form content.

**elementImageCompare** -- A before-and-after image comparison slider. Two images sit on top of each other with a draggable divider handle that lets you scrub between them. The image compare schemas file covers the options.

### Containers

**elementGroup** -- We covered this above. A container element with its own elementOrder and definitions. For toolbars, card bodies, button rows -- anything that should move and animate as a unit.

**elementInfiniteScroll** -- Also covered above. Like elementGroup but with scroll-to-load pagination. For feed layouts and galleries that keep loading as the user scrolls.

## Motion for content authors

Every element can carry a motion object. That motion object is how you control animation -- entrance effects, hover responses, tap feedback, scroll-triggered reveals. It maps directly to what framer-motion (the animation library Peblor uses under the hood) understands: initial state, animate state, exit state, gesture handlers, transition settings, viewport rules. Whatever you put in there gets passed along to the animation engine at render time.

If an element has no motion object at all, it renders as a static element. No animation wrapper, no entrance effect, no gesture response. It just appears in the document flow, same as any unstyled HTML element.

The full motion system is documented in the architecture motion docs, which covers the four motion layers in depth. What follows is the practical guide for content authors.

### Entrance presets

The most common thing you'll do with motion is make elements animate in when they scroll into view. Instead of writing keyframes by hand -- and nobody wants to do that -- you reference a named entrance preset. These presets live in the framer-motion presets file, and they cover the most common animation patterns:

- **fade** -- fades from invisible to visible. The simplest entrance.
- **slideUp** and **slideDown** -- slides vertically into position, with configurable distance.
- **slideLeft** and **slideRight** -- slides horizontally.
- **zoomIn** and **zoomOut** -- scales in or out as it appears.
- **popIn** -- a combo: scale up, fade in, and slide slightly all at once. Great for cards and grid items.
- **blurIn** -- fades in while a blur filter resolves. Gives a lens-focusing effect.
- **tiltIn** -- rotates slightly as it enters. A subtle touch for gallery items or decorative elements.

Each preset is a pair of initial and animate keyframes. You apply one to a section or element through the motionTiming block -- specifically the entrancePreset and trigger fields. The trigger tells the runtime when to fire the animation:

- **onMount** -- animate as soon as the element renders. Use this for things that should appear immediately but with a bit of motion.
- **onFirstVisible** -- animate the first time it scrolls into view. This is the most common choice. Elements below the fold slide or fade in as the user scrolls down, but only the first time.
- **onEveryVisible** -- animate every time it enters the viewport. Good for things that should catch attention each time they appear.

One important thing to understand: entrance motion keyframes are computed at build time, not looked up at runtime. The expand stage of the pipeline walks every section and every element, resolves the named preset to its actual keyframes, applies any overrides (different distance, longer duration, added delay), and writes the result directly into the element's data. The browser receives pre-computed keyframes. It never opens the presets file or does any preset lookup at runtime. Your entrance animations are resolved, baked in, and ready to play before a single user visits the page.

### Exit presets

Exit animations work the same way as entrance animations, just in reverse. You set an exitPreset on the motionTiming block, picking from the same set of named presets. The exit animation plays when the element leaves the DOM -- for example, when a modal closes or when tab content switches. Exit motion uses framer-motion's AnimatePresence for smooth unmount animations.

### Motion timing on sections

When you set motionTiming on a section with staggerChildren, the children don't all animate at once -- they animate in sequence. The staggerChildren value is the delay in seconds between each child's animation start. A section with a stagger of 0.1 seconds and three children means child 2 starts one-tenth of a second after child 1, and child 3 starts one-tenth of a second after child 2. This creates a cascade effect that looks much more polished than everything animating simultaneously.

This only works if the children have their own entrance presets. The section's motionTiming controls the timing orchestration -- the when. Each child's motionTiming controls the animation itself -- the what.

### Gesture-based motion

Beyond entrance and exit, elements can respond to user gestures through keys on the motion object:

- **whileHover** -- what happens when the user hovers over the element. Common uses: scale up slightly, change color, reveal an underline. A button that grows a bit when you mouse over it is a whileHover effect.
- **whileTap** -- what happens while the user is pressing down. A button that compresses slightly when clicked uses whileTap.
- **whileInView** -- what happens while the element is in the viewport. Different from entrance: this is a continuous state, not a one-time animation. An element could pulse gently while it's visible.
- **whileDrag** -- what happens while the user is dragging the element (only relevant if drag is enabled). Typically a slight scale-up to indicate it's being manipulated.

Gesture keyframes use slightly different rules than entrance keyframes. Layout properties like width and height are allowed in gesture animations -- unlike entrance animations, where they're stripped out. This is because gesture targets (like a hover-expand card) need to animate dimensions, and the renderer handles that case correctly.

### The inheritMode system

When you put an element inside an elementGroup and both the group and the child have motion, things can get weird. Framer Motion can produce conflicting behavior -- nested entrance animations that fight each other, or children animating in ways that conflict with the parent's layout.

Three modes on the group's motion object control this:

- **isolate** -- children don't inherit any motion from the parent. Each child starts from its own defaults. Use this when the group's entrance animation shouldn't affect its children at all. For example, if the group fades in as a unit but the children have their own stagger timing, you want isolate so they don't fight each other.
- **inherit** -- children inherit the parent's motion config as their base, with their own overrides layered on top. Use this when the group and its children should animate as a coordinated unit.
- **auto** -- the default. Children inherit only when the element type is a container (elementGroup, elementInfiniteScroll) and has explicit motion defined. This covers the common case without you having to think about it.

If you ever see weird animation behavior in a group -- elements animating when they shouldn't, or not animating when they should -- check the inheritMode. Isolate is usually the fix.

### What you get by default

If you specify a partial motion object -- say, just whileHover with a scale value -- the defaults system fills in everything you left out. Missing initial and animate keyframes get populated from the motion defaults file. Missing transition defaults to a tween with 300ms duration and easeOut. Missing viewport defaults to triggering once with a 10% visibility threshold.

The full set of defaults lives in the motion defaults JSON file. That file defines default keyframe values for every animatable property, transition presets for tween, spring, and inertia, viewport settings, drag configuration, layout animation defaults, and gesture keyframes for hover, tap, focus, and drag. You only specify what you want to customize. The defaults handle the rest.

### Layout keyframe stripping

There's one subtle thing Peblor does with motion that occasionally surprises people. Framer Motion wants to animate layout properties -- width, height, padding, margin, position. That's what it's built for. But Peblor owns layout through its own system: spacing, alignment, flexbox, and grid properties are set by the section and element schemas, not by motion. If motion also tried to animate those properties, they'd fight each other -- the element would try to animate to keyframe values while the CSS layout system tried to enforce different values.

The solution is automatic: every keyframe set goes through a filter that removes known layout properties before they reach framer-motion. Position, display, flexbox properties, gap, padding, margin, width, height, and grid properties are all stripped from entrance and exit keyframes.

You never need to think about this day to day. But if you ever wonder why a certain property in your keyframes seems to have no effect on the element's layout, this is why. The layout system wins. Motion animates what's left.

Gesture keyframes (whileHover, whileTap) use a narrower filter that lets width and height through. This is because hover-expand cards and similar effects need to animate dimensions, and the element renderer handles that case correctly.

## Where to look things up

The canonical source for every element type's available fields is the element block schemas file. Each element type that needs special treatment has its own schema file following the element-<type>-schemas naming pattern.

For the runtime component dispatch and to see which elements are dynamically loaded, check the elements index file in the runtime package.

The fastest way to explore without opening source files is through the MCP tools. Use explain_element_type to get root-field guidance for any element type. Use get_element_schema to get the full field schema with examples and valid enum values. Use these when you're authoring content and need to know what fields an element accepts.

---

Back to [about-these-docs.md](../about-these-docs.md). Architecture context: [motion system](../architecture/motion.md), [data model](../architecture/data-model.md), [pipeline](../architecture/pipeline.md). Related content: [presets](presets.md), [modules](modules.md), [sections and backgrounds](sections-and-backgrounds.md).
