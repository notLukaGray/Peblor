# Extending the Platform

This is the master checklist. Every time you add something new to Peblor -- an element type,
a section layout, a background effect, a trigger action, a module, a motion preset, a CLI
command, an MCP tool, a pipeline stage, or a Figma converter -- you come here to figure out
which files to touch and what each one needs from you.

Each section is short by design. The pattern first, then the files, then why each one matters.
Deep-dive docs are linked at the end of each section for when the pattern isn't enough.

Think of this as a "what goes where" reference for the extension points. You shouldn't need
to guess what comes next.

---

## Adding a new element type

This is the most common thing you'll do. Element types are the atoms of Peblor pages -- things
like headings, buttons, images, videos, 3D models, tabs, drag targets, marquees. Every one
follows the same three-stop pattern, and it hasn't changed since the beginning.

**Contracts -- `packages/contracts/src/peblor/core/peblor-schemas/`**

This is where you define the shape of your element's data. You create a Zod schema file (or
add to an existing one like `element-content-schemas.ts`) and wire it into the discriminated
union at `element-block-schemas.ts`. Every element schema starts with a `type` literal --
`z.literal("elementYourThing")` -- and extends with whatever fields it needs. Text-like
elements get `typographyOverridesSchema`. All elements get `elementLayoutSchema` for
positioning and sizing.

If you get the schema wrong, Zod tells you exactly what's missing. The error messages are
good enough that you probably won't hate them.

One gotcha: elements that contain other elements (`elementGroup`, `elementInfiniteScroll`)
create a circular reference in the schema graph. The file `lazy-element-ref.ts` handles
this with a lazy Zod ref. If your element nests elements, use that pattern. Otherwise
you get a stack overflow at module load time, which is a dramatic way to discover circular
dependencies.

**Core -- `packages/core/src/internal/`**

You'll almost certainly need the defaults file, possibly the expand directory.

Builder defaults live in `packages/core/src/internal/defaults/pb-builder-defaults.values.ts`
(with types in `pb-builder-defaults.types.ts`). If your element has a variant system --
different sizes or styles that the builder should know about -- you add an entry here. Not
every element needs this. Simple elements like blockquote, table, and code have no defaults
entry at all. They just show up on the page and do their thing.

Custom expand logic lives in `packages/core/src/internal/peblor-expand/`. Currently, zero
out of twenty-nine element types need custom expand logic. The pipeline is fully generic:
it resolves element keys, applies defaults, inlines definitions, and walks nested structures
without caring what type any element is. Your element probably won't need expand logic either.
If it does -- if it has structural fields that need special processing before rendering --
add a handler in this directory.

**Runtime -- `packages/runtime-react/src/peblor/elements/`**

Create your component file here. Then register it in `index.ts` by adding an entry to the
`ELEMENT_COMPONENTS` map. The key is the type string -- `"elementYourThing"` -- and the
value is your component.

Import pattern matters for performance. Lightweight elements (heading, body, link, image)
get static imports. Heavy elements (3D, Rive, Lottie, tabs, drag) use `next/dynamic` so
they land in their own JavaScript chunk. Three of them (`elementModel3D`, `elementRive`,
`elementLottie`) also need `ssr: false` because WebGL and canvas don't render on the server.
Follow whichever existing import matches your element's weight profile.

There's also a server-side registry at `packages/runtime-react/src/peblor/server/server-element-registry.ts`
with only 15 entries -- elements that can render fully server-side without client JavaScript.
If your element is simple enough to SSR, add it here too. If not, the server renderer falls
back to a `ClientElementIsland` wrapper that hydrates on the client.

That's the pattern. Schema + defaults + component. Two of those are single-line changes.
No decorators, no dependency injection, no registry ceremony.

See: [contracts.md](contracts.md), [core.md](core.md), [runtime-react.md](runtime-react.md).

---

## Adding a new section type

Sections are the containers that hold elements -- `contentBlock`, `sectionColumn`,
`scrollContainer`, `revealSection`, `divider`, and so on. The pattern is the same as
elements, but at a higher level.

**Contracts -- `packages/contracts/src/peblor/core/peblor-schemas/`**

All section schemas live in `section-block-base-schemas.ts`. Every section type extends
`baseSectionPropsSchema` -- the shared foundation for fills, layers, dimensions, spacing,
borders, motion, and a dozen trigger types (keyboard, timer, cursor, scroll, idle, variable,
tab visibility, media end, custom event, element event, scroll threshold, media progress).

