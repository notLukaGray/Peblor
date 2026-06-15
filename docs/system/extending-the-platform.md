# Extending the platform

This document is your map. Every time you need to add something new to the platform — a new element type, a new section layout, a new background effect, a new trigger action — this is where you come to figure out which files to touch and what each one needs from you.

Each section below covers one kind of extension. The sections are short by design: they tell you the pattern, the files to touch, and what each file needs you to do. The deep-dive docs for each area (contracts, core, runtime-react) have the specifics. Use those when the pattern isn't enough.

Think of this as the table of contents for extending the platform. You shouldn't need to guess what comes next — just follow the links.

## Adding a new element type

This is the most common extension you'll make. Every element type follows the same three-file pattern, and it hasn't changed since the beginning.

**Contracts** at `packages/contracts/src/` (look for the element block schemas file, something like `element-block-schemas.ts`). This is where you define the shape of your new element's data. You add a new variant to the discriminated union in the schema. The variant starts with `z.object({ type: z.literal("elementYourNewType") })`, and you extend it with whatever fields your element needs — required fields, optional fields, motion configuration, child element support, whatever. The variant gets added to the top-level union, and the validators will automatically start checking for it. If you get the schema wrong, Zod tells you exactly what's missing.

**Core** at `packages/core/src/`. There are two things you might need here, and you often only need one of them. Builder defaults go in `packages/core/src/internal/defaults/pb-builder-defaults.ts` — these are the default variants and sizes that your element type uses when the content author doesn't specify them. Custom expand logic goes in `packages/core/src/internal/peblor-expand/` — this is for element types that need special resolution beyond the standard preset-merging and element-inlining pipeline. Most element types don't need custom expand logic. The defaults file is more commonly needed.

**Runtime-react** at `packages/runtime-react/src/peblor/elements/`. You create your component file in this directory, then register it in `packages/runtime-react/src/peblor/elements/index.ts`. Registration means adding an entry to the `ELEMENT_COMPONENTS` map: the type string as the key, the component as the value. If your element is heavy (3D, Rive, Lottie, tabs, drag), import it via `next/dynamic` so it lands in its own JavaScript chunk. If it's lightweight (heading, body text, link, image), import it statically. The import pattern in that file is self-explanatory — follow whichever existing import matches your element's weight profile.

That's it. Three files, and two of them are single-line changes. No decorators to register, no providers to wire up, no dependency injection to configure.

Detailed info: [contracts.md](contracts.md), [core.md](core.md), [runtime-react.md](runtime-react.md).

## Adding a new section type

Same pattern as elements, but at a higher level. Sections are containers that hold elements, so your section type needs to define how it arranges its children.

**Contracts** at `packages/contracts/src/`. Add a variant to the section schema (likely `section-block-schemas.ts`). Section types have specific rules about which element types they can contain, what layout properties they support, and whether they support responsive variants. The schema captures all of that. A `sectionColumn` type, for example, defines column ratios and element namespacing that a `contentBlock` doesn't need.

**Core** at `packages/core/src/internal/peblor-expand/`. Section types sometimes need custom expansion logic. Column sections need to namespace their child elements. Trigger sections need to wire up viewport-based trigger firing. If your new section type has special element resolution needs, this is where you hook in.

**Runtime-react** at `packages/runtime-react/src/peblor/section/`. Create your section component here, then register it in the `SECTION_COMPONENTS` map at `packages/runtime-react/src/peblor/section/index.ts`. Section components are typically statically imported — there are only seven of them and they're always needed.

Detailed info: [contracts.md](contracts.md), [core.md](core.md), [runtime-react.md](runtime-react.md).

## Adding a new background type

Backgrounds work the same way as elements and sections, but they have their own render path. Backgrounds render above or below sections (depending on z-order configuration) and have their own motion system for parallax, scroll transitions, and pointer-follow effects.

**Contracts** at `packages/contracts/src/`. Add a variant to the background schema (`bgBlockSchema`). Background types define a `type` literal and fields for fill properties (color, image, video), motion behavior, and transition timing. The schema should capture what the background looks like and how it behaves across scroll positions.

**Core** at `packages/core/src/internal/peblor-resolve-assets-server.ts`. If your background type references assets (images, videos), make sure `collectPeblorAssetRefs` picks them up during the resolve stage. The CDN signing pipeline only signs what it finds, so if your background type stores asset references in a non-standard field, they'll get missed. Check the resolve stage to see how existing background types register their asset refs.

**Runtime-react** at `packages/runtime-react/src/peblor/background/`. Create your background component here and register it in the `BG_COMPONENTS` map at `packages/runtime-react/src/peblor/background/index.ts`. All background components are lazy-loaded via `next/dynamic` — they're heavy by nature and you don't want them in the initial bundle if the page uses a simple color background.

Detailed info: [contracts.md](contracts.md), [core.md](core.md), [runtime-react.md](runtime-react.md).

## Adding a new trigger action

Trigger actions are the event handlers of the peblor world. They respond to user interactions — clicks, scroll positions, viewport entries — and execute behaviors like navigation, modal toggling, variable setting, or media playback control.

**Contracts** at `packages/contracts/src/`. Add the new action type to the `triggerActionSchema` discriminated union (look in `schema-primitives.ts` or the trigger-related schema files). Define the payload shape: what fields the content author needs to provide to make this action work. A `navigate` action needs a target URL. A `setVariable` action needs a variable name and value. Your action type needs the same clarity about what data it expects.

