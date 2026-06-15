# pb-cli: the command-line interface

The CLI lives at `tools/pb-cli/src/`. It's what you reach for when you're in a terminal, running CI, scripting something, or just want to validate a JSON file without involving an editor. It has about 50 commands covering validation, content management, diagnostics, AI generation, asset management, and batch operations.

The design philosophy is deliberately simple: one entry point, a `switch` statement on the first argument, and command files that get a `CommandIo` object and return an exit code. No argument parser library, no plugin system, no decorators, no dependency injection. Just functions that print to stdout or stderr.

---

## Architecture

Everything flows through `tools/pb-cli/src/index.ts`. The `runCli` function does four things:

1. **Parse argv.** It grabs `process.argv`, pulls off the first two entries (node binary and script path), and uses the third element as the command name. Everything after that is the args array.
2. **Create an SDK client.** It calls `createPbClient` from `@pb/sdk` with the current contract version. This gives commands access to the full pipeline without importing `@pb/core` directly.
3. **Dispatch.** A `switch` statement (about 50 cases) matches the command string to its handler function. If the command is unknown, it prints usage and returns exit code 2.
4. **Return an exit code.** Every command function returns a `Promise<number>`. Zero means success, two means a usage error (wrong arguments or missing required flags), and any other non-zero means a runtime error.

The whole thing self-executes at the bottom of the file when run directly -- the `import.meta.url` check ensures it only fires as an entry point, not when imported as a module.

### The `CommandIo` type

Defined in `tools/pb-cli/src/commands/types.ts`, this is the output abstraction that every command uses instead of writing directly to `process.stdout` and `process.stderr`. It has five methods:

- **`printText`** writes a plain string to stdout. This is the default output mode -- human-readable text.
- **`printJson`** serializes a `CliResult` object as pretty-printed JSON to stdout. Commands that support `--json` use this instead of `printText`.
- **`printErrorText`** writes a string to stderr. For error messages and warnings that should reach the terminal even if stdout is piped somewhere.
- **`printErrorJson`** serializes a `CliResult` as JSON to stderr. Same idea as `printErrorText` but structured for machine consumers.
- **`printUsage`** prints the full usage guide. The entry point constructs this from the `CommandIo` before passing it to commands.

The `CliResult` type is just `Record<string, unknown>` -- an unstructured dictionary. Commands put whatever they want into it: `{ valid: true, diagnostics: [] }` or `{ status: "error", message: "..." }`. There's no rigid result envelope, which keeps things flexible.

### The `--json` flag convention

Many commands support a `--json` flag. When present, they call `printJson` instead of `printText`, producing structured output a script can parse. When absent, they produce human-readable text. The flag is handled per-command, not at the entry level -- each command parses its own args.

---

## The major command groups

There are roughly 50 commands organized into categories. The usage text in the entry point groups them with section headers, but the dispatch switch statement is flat -- no routing hierarchy, just one switch.

### Validation commands

These are the most-used commands day to day. They load a JSON file, parse it against the corresponding Zod schema from `@pb/contracts`, and print diagnostics. The signature is consistent: pass a file path, get validation results.

The validation commands include: `validate` (for pages), `validate-section`, `validate-element`, `validate-bg`, `validate-action`, `validate-module-fragment`, `validate-overlay-fragment`, `validate-fragment` (infers kind automatically), `validate-fragments` (batch over a directory), `validate-all` (every page in the project), and `validate-capability`.

Each of these lives in its own file under `tools/pb-cli/src/commands/`. Most of them delegate to shared library code in `tools/pb-cli/src/lib/` for the common patterns:

- `json-file.ts` handles reading and parsing JSON from disk. It catches parse errors and wraps them in consistent diagnostics.
- `fragment-kind.ts` has heuristics for inferring what kind of fragment a file contains by inspecting its `type` field and top-level keys.
- `section-validate.ts`, `element-validate.ts`, `module-validate.ts`, and `bg-validate.ts` each implement the actual parse logic for their fragment type, importing the appropriate schema from `@pb/contracts`.
- `zod-diagnostics.ts` converts Zod's error format into Peblor's structured diagnostic format. This is important because Zod errors are verbose and nested -- the lib flattens them into a list of `{ path, message, severity }` objects.

### Diff and migrate commands

**`diff`** takes two page JSON file paths. It delegates to `@pb/sdk`'s diff capabilities and reports what changed, broken down into breaking changes (structural or semantic changes that would affect rendering) and non-breaking changes (cosmetic or metadata updates). Useful in code review to see exactly what a PR changed in a content file.

**`migrate`** takes a file, a source version, and a target version. It applies automated transforms to migrate the content from one contract version to another. This is how the project handles schema evolution -- when a field gets renamed or restructured, the migration commands update existing content files. The available versions are defined by the CONTRACT_VERSION constant in `@pb/contracts`.

### Diagnostic commands

These go beyond schema validation to find real-world content problems:

