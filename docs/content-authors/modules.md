# Modules — Media Players, Declared in JSON

Ever used a video player on the web? You press play. You skip around. You mute an ad
loud enough to wake the neighbors. There's a floating progress bar, a gesture for
scrubbing, and a little popup that confirms you just jumped ahead ten seconds.

In most projects, that player is a React component. Someone hand-wired every keyboard
listener, manually positioned the overlay controls, and hardcoded the gesture zones.
Want to move the play button three pixels left? File a ticket. Wait two sprints.

Modules are Peblor's answer. A module is a complete media player defined entirely in
JSON. Every shortcut, every control position, every visibility rule, every animation
— it's all declarative data. No React components to dig through. No JavaScript
event handlers to trace. Just a JSON file that says "here's my player, this is how
it works."

Right now there are two flavors: video players and audio players. Each comes in
several variants for different levels of chrome — that's the trade-off between
visible controls and letting your content breathe. All of them live under
`content/modules/`.

## The anatomy of a module

Every module file follows the same skeleton. It declares its type (`"type": "module"`),
its medium (`contextType: "video"` or `"audio"`), and a set of configuration blocks:

- **behavior** — timing stuff: how long before controls auto-hide, how fast they
  fade, how long feedback popups stick around.
- **keyBindings** — keyboard shortcuts that map keys to player actions.
- **slots** — positioned containers that hold the visual controls layered on top of
  the player. This is where the magic lives.
- **overlayMotion** — how the whole control overlay fades in and out.
- **container** — padding, border radius, aspect ratio.

Each piece is optional-ish. Leave something out, and the runtime falls back to
sensible defaults. The design philosophy: make the common case zero-config, but
let you reach in and tweak anything when you need to.

## Key bindings — what the keyboard does

Every module can define keyboard shortcuts. Each binding maps a standard
`KeyboardEvent.code` value to a player action. Some actions also take a payload
(like "seek this many seconds").

Here are the bindings you'll find across the module files, with what they actually do:

- **Space** — toggle play and pause. The big one. Hit it, the video starts. Hit it
  again, it stops. Same as every media player since the dawn of time.
- **KeyK** — also toggle play and pause. YouTube trained a generation to hit K
  instead of Space so you don't accidentally scroll the page. Modules honor both.
- **ArrowLeft / KeyJ** — seek backward 5 seconds. Hold it down and it seeks
  repeatedly. J is the Vim-adjacent seek key if that's your thing.
- **ArrowRight / KeyL** — seek forward 5 seconds. L goes forward, J goes back,
  K toggles. A clean little cluster on the home row.
- **KeyM** — mute and unmute. Toggle behavior. Press once to silence. Press again
  to restore your audio dignity.
- **KeyF** — toggle fullscreen. Video modules only. Press to go big. Press again
  to rejoin the rest of the page.

Not all modules carry all bindings. Audio modules skip KeyF (no fullscreen for
sound waves) and the arrow keys (seek doesn't make as much sense for audio in
every variant). The seek amounts are adjustable — they're just numbers in the
JSON. Want 30-second jumps instead of 5? Change the payload.

## Slots — where the controls live

Slots are positioned containers that float above the player surface. Think of them
as layers of controls: the video or waveform sits at the bottom, and buttons, bars,
and indicators stack on top at various z-levels.

Each slot knows its position (top, left, right, bottom, or inset via any CSS value),
its layer (what stacks above what), its visibility rules (when to appear and
disappear), and its contents — an honest-to-goodness section with elements,
elementOrder, and definitions, just like a page section. Same element types, same
preset system. A slot is a tiny page within a page.

Here are the slots you'll find across the module files:

**`main`** — The content surface. This is where the video or audio visualization
renders. It fills the entire player area (inset at 0, lowest z-index) so
everything else layers on top. For video, it's the HLS.js element. For audio,
it's a waveform canvas.

**`surfaceToggle`** — An invisible overlay that covers the whole player. No visible
content, just a tap handler. Single tap or click toggles play and pause. It sits
at a middle z-index so it catches taps without blocking the controls layered
above it. You never see it, but without it, tapping the video does nothing.

