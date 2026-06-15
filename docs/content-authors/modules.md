# Modules

You've probably used a media player on a website. You hit play, you see a progress bar, you skip around or change the volume. There's a keyboard shortcut for fullscreen, a gesture for seeking forward, and a little feedback popup that shows you jumped ahead 10 seconds.

In most projects, that player is a React component. Someone built it, wired up all the keyboard listeners, positioned the overlay controls, and hardcoded the gesture regions. Want to change where the play button sits? File a ticket.

Modules are Peblor's alternative. A module is a self-contained player definition written entirely in JSON. Every behavior -- keyboard shortcuts, gesture regions, overlay control positions, visibility toggles, feedback animations -- is a declarative rule in a module file. No React components to edit. No JavaScript logic to trace through. Just JSON.

Right now there are two kinds: video players and audio players. Each comes in several variants for different levels of chrome (the trade-off between visible controls and unobstructed content). All the module files live in `content/modules/`.

## What a module looks like structurally

Every module file follows the same shape. It has a type field set to module, a contextType that tells the runtime what kind of content it controls (video or audio), a behavior configuration that sets things like control timeout and transition speed, a set of key bindings for keyboard shortcuts, and a map of slots -- positioned containers that hold the visible UI elements on top of the player.

The schemas that define all the valid fields are in the module block schemas file in the contracts package. The runtime dispatches to different components based on the contextType -- video players use HLS.js under the hood, audio players have waveform visualization -- but the module's JSON structure is the same either way.

If you open any file in `content/modules/`, like `video-player.json` or `audio-player.json`, you can see the full structure in action. Each one defines a complete player with all its controls, shortcuts, and layout.

## Key bindings -- the keyboard shortcut system

Every module can define a set of key bindings -- keyboard shortcuts that trigger player actions. Each binding maps a keyboard key to an action, and some actions take a payload (like how many seconds to seek).

The keys use standard KeyboardEvent.code values. Here are the bindings you'll find across the module files, with what they do in plain language:

- **Space** -- toggles play and pause. The most fundamental one. Hit space, the video starts. Hit it again, it pauses.
- **ArrowLeft and ArrowRight** -- seek backward and forward, typically by 5 or 10 seconds. Hold down the key and it seeks repeatedly. The payload determines the step size.
- **KeyM** -- mutes and unmutes the audio. Toggle behavior -- press once to mute, press again to unmute.
- **KeyF** -- toggles fullscreen (video modules only). Goes fullscreen on first press, exits on second.

Each binding has a key field and an action field that references a trigger action name from the trigger action system. Things like assetTogglePlay, assetSeek, assetMute, and videoFullscreen. Some bindings also have a payload field. For example, a seek binding with a payload of -5 means seek 5 seconds backward. A seek binding with a payload of 10 means seek 10 seconds forward.

Different module variants define different sets of bindings. A compact player might have only Space and the arrow keys. A full player adds M for mute, F for fullscreen, and maybe number keys for chapter jumps. The bindings are just data, so you can add, remove, or change them when you compose a module element in a page. If you want a player that seeks 30 seconds instead of 10, you just change the payload value.

The full list of available trigger actions -- what each action does and what payload it accepts -- is in the schema primitives file in the contracts package.

## The slots system -- where controls sit

Slots are positioned containers that hold UI elements overlaid on top of the player. Think of them as layers of controls: the video or visualization sits at the bottom, and various control bars, buttons, and indicators float above it at different positions.

Each slot has a position defined by absolute positioning values (top, left, right, bottom, or inset). It has a z-index that determines what stacks on top of what. It has visibility rules that control when the slot appears and disappears. It can have gesture regions for click and double-tap handling. And it has its own section with elements -- the same element types you use on regular pages (buttons, text, icons), arranged in the same elementOrder and definitions pattern.

Here are the standard slots you'll find across video and audio modules.

**main** -- The primary content slot. This is where the video or audio visualization renders. It's positioned to fill the entire player area (typically inset at 0 with the lowest z-index) so everything else layers on top of it. For video, this is the HLS.js video element. For audio, this is the waveform visualization.

