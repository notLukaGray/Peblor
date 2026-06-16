# pb-cli: the command line you can actually have opinions about

The CLI lives at `tools/pb-cli/src/`. It's what you reach for when you're in a
terminal, running CI, scripting something, or you just want to validate a JSON
file without dragging an editor into it. With 53 commands (yes, someone
counted), it covers validation, content management, diagnostics, AI generation,
asset management, batch operations, and a whole drawer of miscellany that
earned its place one pull request at a time.

The design philosophy is refreshingly unambitious: one entry point, a
`switch` statement on the first argument, and command files that receive a
`CommandIo` object and return an exit code. No argument parser library, no
plugin system, no decorators, no dependency injection. Just functions that
print things and return numbers. It works, it's easy to extend, and nobody has
to learn a framework to add a command.

---

## Architecture

Everything flows through `tools/pb-cli/src/index.ts`. The `runCli` function
does four things:

1. **Parse argv.** It grabs `process.argv`, pulls off the first two entries
   (node binary, script path), and uses the third element as the command name.
   Everything after that is `args`. That's it. No `yargs`, no `commander` — the
   CLI is a hammer, not a Swiss Army knife factory.

2. **Create an SDK client.** It calls `createPbClient` from `@pb/sdk` with the
   current contract version. This gives every command access to the full
   content pipeline without importing `@pb/core` directly. Commands that don't
   need it get a lighter code path.

3. **Dispatch.** A `switch` statement with about 53 cases matches the command
   string to its handler. If the command is unknown, it prints the usage guide
   and returns exit code 2. There is no routing hierarchy, no subcommand
   registry — just one flat, beautiful, slightly unwieldy switch.

4. **Return an exit code.** Every command function returns `Promise<number>`.
   Zero means "all good." Two means "you typed something wrong." Anything else
   means "something caught fire."

The whole thing self-executes at the bottom of the file when run directly. The
`import.meta.url` check makes sure it only fires as an entry point, not when
another module imports it. Tidy.

### The `CommandIo` type

Defined in `tools/pb-cli/src/commands/types.ts`, this is the output abstraction
every command uses instead of writing directly to `process.stdout` and
`process.stderr`. It's five methods:

- **`printText`** — writes a plain string to stdout. Human-readable output.
- **`printJson`** — serializes a `CliResult` as pretty-printed JSON to stdout.
  Commands that support `--json` use this instead of `printText`.
- **`printErrorText`** — writes a string to stderr. For error messages that
  should reach the terminal even if stdout is piped elsewhere.
- **`printErrorJson`** — same idea, structured for machine consumers.
- **`printUsage`** — prints the full usage guide.

The `CliResult` type is just `Record<string, unknown>`. No rigid result
envelope. Commands put whatever they want in: `{ valid: true, diagnostics: [] }`
or `{ status: "error", message: "..." }`. It keeps things flexible.

### The `--json` flag convention

Many commands support `--json`. When present, they return structured JSON
(typically via `printJson`) instead of human-readable text. The flag is handled
per-command — each one parses its own args. There's no centralized flag
processing, which means consistency is by convention rather than enforcement,
but also means commands can do whatever makes sense for their output shape.

### How it runs

The `package.json` script invokes it with `tsx src/index.ts`. No build step,
no compilation — just TypeScript executed directly. This keeps the edit-run
cycle fast and removes a whole category of "I forgot to rebuild" errors.

---

## The major command groups

### Validation commands

These are the workhorses. They load a JSON file, parse it against the
appropriate Zod schema from `@pb/contracts`, and print diagnostics. The
signature is consistent: pass a file path, get validation results.

The roster: `validate` (for full pages), `validate-section`, `validate-element`,
`validate-bg`, `validate-action`, `validate-module-fragment`,
`validate-overlay-fragment`, `validate-fragment` (infers the kind
automatically), `validate-fragments` (batch over a directory), and
`validate-all` (every page in the project).

Each lives in its own file under `tools/pb-cli/src/commands/`. Most delegate to
shared library code in `tools/pb-cli/src/lib/`:

- **`json-file.ts`** — reads and parses JSON from disk. Handles absolute and
  cwd-relative paths (not content-relative — `json-file.ts` doesn't know about
  the content directory structure). It's intentionally generic.
- **`fragment-kind.ts`** — heuristics for inferring what kind of fragment a
  file contains. It checks the `type` field first, then unwraps preset file
  wrappers (those `{ "preset-key": { type: "..." } }` structures). The result
  powers `validate-fragment`, the generic validator.
- **`section-validate.ts`**, **`element-validate.ts`**, **`module-validate.ts`**,
  **`bg-validate.ts`** — each exports a validate function that imports the
  relevant schema from `@pb/contracts` and runs `safeParse`. The validation
  logic lives here so both CLI commands and library consumers can use it.