Your new section type gets its own variant in the `sectionBlockSchema` discriminated union
at `section-block-schemas.ts`. Add it to the array, and the validators pick it up
automatically.

The section schema is where you define what elements your container can hold and how it
arranges them. A `sectionColumn` needs column ratios and element namespacing. A `scrollContainer`
needs scroll-related behavior. A `revealSection` needs collapsed and revealed element lists.
Simple containers like `contentBlock` just need an `elementOrder` array and definitions.

**Core -- `packages/core/src/internal/peblor-expand/`**

Section types sometimes need custom expansion logic. `column-namespacing.ts` handles
sectionColumn by prefixing element IDs with the column namespace. Most new section types
won't need this -- if your section just holds elements in an order, the generic pipeline
handles it.

**Runtime -- `packages/runtime-react/src/peblor/section/`**

Create your section component and register it in the `SECTION_COMPONENTS` map at
`section/index.ts`. Section components are statically imported -- there are only eight
of them and they're always needed. (No lazy loading for sections.)

If your section can render server-side, add it to `SERVER_SECTION_COMPONENTS` at
`packages/runtime-react/src/peblor/server/server-section-registry.ts`. Currently three
sections (`divider`, `contentBlock`, `sectionColumn`) have server renderers. The rest
depend on client hydration.

There's a parity test at `packages/runtime-react/src/peblor/dev/registry-schema-parity.test.ts`
that automatically verifies every type in the Zod union has a matching component. If you
add a section type to the schema but forget to register a component, the test fails. If
you register a component but forget to add it to the schema, the test fails. It's a
built-in safety net.

See: [contracts.md](contracts.md), [core.md](core.md), [runtime-react.md](runtime-react.md).

---

## Adding a new background type

Backgrounds render above or below sections and have their own motion system for parallax,
scroll transitions, and pointer-follow effects. There are five background types today --
`backgroundVideo`, `backgroundImage`, `backgroundVariable`, `backgroundPattern`, and
`backgroundTransition` -- and adding a sixth follows the same path.

**Contracts -- `packages/contracts/src/peblor/core/peblor-schemas/background-block-schemas.ts`**

Add a variant to the `bgBlockSchema` discriminated union. Your background type defines
a `type` literal and whatever fields it needs for fill properties, motion behavior, and
transition timing.

**Core -- `packages/core/src/internal/resolved-assets/`**

If your background type references assets (images, videos), make sure the tree walker
finds them. Asset collection works by iterating over a set of known key names defined
in `packages/contracts/src/peblor/core/peblor-schemas.ts` -- currently `url`, `src`,
`poster`, `image`, and `video`. If your background stores asset references in a field
not in that set, the CDN signing pipeline won't see them and your assets will render
as broken links. Either add your field to the known-keys set or design your schema to
use existing key names.

The tree walker (`peblor-asset-tree-walk.ts`) also recurses into nested structures.
For `backgroundTransition`, it walks both `.from` and `.to` background blocks. If your
background type has nesting, test that asset discovery works.

**Runtime -- `packages/runtime-react/src/peblor/background/`**

Create your component and register it in the `BG_COMPONENTS` map at `background/index.ts`.
All background components are lazy-loaded via `next/dynamic`. This is intentional -- a
simple color background shouldn't pull in video or transition logic. Your component lands
in its own JavaScript chunk and only loads when a page uses that background type.

You also need to update two helpers in the same file: the `KnownBgType` union type and
the `isKnownBgType` type guard. Both are hand-maintained and will fail at compile time
if you miss them.

See: [contracts.md](contracts.md), [core.md](core.md), [runtime-react.md](runtime-react.md).

---

## Adding a new trigger action

Trigger actions are what happen when a user interacts with something -- clicking, scrolling
into view, pressing a key, hovering. They handle navigation, modal toggling, variable
setting, media playback control, 3D scene manipulation, Rive state machine control,
and about fifty other behaviors.

**Contracts -- `packages/contracts/src/peblor/core/peblor-schemas/schema-primitives.ts`**

This is the single source of truth. The `TRIGGER_ACTION_CORE_VARIANTS` array holds a Zod
object schema for every action type in the platform. Adding a new action means adding one
entry to this array. Each entry has a `type` literal and a `payload` schema that defines
what data the content author provides.