**surfaceToggle** -- An invisible overlay covering the entire player area. It has no visible content of its own -- just a gesture handler. A single tap or click on this slot toggles play and pause. It sits at a middle z-index so it catches taps without blocking the controls beneath it. You never see it, but without it, tapping the video wouldn't do anything.

**centerPlay** -- A centered play button that appears when the asset is paused and disappears when playback starts. It usually has a glassmorphism-style background -- semi-transparent with a blur effect -- and sits at the exact center of the player. This is the big play button you see on most video players before you start watching.

**bottomBar** -- The control bar at the bottom of the player. This is the most complex slot. It contains transport controls (play/pause, seek bar, time display), volume controls, and fullscreen toggle. It appears on hover or tap when the player is awake and auto-hides after a configurable timeout. It's positioned with safe-area-inset awareness so it doesn't overlap with notches or home indicators on modern phones.

You can see exactly which elements each slot contains by looking at the section definitions inside any module file in `content/modules/`.

### When slots show and hide

Every slot has a visibleWhen field that controls its visibility. The value can be either always (the slot is always visible) or an array of player state strings. The player has a state machine that tracks what's happening, and a slot's visibleWhen array says "show me when the player is in any of these states."

The available player states depend on the context type. Video modules have states like:

- **awake** -- the user is interacting with the player. Mouse is moving, controls should be visible.
- **sleeping** -- the user hasn't interacted for a while. Controls should be hidden.
- **playing** -- media is actively playing.
- **paused** -- media is paused.
- **buffering** -- media is loading.
- **seeking** -- user is scrubbing the seek bar.

Audio modules have a subset of these since audio players typically don't have an awake/sleeping distinction (the controls stay visible).

A centerPlay slot might only appear when paused -- you only need a big play button when the video isn't playing. A bottomBar might appear when awake -- it shows during interaction and hides after a timeout. A volume indicator might appear when both awake and playing -- no point showing volume controls during a paused ad.

### Gesture regions on slots

Beyond basic visibility, slots can define gesture regions for advanced interaction. A gesture definition specifies a gesture type (singleTap or doubleTap), an optional region (left, center, or right of the slot), and an action to dispatch.

This is how the seek-on-double-tap behavior works. The surfaceToggle slot (or sometimes the bottomBar) defines two double-tap gestures: one for the left region that dispatches a seek backward, and one for the right region that dispatches a seek forward. When the user double-taps the left side of the video, it jumps back 10 seconds. Double-tap the right side, it jumps forward 10 seconds.

The region field divides the slot into thirds -- left, center, right -- so you can have different actions for different parts of the same slot. This is purely data: the region boundaries are computed from the slot dimensions at render time.

### Slot motion -- how controls appear and disappear