- **`zod-diagnostics.ts`** — converts Zod's verbose `ZodError` into Peblor's
  structured diagnostic format. Flattens nested path arrays into dot-notation
  strings and extracts human-readable messages. (It always uses `"error"`
  severity — there's no severity mapping from Zod, because Zod errors are
  always errors in this project.)

### Diff and migrate commands

**`diff`** takes two page JSON file paths. It delegates to `@pb/sdk` and
reports what changed, broken into breaking changes (structural or semantic
changes that would affect rendering) and non-breaking changes (cosmetic or
metadata updates). Handy in code review.

**`migrate`** takes a file, a source version, and a target version. It applies
automated transforms to migrate content from one contract version to another.
When a field gets renamed or restructured, this is how existing content catches
up. The available versions come from the `CONTRACT_VERSION` constant in
`@pb/contracts`.

### Diagnostic commands

These go beyond schema validation to find real-world content problems:

- **`doctor`** — the big gun. Runs the full pipeline on a page and outputs
  every intermediate stage. Pass `--stage` to stop at `load`, `validate`,
  `expand`, `resolve`, or `assets`. It also supports `--fragment` for
  standalone section files. If a page validates but doesn't render right, this
  is where you start.
- **`audit`** — soft audit beyond schema validation. Finds orphaned definitions
  (blocks in the definitions map that nothing references), broken internal
  links, permanently invisible sections, and disabled overlays. `--all` checks
  every page.
- **`lint`** — style and quality checks. Empty text fields, images without alt
  text, empty sections, unintentional forced theme settings. Stuff that won't
  break validation but isn't great practice. `--all` runs site-wide.
- **`lint-observers`** — specialized scroll observer configuration linting.
  Because scroll observers are surprisingly easy to get subtly wrong.
- **`lint-gpu`** — finds GPU-intensive rendering patterns. Because some pages
  are animated within an inch of your user's battery life.
- **`score-hero`** — evaluates hero section performance characteristics.
- **`check-routes`** — validates every internal navigation target (every `href`,
  every `navigate` action) against known routes. Catches broken links before
  they reach production.

### Content operation commands

These are the commands for managing content without an editor:

- **`section`** — a subcommand with four operations: `list` (show sections in
  render order), `add` (insert a new section with a definition), `remove`
  (delete a section), and `move` (reorder). Every operation validates the
  result before accepting it.
- **`grep`** — searches across all pages for blocks matching criteria. Filter
  by `--type`, `--field`, `--value`, or `--preset`. Also scans preset files
  that pages import. Results grouped by route with JSON paths.
- **`set-metadata`**, **`set-analytics`**, **`set-page-tags`** — targeted
  update commands for page metadata. More convenient than opening the JSON
  file for a single field change. They validate the result before writing.
- **`clone`** — deep-copies a page to a new route, rewriting the title, slug,
  and canonical URL. For when you need a variant of an existing page.
- **`rename-route`** — moves a page from one route to another. Updates the
  slug and canonical URL, then tells you which other pages reference the old
  route so you can fix those too.
- **`extract-preset`** — pulls a definition block out of a page into a
  standalone preset file. The inline definition gets replaced with a preset
  reference. This is how you refactor repeated content into shared presets.
- **`list-unused-presets`** — finds preset files that no page references.
  Digital spring cleaning.

### AI generation commands

These are the CLI face of the same generation logic the MCP server uses:

- **`generate`** — creates a new page scaffold from an intent prompt. Pass a
  route and a natural-language description. The generator consults the
  component catalog to pick appropriate section types and element structures.
  `--dry-run` previews without writing.
- **`fill-section`** — populates a specific section's content fields from a
  description. Like having a junior developer who doesn't argue.
- **`steal`**, **`steal-split`**, **`steal-verify`** — the "design
  inspiration" pipeline. You point it at a URL, it studies the layout,
  typography, and color ratios, then generates an original Peblor page
  inspired by what it learned. Not a cloning tool — it measures, then builds
  from scratch using this project's own idioms. Pass 5 runs an originality
  audit to make sure nothing leaked.
- **`generate-catalogs`** — regenerates the component catalog data files.

### Overlay and content type management

- **`list-overlays`**, **`read-overlay`**, **`write-overlay`** — manage global
  overlay definitions (header, footer, navigation, etc.).
- **`write-modal`**, **`write-module`** — create new modal and module definitions.
- **`list-tags`**, **`list-project-groups`** — show taxonomy tags and content
  groupings across all pages.

### Asset commands

- **`list-assets`** — shows all asset references (images, videos, vectors)
  across pages. Can filter by route, type, or unresolved status.
- **`resolve-asset`** — takes a raw CDN asset path and returns the fully
  signed Bunny CDN URL. Optional width, height, quality, and format parameters.
- **`audit-assets`** — verifies every asset reference resolves to a valid
  CDN URL.

### Batch and cross-page commands

- **`batch-edit`** — applies a JSON merge patch (RFC 7396) to all pages
  matching a filter. Defaults to dry-run — you preview before you commit.