Not every module has a surfaceToggle. The no-play variants skip it entirely —
those modules autoplay and don't expect tap-to-toggle behavior.

**`centerPlay`** — A big play button that appears dead center when the asset is
paused and disappears the moment playback starts. It usually has a glassmorphism
look: semi-transparent background with blur, floating over the content. This is
the "big play button" you see on every video player before you start watching.

The no-play variants don't have centerPlay, either. No play button means no pause
button needed — the video just plays.

**`bottomBar`** — The control bar at the bottom. This is the most complex slot by a
wide margin. It contains transport controls (play/pause, seek bar, time display),
volume controls, and fullscreen toggle. It appears on hover or tap while the
player is awake and auto-hides after a configurable timeout. It's positioned with
safe-area-inset awareness so it plays nice with notches and home indicators on
modern phones.

The bottomBar is built from element groups — miniature sections inside the slot
section — that organize controls into left, center, and right clusters. The left
group usually has play/pause and volume. The center has the seek bar. The right
has time display and fullscreen. Each group is just JSON: you can add, remove,
or reorder them per variant.

### When a slot shows (or hides)

Every slot can have a `visibleWhen` field. This controls visibility based on
player state. The value can be `"always"` (the slot never hides) or an array of
state strings (the slot shows when any of those states are true).

The player tracks its own internal state machine. The state names used across the
modules are:

- `awake` — the user is actively interacting. Controls should be visible.
- `assetPaused` — the media is paused. Show the big play button.
- `assetPlaying` — the media is actively playing.
- `videoContained` — the video is in normal (non-fullscreen) mode.
- `videoFullscreen` — the video is fullscreen.

The `centerPlay` slot uses `visibleWhen: ["assetPaused"]` — you only need that
big button when the video isn't playing. The `bottomBar` uses `visibleWhen: ["awake"]`
— it shows during interaction and hides after a timeout.

Audio modules typically don't set `visibleWhen` on their bottom bar at all. Audio
players keep their controls visible because there's no visual content to obscure.

### How slots animate in and out

Slots can have their own motion configuration for appearing and disappearing.
When a slot becomes visible (because its state conditions are met) or hidden
(because they're no longer met), the motion config controls the transition.

The `overlayMotion` field at the module level sets the baseline — opacity keyframes,
duration, easing. Individual slots can override this with their own `motion` or
`visibilityPreset` fields, or tune timing with `transition`. These options exist
in the schema and are available for custom modules, but the defaults work well
for most cases.

Combined with the module's `behavior` settings (`controlsTransitionMs` and
`controlsTransitionEasing`), this determines how smoothly the control overlay
fades or slides in and out. A fast transition (around 150ms) feels snappy.
A slow one (500ms) feels smooth and deliberate. The video modules ship with
500ms and easeOut, which splits the difference nicely.

## Available module variants

Open `content/modules/` and you'll find these files. Each variant is tuned for a
different context. Pick the one that matches your use case and run with it.

### Video players

**`video-player`** — The baseline. Full set of controls: play/pause, seek bar,
volume, mute, fullscreen, time display, center play button, and bottom bar. If
you just need a video player that works, this is the one.

**`video-player-full`** — Same controls as the standard player, plus a quality
selector for adaptive streaming. Good for hero videos, feature content, or any
context where the viewer might want to switch between 720p and 4K.

**`video-player-compact`** — A smaller bottom bar with no time display and no
quality selector. Just play/pause, volume, seek bar, and fullscreen. Use this
for sidebar videos, inline embeds, or anywhere real estate is tight.

**`video-player-minimal`** — The sparsest bottom bar: play/pause, seek bar, and
time display. No volume control. No fullscreen toggle. Most of the player is
video, not controls. Use this when the video should speak for itself.

Every video variant also comes in a **-noplay** flavor: `video-player-compact-noplay`,
`video-player-minimal-noplay`, `video-player-full-noplay`. These variants strip out
the center play button and the surface toggle entirely. The video starts playing
automatically with no visible trigger. Use these for autoplay scenarios —
background videos, hero clips, or any video that should start without the user
lifting a finger.