Slots can have their own motion configuration for showing and hiding. When a slot becomes visible (because its visibleWhen conditions are met) or hidden (because they're no longer met), the motion config controls the transition.

The motion field on a slot accepts the same framer-motion props that element motion uses. The visibilityPreset field lets you name an entrance preset from the framer-motion presets file for the slot's appearance. The transition field controls timing -- duration and easing.

Combined with the module's behavior settings (controlsTransitionMs and controlsTransitionEasing), this determines how smoothly the control overlay fades or slides in and out. A fast transition (around 150ms) feels snappy and responsive. A slow one (500ms) feels smooth and deliberate. The defaults work well for most cases, but you can tune them per module variant.

## The feedback system

When a user performs an action like seeking or changing volume, it helps to show a brief visual indicator confirming what happened. That's the feedback system.

Each module can have a dedicated feedbackSlot. Slots that trigger feedback have a feedbackMap that maps action types to visual icons or text. For example, a seek backward action might show a rewind icon. A seek forward action might show a fast-forward icon. A volume change might show a speaker icon with the new level.

The feedbackChromeStyle field on the slot defines the visual appearance of the feedback indicator -- background color, border radius, text color, icon size. The feedbackDurationMs field controls how long the feedback stays visible (usually around 1 to 2 seconds). After the duration expires, the feedback fades out.

Default values for feedback come from the module slot utilities and the motion defaults file. If you don't specify feedback settings, you get sensible defaults.

## Available module variants

Open `content/modules/` and you'll find these files. Each variant is tuned for a different context.

### Video players

**video-player** -- The standard video player with the full set of controls: play/pause, seek bar, volume, mute, fullscreen, time display, center play button, and bottom bar. This is the baseline that covers most use cases. If you just need a video player with standard controls, this is the one.

**video-player-full** -- Same controls as the standard player but with a larger bottom bar, more prominent controls, and additional overlay elements. The controls are bigger, easier to hit, and stay visible longer. Use this when the video is a primary feature of the page and the controls should be front and center.

**video-player-compact** -- A smaller player for tight spaces. Slimmer controls, fewer visible buttons, a minimal bottom bar that takes up less room. Good for sidebar videos, inline embeds, or anywhere screen real estate is precious.

**video-player-minimal** -- The most stripped-down video player. No bottom bar at all -- just a center play button and tap-to-toggle. The controls are minimal, and most of the player area is dedicated to the video itself. Use this for hero backgrounds, decorative video, or any context where the video should speak for itself.

Each of these also comes in a **-noplay** variant: video-player-compact-noplay, video-player-minimal-noplay, video-player-full-noplay. These variants remove the initial play button entirely, which means the video starts playing automatically without any visible trigger. Use these for autoplay scenarios -- background videos, hero clips, or any video that should start playing without user interaction.

### Audio players

**audio-player** -- The standard audio player with waveform visualization, play/pause, seek bar, volume control, and time display. Good for podcasts, music tracks, or any audio content where you want the listener to see the waveform as a visual reference.

**audio-player-minimal** -- Audio player without the seek bar. Just play/pause and time display. Use this for notification sounds, brief clips, or contexts where the user doesn't need fine-grained seek control.

**audio-player-waveform** -- The waveform visualization is the main visual element, with minimal transport controls around it. The waveform takes center stage, giving listeners a visual map of the audio track. Use this for music players, audio portfolios, or any context where the waveform adds value.

**audio-player-seekbar** -- The seek bar is the primary interaction point, with a smaller or absent waveform. Use this for long-form audio like lectures or audiobooks where seeking -- jumping to specific positions in the track -- is the main thing the user does.

## How elements reference modules

Elements reference modules through the module field. The elementVideo type, for example, can have a module string that names a module key -- like video-player or video-player-compact. The module value is just a string key that matches a filename in `content/modules/` minus the .json extension. The module loader discovers files the same way presets are discovered -- by scanning the content/modules/ directory.

At expand time (stage three of the pipeline), the resolver looks up the named module definition and inlines its slots, key bindings, and behavior config into the element. The element provides the media source and size constraints; the module provides the player chrome.

## Overriding module fields

Just like presets, module definitions can be overridden at the element level. If a module defines a default set of key bindings and you want to add one, you specify the additional binding on the element's own definition. The runtime merges the module definition with the element definition using the same merge-patch semantics that presets use: objects merge recursively, arrays replace entirely.

This means you can start from a standard module variant and tweak it for a specific page without creating a whole new module variant. Want the standard video player but with different seek amounts? Override the key bindings on the element. Want a different center play button style? Override that slot's section elements. Want to disable double-tap seek? Remove the gesture entries from the surfaceToggle slot.

The merge happens during the expand stage of the pipeline, alongside entrance motion resolution and builder default application. The end result is a fully resolved player definition that the runtime renders without further lookups.

## Where the module pipeline lives

The module type definitions are in the module slot types file in the core package. Slot resolution utilities -- element inlining, gesture region calculation, feedback layout -- are in the module slot utilities file. Module resolution at expand time happens in the expand stage of the core pipeline, where module definitions are looked up and inlined into the element tree.

For the schema definitions, check the module block schemas file in the contracts package. It defines every valid field for a module and its slots.

---

Back to [about-these-docs.md](../about-these-docs.md). Architecture context: [pipeline](../architecture/pipeline.md), [data model](../architecture/data-model.md). Related content: [elements and motion](elements-and-motion.md), [presets](presets.md), [sections and backgrounds](sections-and-backgrounds.md).