The union is derived automatically -- `triggerActionSchemaCore` is a `z.discriminatedUnion`
built from the array, and the TypeScript type `PeblorAction` propagates via `z.infer`.
Button validation, element action validation, and trigger payload resolution all read
from this same source. One entry in the array is all it takes.

**Core -- `packages/core/src/internal/peblor-trigger-handlers.ts`**

This is where your action's runtime logic lives. The `createTriggerHandlers` function
returns a map of action type strings to handler functions. Add your action type and
its handler here. The handler receives the action payload and whatever context it needs
(from the trigger event system) and executes the behavior.

Complex handlers get their own files in `packages/core/src/internal/peblor-trigger-handlers/`.
The directory has files for overrides, transitions, action parsing, and context-and-bg-progress.
If your handler is more than a few lines, spin it out into its own file.

**Runtime -- `packages/runtime-react/src/peblor/triggers/` and `packages/runtime-react/src/peblor/hooks/`**

The trigger event system is a window CustomEvent-based architecture. `firePeblorAction`
in `triggers/core/trigger-event.ts` is the primary dispatch function. It tries element-level
routing first (via the action-bus), then falls back to a window event broadcast.

The listener lives in `hooks/use-peblor-trigger-listener.ts`. The composer hook
`usePeblorTriggers` in `hooks/use-peblor-triggers.ts` pulls together override management,
transition state, and trigger listening into one clean interface.

If your action needs element-level direct routing (e.g., targeting a specific video player
by ID), you also need to work with the action-bus at `triggers/action-bus.ts`. This
in-memory map routes actions directly to mounted element handlers without a window event.
It's an optimization, but it matters for media-heavy pages.

That's the pattern: schema variant in, handler in, dispatch already wired. The system is
designed so adding a new action type touches exactly the files you'd expect and nothing else.

See: [runtime-react.md](runtime-react.md), [contracts.md](contracts.md).

---

## Adding a new motion preset

This one is easy. Motion presets are pure JSON. No code changes, no component registration,
no schema updates. Just a new entry in a file.

**Data -- `content/framer-motion/framer-motion-presets.json`**

Open the file and add your preset to the `entrancePresets` object. Each preset has a
`from` state and a `to` state, expressed as framer-motion style objects. A fade-in
preset sets `opacity: 0` in `from` and `opacity: 1` in `to`. A slide-up preset sets
`y: 24` in `from` and `y: 0` in `to`. A blur-in preset sets `filter: "blur(4px)"`
in `from` and `filter: "blur(0px)"` in `to`. Whatever makes sense.

Content authors reference your preset by name in their element JSON. The pipeline resolves
it automatically during the entrance-motion expansion stage. No registration step, no
import, no type definition. Just a JSON key.

The file also has gradient and overlay presets. Feel free to use those patterns too.

That's it. One file, one new key, and your preset is available everywhere. You cannot add
a motion preset in fewer steps without telekinesis.

See: [core.md](core.md) (entrance motion resolution).

---

## Adding a new module definition

Modules are self-contained player definitions -- video players, audio players, and
theoretically anything else that needs a complex UI with slots, gestures, key bindings,
and behaviors. They live as pure JSON under `content/modules/`.

**Data -- `content/modules/<name>.json`**

Create a new JSON file in this directory. The schema is `moduleBlockSchema` at
`packages/contracts/src/peblor/core/peblor-schemas/module-block-schemas.ts`. A module
definition has:

- **`contextType`**: What the module wraps -- `video`, `audio`, `image`, or `model3d`.
  This tells the runtime which adapter to use.
- **`contentSlot`**: Which slot the dynamic element content lands in.
- **`slots`**: A record of named slot definitions. Each slot has positioning, layout,
  visibility conditions, gesture handlers, motion config, and optional child elements.
  Slots are the puzzle pieces your module arranges.
- **`container`**: Styling for the module container (padding, border radius, aspect ratio,
  background).
- **`behavior`**: Runtime behavior settings -- controls fade timing, feedback duration,
  sleep-after-inactivity timeout.
- **`keyBindings`**: Keyboard shortcuts mapped to trigger actions.
- **`overlayMotion`**: Framer-motion config for overlay/controls transitions.

The schema uses `.passthrough()` intentionally in several places (module block, slots,
container, wrapperMotion) so the module system can evolve without schema churn. The
consequences of that choice are documented in a lengthy comment at the top of the file.
If you hit a validation error, read that comment. It explains the philosophy.