**Runtime-react** at `packages/runtime-react/src/peblor/hooks/`. Implement the action handler. Trigger actions are dispatched from `usePeblorTriggers` and the related hook infrastructure. When a trigger fires, the hook looks up the action type and delegates to the appropriate handler. You add your handler logic here — it's typically a switch case that receives the action payload and executes the behavior. Existing action types cover navigation, modal control, variable manipulation, media playback control (`assetTogglePlay`, `assetSeek`), Rive state machine control (`rive.*`), and Three.js scene manipulation (`three.*`). Your new action type extends this same infrastructure.

Detailed info: [runtime-react.md](runtime-react.md), [contracts.md](contracts.md).

## Adding a new CLI command

The CLI is intentionally minimal. It lives at `tools/pb-cli/` and uses a straightforward command pattern — no command framework, no decorators, no middleware.

**Step one:** Create your command file in `tools/pb-cli/src/commands/`. Export a function that accepts a `CommandIo` object plus any arguments and returns a `CliResult`. The `CommandIo` type (defined in `tools/pb-cli/src/commands/types.ts`) provides print helpers so you can output plain text, formatted text, or JSON. Your command shouldn't write to stdout directly — use the `CommandIo` methods.

**Step two:** Register the command in `tools/pb-cli/src/index.ts`. Import your function and add a case to the main `switch` statement that routes command names to handlers.

**Step three:** Add the command to the usage text in `printUsage()` in the same file.

That's the whole pattern. There's no plugin system, no dynamic discovery, no registry. Commands are functions in a directory and a switch statement in the entry point.

Detailed info: [tools/pb-cli.md](tools/pb-cli.md).

## Adding a new MCP tool

The MCP server at `tools/pb-mcp/` follows an explicit registration pattern. Every tool is a plain object with a `def` (name, description, input schema) and a `run` function.

**Step one:** Create your tool file in `tools/pb-mcp/src/tools/`. Export a `Tool` object following the `Tool` and `ToolDef` types from `tools/pb-mcp/src/types.ts`. The `def` includes the tool name, a user-facing description, and the input schema. The `run` function contains the tool's logic.

**Step two:** Register the tool by importing it and adding it to the `allTools` array in `tools/pb-mcp/src/tools/index.ts`. The MCP server iterates over this array to build its tool list — no separate registration step needed.

**Step three (optional):** If your tool needs page-level state (reading, editing, previewing a page), use the session API. The session system (`openPageSession`, `patchPageSession`, `commitPageSession`) manages in-memory page state so your tool can apply edits without writing to disk on every keystroke.

The MCP server auto-registers everything in `allTools`. The `inputSchema` from your tool's `def` is used directly — there's no schema generation step or separate type definition to maintain.

Detailed info: [tools/pb-mcp.md](tools/pb-mcp.md).

## Adding a new pipeline stage

Pipeline stages live in `packages/core/src/internal/`. Each stage is a pure function: it takes domain state in and returns transformed state out. No side effects, no mutable state, no surprises.

**Step one:** Create your stage file in `packages/core/src/internal/`, following the naming convention `peblor-your-stage.ts`. The function should accept a domain object (the page data at its current stage of processing) and return a result object. Use Zod `safeParse` at any boundary where you're validating data that came from external sources or earlier stages. Return `PeblorDiagnostic` arrays for collectible issues — don't throw for recoverable problems.

**Step two:** Wire it into the orchestrator at `packages/core/src/index.ts`. The existing stages run in sequence: load, validate, expand, resolve. Your new stage slots in at the appropriate point. If it runs after expand but before resolve, put it between those two calls. The orchestrator is just a series of function calls — there's no plugin system, no middleware registry, no pipeline DSL.

**What the existing stages do:** Load brings JSON off disk and resolves presets. Validate checks everything against the schemas. Expand converts references into concrete elements and applies defaults. Resolve signs CDN URLs and computes responsive sizes. Your new stage could analyze the expanded data, inject additional content, transform motion values, or perform custom validation that doesn't fit the schema-based validator. The only rule is that it takes data in and returns data out.

Detailed info: [core.md](core.md), [pipeline.md](../architecture/pipeline.md).

## Adding a new Figma converter

The Figma plugin at `tools/figma-plugin/` converts Figma node types into peblor elements and sections. Each converter handles a specific conversion path from a Figma node type to a peblor type.

**Step one:** Create your converter file in `tools/figma-plugin/src/converters/`. The converter takes a Figma node object and optional context (parent section, existing definitions, theme configuration) and returns a peblor section or element definition.

**Step two:** Wire it into the conversion pipeline. Frame-level conversion goes through `tools/figma-plugin/src/main-frame-convert.ts`. Node-level routing goes through `tools/figma-plugin/src/converters/node-to-section.ts` or `tools/figma-plugin/src/converters/node-to-element.ts`, depending on what your converter produces.

**Step three:** Update `tools/figma-plugin/EXPORTER_COVERAGE.md` to reflect the new conversion path. The coverage document tracks which Figma node types map to which peblor types, and it's the first place someone looks when they want to know what the Figma plugin can handle.

The converter system is straightforward because the Figma plugin normalizes its output through a bridge (`tools/figma-bridge/`) that strips Figma-specific noise. Your converter receives already-clean data and just needs to produce valid peblor JSON.

Detailed info: [tools/figma.md](tools/figma.md).

---

Back to [about-these-docs.md](../about-these-docs.md). See also: [contracts.md](contracts.md), [core.md](core.md), [runtime-react.md](runtime-react.md), [pipeline.md](../architecture/pipeline.md).