- **`doctor`** runs the full pipeline on a page and outputs every intermediate stage. You pass a `--stage` flag to stop at a specific point: `load`, `validate`, `expand`, `resolve`, or `assets`. The output shows you exactly what the pipeline produces at each step, which is invaluable for debugging why a page that validates still doesn't render right. You can also pass `--fragment` to run the doctor on a standalone section fragment.
- **`audit`** does a soft audit beyond schema validation: it finds orphaned definitions (blocks in the definitions map that aren't referenced by sectionOrder or elements), broken internal links (hrefs that point to nonexistent routes), permanently invisible sections, and disabled overlays. Running `audit --all` checks every page.
- **`lint`** runs style and quality checks: empty text fields, images without alt text, empty sections, unintentional forced theme settings, and similar issues that won't break validation but aren't good practice. Again, `--all` runs across the entire site.
- **`lint-observers`** and **`lint-gpu`** are specialized lint passes for scroll observer configuration and GPU-intensive rendering patterns.
- **`score-hero`** evaluates hero section performance characteristics.
- **`check-routes`** validates every internal navigation target -- every `href` in a button or link, every `navigate` action payload -- against the known page route list. This catches broken links before they reach production.

### Content operation commands

These are the commands for managing content without an editor:

- **`section`** is a subcommand with three operations: `list` (show sections in render order), `add` (insert a new section with a definition), `remove` (delete a section), and `move` (reorder a section to a different index). Each operation validates the result before accepting it.
- **`grep`** searches across all pages for blocks matching criteria: by type (`--type elementHeading`), by field presence (`--field visibility`), by field value (`--field type --value contentBlock`), or by preset reference (`--preset demo-hero`). Results are grouped by route with JSON paths.
- **`set-metadata`**, **`set-analytics`**, **`set-page-tags`** are targeted update commands for page metadata fields. They're more convenient than opening the JSON file for a single field change.
- **`clone`** deep-copies a page to a new route, rewriting the title, slug, and canonical URL. Handy for creating variants of an existing page.
- **`rename-route`** moves a page from one route to another. It updates the slug and canonicalUrl in the moved page, and reports which other pages reference the old route in their hrefs so you can update those too.
- **`extract-preset`** pulls a definition block out of a page into a standalone preset file. The page's inline definition gets replaced with a preset reference. This is how you refactor repeated content into shared presets.

### AI generation commands

- **`generate`** creates a new page scaffold from an intent prompt. You pass a route and a natural-language description of what the page should contain. The generator consults the component catalog to pick appropriate section types and element structures. With `--dry-run`, it previews without writing.
- **`fill-section`** populates a specific section's content fields from a description. Pass the route, the section key, and a description like "a hero section with a gradient background, a large heading, and two CTA buttons." It fills in text content, image references, and layout configuration.

Both of these use the same catalog-aware generation logic that the MCP server's `generate_page` and `fill_section` tools use.

### Overlay and content type management

- **`list-overlays`**, **`read-overlay`**, and **`write-overlay`** manage global overlay definitions (header, footer, navigation, etc.).
- **`write-modal`** and **`write-module`** create new modal and module definitions.
- **`list-tags`** and **`list-project-groups`** show taxonomy tags and content groupings across all pages.

### Asset commands

- **`list-assets`** shows all asset references (images, videos, vectors) across pages. Can filter by route, type, or unresolved status.
- **`resolve-asset`** takes a raw CDN asset path and returns the fully signed Bunny CDN URL. Optional width, height, quality, and format parameters for image transforms.
- **`audit-assets`** verifies every asset reference resolves to a valid CDN URL.

### Batch and cross-page commands

- **`batch-edit`** applies a JSON merge patch (RFC 7396) to all pages matching a filter. The filter can match by type, field presence, or field value. Always defaults to dry-run -- you preview the affected pages before writing.
- **`sitemap`** generates an XML or JSON sitemap of all public pages.

### Capability and extension commands

- **`list-capabilities`** shows registered importer, exporter, and CMS adapter declarations.
- **`validate-capability`** checks a capability file against its schema.
- **`import-figma`** accepts a Figma export payload (from a file or inline JSON) and writes it into the content directory. Same format the Figma plugin produces.

### Component catalog commands

- **`explain`** shows documentation for a component by cluster ID. Optionally shows field schemas and examples. Supports `--all` to list every component in the catalog, optionally filtered by `--kind`.
- **`probe`** does semantic search over the component catalog. Give it a natural-language query like "a card layout with an image and text" and it returns the best matching component types, ranked by relevance score. Flags for strict matching, kind filtering, and verbose scoring.
- **`propose`** creates a new component proposal. You describe what you need and it generates a structured proposal file. It also checks existing proposals and validates them against the current catalog.
- **`scaffold`** generates a new page JSON scaffold for a route. Optionally bases on an existing cluster ID or preset file.
- **`conformance`** runs the conformance fixture suite against the pipeline.

---

## How command files are structured

Each command module exports a single function. The convention is to prefix it with `run`. The function signature follows a consistent pattern: it's async, takes `args: string[]` and `io: CommandIo` (and sometimes additional parameters like a `PbClient`), and returns `Promise<number>`.

The function parses what it needs from the string args array, does its work (often calling into `@pb/sdk` or `@pb/core`), formats output through `io`, and returns a number.

Commands that handle validation follow an especially consistent pattern:

1. Read the file path from args.
2. Read and parse the JSON file.
3. Delegate to a library function that runs the actual schema parse.
4. Print results (diagnostics, pass/fail, etc.).
5. Return 0 for success (valid or empty diagnostics), non-zero for failure.

Commands that modify content (write, batch-edit, etc.) have an additional pattern: they default to dry-run mode. You have to pass `--write` to persist changes. This is a deliberate safety measure -- content files are version-controlled, and accidental writes show up in git history.

---

## The shared library directory

`tools/pb-cli/src/lib/` contains the code that multiple commands depend on. It's small and focused:

- **`json-file.ts`** -- Reads a JSON file from disk, parses it, and returns the parsed value or a structured error. Handles both absolute paths and content-relative paths.
- **`fragment-kind.ts`** -- Heuristics to detect what kind of fragment a JSON file contains. Looks at the `type` field first, then falls back to top-level key inspection. This is what powers `validate-fragment` (the generic validator that infers its schema).
- **`section-validate.ts`**, **`element-validate.ts`**, **`module-validate.ts`**, **`bg-validate.ts`** -- Each exports a validate function that imports the relevant schema from `@pb/contracts` and runs `safeParse`, returning a list of PeblorDiagnostic objects. These are the actual validation logic, separated so both the CLI commands and the library code can use them.
- **`zod-diagnostics.ts`** -- Converts Zod's raw `ZodError` into Peblor's diagnostic format. Flattens nested path arrays into dot-notation strings, extracts human-readable messages, and maps Zod severity to Peblor severity levels.
- **`pages.ts`** -- Page discovery and path resolution logic: given a route like `/about`, find the actual file path in the content directory or the absolute path if already absolute.

Each of these lib files also has a corresponding `.test.ts` file in the same directory.

---

## How to add a new command

The process involves exactly four steps. None of them involve updating a registration table, an enum, or a config file.

**Step 1: Create your command file.**

Add a file in `tools/pb-cli/src/commands/`. Export a function that matches the command pattern. The function should accept `(args: string[], io: CommandIo)` and return `Promise<number>`. It can accept additional parameters (like a `PbClient`) if needed -- the caller in the switch statement will pass whatever it needs.

If your command shares logic with other commands, put the shared logic in `tools/pb-cli/src/lib/` rather than duplicating it. For example, if you're adding a new type of validation, add the validation function to the appropriate lib file (or create a new one) and have your command call it.

**Step 2: Import it in the entry point.**

At `tools/pb-cli/src/index.ts`, add an import statement for your command function near the other imports at the top of the file.

**Step 3: Add a case to the switch statement.**

Find the `switch (command)` block in `runCli`. Add a new `case` for your command string following the existing pattern -- something like a case arm that calls your function with the parsed args and IO object.

If your command needs the SDK client, pass `pb` as well. If it has required arguments, validate them in the case block and return 2 (usage error) if they're missing.

**Step 4: Add the usage text.**

Find the `printUsage()` function in the same file. Add a line for your command under the appropriate category header. Follow the existing formatting -- the usage text is the user's first impression of how to call your command.

That's it. No schema updates, no config changes, no plugin registration. The command appears in `pb-cli --help` automatically only through step 4, and it's callable immediately through the switch statement.

---

## Key files

- `tools/pb-cli/src/index.ts` -- Entry point, switch dispatch, usage text (where you add new commands)
- `tools/pb-cli/src/commands/types.ts` -- `CommandIo` and `CliResult` type definitions
- `tools/pb-cli/src/commands/core-ops.ts` -- validate, diff, and migrate commands
- `tools/pb-cli/src/commands/validate-all.ts` -- bulk page validation (used in CI)
- `tools/pb-cli/src/commands/doctor.ts` -- pipeline debugging command
- `tools/pb-cli/src/commands/section.ts` -- section list, add, remove, move commands
- `tools/pb-cli/src/commands/grep.ts` -- cross-page search
- `tools/pb-cli/src/commands/batch-edit.ts` -- batch edit command
- `tools/pb-cli/src/commands/generate-page.ts` -- AI page generation command
- `tools/pb-cli/src/commands/audit.ts` -- soft audit command
- `tools/pb-cli/src/commands/lint.ts` -- style and quality lint command
- `tools/pb-cli/src/lib/json-file.ts` -- JSON file reading and parsing
- `tools/pb-cli/src/lib/fragment-kind.ts` -- fragment kind detection heuristics
- `tools/pb-cli/src/lib/zod-diagnostics.ts` -- Zod error to PeblorDiagnostic formatting
- `tools/pb-cli/src/lib/pages.ts` -- page discovery and path resolution
- `tools/pb-cli/src/lib/section-validate.ts` -- section validation logic
- `tools/pb-cli/src/lib/element-validate.ts` -- element validation logic
- `tools/pb-cli/src/lib/bg-validate.ts` -- background validation logic
- `tools/pb-cli/src/lib/module-validate.ts` -- module validation logic

---

Back to [about-these-docs.md](../../about-these-docs.md). See also: [overview.md](overview.md), [pb-mcp.md](pb-mcp.md).