Once your module file is in `content/modules/`, pages can reference it via a definition
with `type: "module"` and the appropriate fields. No code changes needed unless you're
adding a new `contextType` that needs a new runtime adapter.

If you _are_ adding a new contextType, you need a runtime adapter in
`packages/runtime-react/src/peblor/`. Follow the patterns in `ElementAudio` or
`ElementModule` for how modules dispatch to adapters. That's rare though. Most module
additions are just new JSON files.

See: [contracts.md](contracts.md) (moduleBlockSchema), existing module files in
`content/modules/`.

---

## Adding a new CLI command

The CLI lives at `tools/pb-cli/`. It's deliberately minimal -- no command framework,
no decorators, no middleware. Just functions in a directory and a switch statement in
the entry point.

**Step one -- `tools/pb-cli/src/commands/<name>.ts`**

Create your command file. Export a function that accepts `(args: string[], io: CommandIo)`
and returns `Promise<number>` (the exit code, typically 0 for success, 1 for error).
The `CommandIo` interface (from `commands/types.ts`) gives you `printText`, `printJson`,
`printErrorText`, and `printErrorJson`. Use those instead of writing to stdout directly.
Your command should be polite.

**Step two -- `tools/pb-cli/src/index.ts`**

Import your function at the top of the file, add a `case "<command-name>":` to the
main switch statement, and wire up any argument parsing. The switch routes command name
strings to handler functions. Arguments beyond `argv[2]` come in as the `args` array.
The boilerplate for a new command is about three lines.

**Step three -- same file, `printUsage()` function**

Add an entry to the usage text so `my-cli-command --help` mentions your command. This
function is hand-maintained text, not auto-generated. It's mildly annoying, but it keeps
the CLI self-documenting without a framework dependency.

That's the whole thing. No dynamic discovery, no plugin registry, no command framework.
A function, a switch case, and a help string. You could add a new command in the time
it takes most frameworks to bootstrap.

See: [tools/pb-cli.md](tools/pb-cli.md).

---

## Adding a new MCP tool

The MCP server at `tools/pb-mcp/` feeds tools to the editor integration. Every tool is
a plain object with a def (name, description, input schema) and a run function.

**Step one -- `tools/pb-mcp/src/tools/<name>.ts`**

Create your tool file. Export a `Tool` object following the types from `tools/pb-mcp/src/types.ts`.
The `ToolDef` contains the tool's name, a user-facing description, and a JSON Schema for
the input parameters. The `run` function receives the args object and returns a promise.

**Step two -- `tools/pb-mcp/src/tools/index.ts`**

Import your tool and add it to the `allTools` array. The MCP server iterates this array
to build its tool list. That's the only registration step. There is no separate registry,
no tool metadata file, no auto-discovery. Just an array.

**Step three (session tools only) -- session API**

If your tool needs to read, edit, or preview a page without writing to disk on every
keystroke, use the session API. The file `page-session.ts` provides `openPageSession`,
`patchPageSession`, `previewPageSession`, `commitPageSession`, `undoPageSession`,
`closePageSession`, and more. Sessions live in an in-memory Map keyed by session ID.
The commit flow writes to disk, runs strict-load validation, and rolls back on failure
(unless force is true).

Session state can be checkpointed to `.pb-session.json` files via `exportSession` in
`session-persistence.ts` and restored via `importSession`. This survives MCP server
restarts and editor reconnections.

The MCP server has about 130 tools. Yours slots right in.

See: [tools/pb-mcp.md](tools/pb-mcp.md).

---

## Adding a new pipeline stage

Pipeline stages are the backbone of Peblor's content processing. Each stage is a pure
function: data in, transformed data out. No side effects, no mutable state, no surprises.
The current sequence is LOAD → VALIDATE → EXPAND → RESOLVE → RENDER, plus a separate MIGRATE utility for schema version upgrades.

Peblor pages go through a multi-step pipeline. The **orchestrator** (`packages/core/src/props.ts`)
calls stages in sequence, handing each one the output of the previous. `stages.ts` also
provides standalone stage wrappers.