The noplay variants still have a bottomBar, so the user can control playback once
they interact. They just don't get the "hey, press me" entrance.

### Audio players

**`audio-player`** — The standard. Waveform visualization, play/pause, seek bar,
volume control, time display. Good for podcasts, music tracks, or any audio
where seeing the waveform helps orient the listener.

**`audio-player-minimal`** — Play/pause, seek bar, and time display. No volume
control. Good for notification sounds, brief clips, or tight spaces.

**`audio-player-waveform`** — The waveform visualization takes center stage with
a taller minimum height (128px). Play/pause, seek bar, time display, no volume
control. No arrow key shortcuts — just Space, K, and M. The waveform IS the
visual. Use this for music players, audio portfolios, or any context where the
waveform adds value.

**`audio-player-seekbar`** — The seek bar is the primary interaction point, with
time displays flanking it on both sides (current time left, total time right).
No play/pause buttons in the bar. No volume control. No arrow key shortcuts.
This is for long-form audio — lectures, audiobooks, anything where the main
thing the user does is jump to specific positions in the track.

## How elements reference modules

You hook a module to an element through the `module` field. The `elementVideo`
type can carry a `module` string like `"video-player"` or `"video-player-compact"`.
The `elementAudio` type can carry `"audio-player"` or one of its variants.

The value is just a string key matching a filename in `content/modules/` minus
the `.json` extension. At page build time, the pipeline looks up the named module
definition and inlines its slots, key bindings, and behavior config into the
element. The element provides the media source and dimensions; the module provides
the chrome.

Here's what that looks like in practice:

```json
{
  "type": "elementVideo",
  "module": "video-player-full",
  "src": "https://example.com/video.mp4",
  "poster": "images/poster.jpg",
  "width": "100%"
}
```

That's it. One field and you get a fully interactive video player with keyboard
shortcuts, gesture support, overlay controls, and transition animations.

Audio is the same pattern:

```json
{
  "type": "elementAudio",
  "module": "audio-player",
  "src": "https://example.com/podcast.mp3"
}
```

## Overriding module fields

Modules and presets share a superpower: merge-patch semantics. If a module defines
a default set of key bindings, and you want to add one or change a seek amount,
you can specify overrides at the element level. Objects merge recursively. Arrays
replace entirely.

This means you can start from a standard variant and tweak it for a single page
without creating a whole new module file. Want the standard video player but with
10-second seeks instead of 5? Override the key bindings on the element. Want a
different center play button style? Override that slot's elements. Want to add
double-tap gesture support? Drop a `gestures` array onto the surfaceToggle slot.

The gesture system lives in the schema but isn't wired into the default modules
by default — it's there for you to use when you need it. Each gesture defines a
type (`singleTap`, `doubleTap`, or `hold`), an optional region (`left`, `center`,
`right` of the slot), and an action to dispatch. The region field divides the
slot into thirds so you can have different actions for different sides of the
same slot — think double-tap left to seek backward, double-tap right to seek
forward.

Same goes for the feedback system. The schema supports a `feedbackSlot` toggle,
a `feedbackMap` that maps action types to icon keys, and per-slot `feedbackDurationMs`
overrides. The default modules include a behavior-level `feedbackDurationMs` of
100ms, but you can add richer feedback overlays on custom modules or overrides.

The merge happens at build time, same as preset resolution. The result is a fully
resolved player definition that the runtime renders without any further lookups.

## What modules don't do

Modules define player chrome — controls, shortcuts, layout. They don't define
media sources, dimensions, or playback policies. Those live on the element
(`elementVideo` or `elementAudio`) that references the module. The module is
pure presentation. The element is pure content. The separation keeps things
clean: you can swap a `video-player` for a `video-player-minimal` by changing
one string and everything just works.

---

Back to [about-these-docs.md](../about-these-docs.md). Architecture context:
[pipeline](../architecture/pipeline.md), [data model](../architecture/data-model.md).
Related content: [elements and motion](elements-and-motion.md), [presets](presets.md),
[sections and backgrounds](sections-and-backgrounds.md).