- **`sitemap`** — generates an XML or JSON sitemap of all public pages.

### Capability and extension commands

- **`list-capabilities`** — shows registered importer, exporter, and CMS
  adapter declarations.
- **`validate-capability`** — checks a capability file against its schema.
- **`import-figma`** — accepts a Figma export payload and writes it into the
  content directory. This is how design handoffs land in the project.

### Component catalog commands

- **`explain`** — shows documentation for a component by cluster ID. Supports
  `--fields` and `--examples` for deeper dives, and `--all` to list every
  component filtered by `--kind`.
- **`probe`** — semantic search over the component catalog. Give it
  natural-language queries like "a card layout with an image and text" and it
  returns ranked, scored matches. Supports `--strict`, `--strict-kind`, and
  `--verbose` for scoring details.
- **`propose`** — creates a new component proposal file. It checks existing
  proposals and validates them against the current catalog. Use `propose list`
  to see all pending proposals.
- **`scaffold`** — generates a new page JSON scaffold for a route. Optionally
  base it on an existing cluster ID or preset file.
- **`conformance`** — runs the conformance fixture suite against the pipeline.
  This is what verifies the pipeline handles edge cases correctly.

---

## How command files are structured

Every command module exports a single async function, conventionally prefixed
with `run`. The signature: `(args: string[], io: CommandIo)` and returns
`Promise<number>`. Some commands also accept a `PbClient` parameter.

The function parses what it needs from the string args array (often using a
local `parseArgs` or `flag` helper), does its work (calling into `@pb/sdk`,
`@pb/core`, or standalone validation), formats output through `io`, and
returns a number.

Validation commands follow an especially predictable pattern:

1. Read the file path from args.
2. Read and parse the JSON file.
3. Delegate to a library function that runs the actual schema parse.
4. Print results (diagnostics, pass/fail, etc.).
5. Return 0 for success, non-zero for failure.

Commands that modify content default to dry-run mode. You must pass `--write`
to persist changes. This is deliberate safety — content files are
version-controlled, and accidental writes show up in git history.

---

## How to add a new command

Four steps. No registration table, no enum, no config update. Just four steps.

**Step 1: Create your command file.**

Add a file in `tools/pb-cli/src/commands/`. Export a function matching the
command pattern. If your command shares logic with others, put the shared
pieces in `tools/pb-cli/src/lib/` rather than duplicating them.

**Step 2: Import it in the entry point.**

Add an import at the top of `tools/pb-cli/src/index.ts`.

**Step 3: Add a case to the switch statement.**

Find the `switch (command)` block in `runCli`. Add a case for your command
string. If the command needs required arguments, validate them here and return
2 if they're missing.

**Step 4: Add the usage text.**

Find the `printUsage()` function in the same file. Add a line under the right
category header. The usage text is the user's first impression — make it clear.

That's it. No schema updates, no config changes, no plugin registration. Your
command is callable immediately.

---

## Key files

- `tools/pb-cli/src/index.ts` — Entry point, switch dispatch, usage text
- `tools/pb-cli/src/commands/types.ts` — `CommandIo` and `CliResult` type
  definitions
- `tools/pb-cli/src/commands/core-ops.ts` — validate (full page), diff, and
  migrate commands
- `tools/pb-cli/src/commands/validate-all.ts` — bulk page validation (used in CI)
- `tools/pb-cli/src/commands/doctor.ts` — pipeline debugging command
- `tools/pb-cli/src/commands/section.ts` — section list, add, remove, move
- `tools/pb-cli/src/commands/grep.ts` — cross-page search
- `tools/pb-cli/src/commands/batch-edit.ts` — batch edit with merge patch
- `tools/pb-cli/src/commands/generate-page.ts` — AI page generation
- `tools/pb-cli/src/commands/audit.ts` — soft audit command
- `tools/pb-cli/src/commands/lint.ts` — style and quality lint command
- `tools/pb-cli/src/commands/steal/` — design inspiration pipeline (page,
  split, verify)
- `tools/pb-cli/src/lib/json-file.ts` — JSON file reading and parsing
- `tools/pb-cli/src/lib/fragment-kind.ts` — fragment kind detection heuristics
- `tools/pb-cli/src/lib/zod-diagnostics.ts` — Zod error to diagnostic format
- `tools/pb-cli/src/lib/pages.ts` — page discovery and path resolution
- `tools/pb-cli/src/lib/section-validate.ts` — section validation logic
- `tools/pb-cli/src/lib/element-validate.ts` — element validation logic
- `tools/pb-cli/src/lib/bg-validate.ts` — background validation logic
- `tools/pb-cli/src/lib/module-validate.ts` — module validation logic
- `tools/pb-cli/package.json` — Invokes `tsx src/index.ts`, no build step

---

Back to [about-these-docs.md](../../about-these-docs.md). See also:
[overview.md](overview.md), [pb-mcp.md](pb-mcp.md).