The internal core (`packages/core/src/internal/`) holds the stage implementations:
preset resolution (`peblor-presets.ts`), element expansion (`peblor-expand.ts` with
sub-steps in `peblor-expand/`), entrance/exit motion (`peblor-resolve-entrance-motions.ts`),
element defaults (`peblor-apply-element-defaults.ts`), CDN asset signing
(`peblor-resolve-assets-server.ts`), and trigger payload handling (`peblor-triggers.ts`,
`peblor-trigger-handlers.ts`). All files follow the naming convention `peblor-<stage>.ts`.

The shared element pipeline (`packages/core/src/shared.ts`) provides
`transformElementsInSectionsCombined` which runs a sequence of element transforms:
defaults, entrance motion, exit motion, rich text precompilation, button loop CSS, and
theme string precompilation. It walks the entire element tree recursively, handling
groups, infinite scroll, module slots, and reveal sections.

**Adding a stage:**

Create your function file in `packages/core/src/internal/`. Export a transform that
accepts domain state and returns transformed state. Use Zod `safeParse` at boundaries
where data comes from external sources. Return `PeblorDiagnostic` arrays for recoverable
issues -- don't throw for validation problems.

Then wire it into the orchestrator at `packages/core/src/props.ts` or add it to the
shared element transform sequence in `shared.ts`. The orchestrator is just function calls
in order. There's no plugin system, no middleware registry, no pipeline DSL. A function
call in the right place is all it takes.

What could your new stage do? Analyze expanded data, inject additional content from an
external source, transform motion values for a new animation engine, perform custom
validation that doesn't fit schema-based checks, or inject computed data from a CMS
integration. The only constraint is that it follows the pattern: data in, data out.

See: [core.md](core.md), [pipeline.md](../architecture/pipeline.md).

---

## Adding a new Figma converter

The Figma plugin at `tools/figma-plugin/` converts Figma node types into Peblor elements
and sections. Each converter handles a specific path from a Figma node type to a Peblor type.

**Step one -- `tools/figma-plugin/src/converters/`**

Create your converter file. The function takes a Figma node object plus optional context
(parent section, existing definitions, theme config) and returns a Peblor section or
element definition. The Figma plugin normalizes data through a bridge (`tools/figma-bridge/`)
that strips Figma-specific noise, so your converter receives clean data.

**Step two -- routing**

Frame-level conversion routes through `convertFrameToSection` in `node-to-section.ts`.
The function first checks for explicit `[pb: type="..."]` annotations in the frame name,
then falls through auto-detection checks for each section type. Add your detection check
and converter call to this function.

Element-level conversion routes through `convertNode` in `node-to-element.ts`. The
function dispatches by Figma node type (text, rectangle, vector, group, instance, section),
then by annotation intent, then by component instance type. Add your converter to the
appropriate branch.

Frame annotation parsing is in `annotations.ts` and `annotations-parse.ts`. If your
converter needs annotation-based routing, those files handle the parsing. They look for
`[pb: key="value"]` patterns in Figma frame names.

**Step three -- `tools/figma-plugin/EXPORTER_COVERAGE.md`**

Update the coverage document. It tracks which Figma node types map to which Peblor types
and is the first place someone looks to understand what the plugin can handle. The doc
has sections for supported, partial, and missing conversions. Put your converter in the
right category.

**How detection works for section types:**

The routing code in `node-to-section.ts` checks annotations first for explicit type
overrides, then runs auto-detection: column layout detection, reveal layout detection,
scroll container detection, divider detection, form frame detection. If none match, it
defaults to `contentBlock`. Add your type's detection check to this chain.

**How detection works for element types:**

The routing code in `node-to-element.ts` dispatches by Figma node type. Text nodes go
through `convertTextNode`. Rectangles with image fills go through `convertImageNode`.
Groups go through `convertGroupNode`. Instances go through `convertInstanceNode`. If
your element type needs annotation-based detection, add it to the `INTENT_ONLY_ANNOTATION_TYPE_MAP`
which maps annotation intent values to element types. Annotation-detected elements get
`confidence: "low"` with a fallback reason -- they're best-effort conversions that may
need manual cleanup.

For component instances (Figma components used as peblor elements -- scroll progress
bars, Rive animations, etc.), routing goes through `node-instance-convert.ts` which
matches Figma component types to peblor element types.

See: [tools/figma.md](tools/figma.md).

---

Back to [about-these-docs.md](../about-these-docs.md). See also: [contracts.md](contracts.md),
[core.md](core.md), [runtime-react.md](runtime-react.md), [pipeline.md](../architecture/pipeline.md).
