# SDK, extensions, and catalog

Three small packages that wrap core functionality and provide tooling infrastructure. None of them is a pipeline stage -- they don't transform content or render pages -- but each serves a distinct purpose for developers building on top of the platform. Think of them as the utility belt: the SDK for safe external access, extensions for import/export plumbing, and the catalog for knowing what components exist and where.

## SDK (`@pb/sdk`)

The SDK at `packages/sdk/src/index.ts` is a thin programmatic wrapper around `@pb/core`. It's not the pipeline -- it's a convenience layer for tools, scripts, and potential external consumers that need to validate, diff, or migrate pages without importing the full pipeline and all its dependencies.

The entry point is `createPbClient(options)`, which returns a client object with four methods. Each method adds guardrails on top of core -- size limits, depth bounds, version inference -- that make the SDK safe to expose to untrusted inputs in a way that core's raw exports aren't.

### validate(page)

Calls `validatePage` from core after checking the input size. The SDK enforces a 2MB input size limit -- anything larger gets rejected before it reaches the validator. This prevents a malicious or malformed input from consuming excessive memory during validation.

Returns a `ValidatePageResult` object with `valid: boolean`, `data` (the parsed page if valid), and `diagnostics` (the issues if invalid). The result shape is the same as core's validation output, which means you can pass it to the same diagnostic formatters and error reporters.

Use this when you're accepting page JSON from an external source -- an API endpoint, a file upload, a CMS webhook. The 2MB limit and the safe parse make it suitable for public-facing validation endpoints.

### diff(pageA, pageB)

Recursively walks two page objects and produces a list of `DiffChange` objects. Each change records:

- The JSON path to the changed field (like `$.definitions.hero.variant`)
- The `from` value (what it was in pageA)
- The `to` value (what it is in pageB)
- A `breaking` flag -- true if a field that existed in A was removed in B

The diff is bounded at 32 levels of recursion depth to prevent infinite loops on circular references. It handles arrays by index and objects by key, so additions, removals, and reorderings all produce distinct change types.

Use this for showing previews of changes before they're applied, for generating changelogs, or for auditing what a migration or batch edit actually changed. The diff output is designed to be machine-readable and human-readable at the same time -- each change is a plain object with a clear path and before/after values.

### migrate(page, options)

Calls `migratePage` from core but adds contract version inference. You can pass explicit `from` and `to` version strings, or omit them and let the SDK read the from version from the page's `contractVersion` field. The to version defaults to the current contract version from `@pb/contracts`.

Returns the migrated page data plus a list of applied transforms and any diagnostics produced during migration. If the page is already at the target version, the migration is a no-op that returns the page unchanged.

Use this when loading pages that might be from an older schema version. The SDK handles the version detection so callers don't have to.

### load(source)

Loads a page from a file path using `loadPage` from core. Takes a string path, resolves it, loads the JSON, and returns the validated page data. This is the simplest of the four methods -- it's basically `readFile` plus `validate` in one call.

Use this in scripts and tools that need to load a page from disk for inspection or processing. It's what the CLI uses under the hood.

### When to use the SDK vs. core directly

The SDK exists for external-facing use cases: tools, scripts, API endpoints, CI pipelines. If you're building internal pipeline logic or writing a new pipeline stage, import from `@pb/core` directly. If you're writing a CLI command or a web API that validates user-supplied page JSON, use the SDK. The SDK adds the guardrails; core does not.

The SDK source is intentionally small -- around 150 lines at `packages/sdk/src/index.ts`. It's meant to stay that way. If you find yourself adding significant logic here, it probably belongs in core or in a separate tool.

## Extensions (`@pb/extensions`)

The extensions package at `packages/extensions/src/index.ts` defines plugin interfaces for three kinds of external integrations: importers, exporters, and CMS adapters. It doesn't implement any of these integrations itself -- it just defines the contract that real implementations must follow.

The plugin type system is at `packages/extensions/src/plugin-types.ts`. Each plugin carries a `capability` field that declares what it can do (what formats it supports, what features it handles, what features it doesn't). The capability schemas live in `@pb/contracts` and are exported as `importerCapabilitySchema`, `exporterCapabilitySchema`, and `cmsAdapterCapabilitySchema`. Validation of capability declarations happens against these schemas -- a plugin that claims to support a format must have the matching capability document.

### ImporterPlugin

Converts external data into Peblor page objects. The `import` method takes a source (file path, raw data, or stream) and returns an `ImportResult` with:

- `pages` -- an array of Peblor page objects produced from the source
- `diagnostics` -- any issues encountered during conversion
- `unsupported` -- a list of constructs in the source that the importer couldn't map to Peblor types

The Figma bridge (`tools/figma-bridge/`) is the primary consumer. It takes Figma's export format -- which is Figma-shaped, full of auto-layout wrappers and frame groups -- and normalizes it into Peblor JSON through the importer interface.

There's a reference implementation at `packages/extensions/src/reference-importers.ts` that shows the pattern. For testing, the testkit provides `runImporterFixtureSuite`, which runs fixture files through any importer plugin and compares the output against expected results.

### ExporterPlugin

Converts Peblor page objects into external formats. The `export` method takes a page and returns an `ExportResult` with:

- `format` -- the target format identifier
- `data` -- the exported output (string, buffer, or stream)
- `diagnostics` -- any issues encountered during conversion

Exporters are the reverse of importers. They're what you'd use to push Peblor content to an external system -- a headless CMS, a static site generator, a documentation tool.

The reference implementation is at `packages/extensions/src/reference-exporters.ts`.

### CmsAdapterPlugin

A two-way sync interface for connecting Peblor with an external CMS. Has optional `pull` and `push` methods:

- `pull(source)` -- fetches content from the CMS and returns an `ImportResult` with pages and diagnostics
- `push(page)` -- sends content to the CMS and returns a `CmsSyncResult` with success status, remote ID, and diagnostics

Both methods are optional because not all adapters are bidirectional. A pull-only CMS adapter (for importing from a CMS) doesn't need to implement `push`. A push-only adapter (for publishing to a CMS) doesn't need to implement `pull`.

### The AnyPbPlugin type

The package provides `AnyPbPlugin`, a union type that covers all three plugin types. A tool can accept `AnyPbPlugin[]` and dispatch based on the capability type at runtime. This is useful for tools that need to support any kind of plugin without knowing the specific plugin type at compile time.

### The testkit

At `packages/extensions/src/testkit.ts`, the testkit provides `runImporterFixtureSuite` and `runExporterFixtureSuite` for automated plugin testing. Each function takes a plugin instance and a fixture directory, runs every fixture through the plugin, and compares the output against expected results stored alongside the fixtures.

This is how the Figma bridge is tested -- fixture files capture known Figma export patterns, and the testkit verifies that the bridge converts them to the expected Peblor output. If a new Figma pattern shows up, a new fixture captures it.

## Catalog (`@pb/catalog`)

The catalog at `packages/catalog/src/index.ts` tracks what components exist in the runtime and cross-references them against the schema registry. It's the authority on coverage -- which components are documented, which have intent files, and which are registered in the schema but missing from the runtime (or vice versa). If you're adding a new component type, the catalog is what tells you whether you've connected all the dots.

### The intent system

Component intent is declared in `*.intent.yaml` files under `packages/catalog/src/intent/`. Each intent file describes one component in plain language. An intent file answers questions like:

- **What does this component do?** Free-form text describing the component's purpose, when you'd use it, and what it looks like on screen.
- **What does it compose with?** Lists of related component IDs that this one works with -- put inside, composed from, or paired alongside.
- **What does it feel like?** A list of keywords for semantic search: "scrollable", "horizontal", "interactive", "animated", "media", "form", and so on. These are what the probe system matches against.
- **What is it not?** Explicit descriptions of what the component doesn't do, to prevent false matches in semantic search.
- **Variant axes:** The dimensions along which the component varies -- heading has `level` (h1-h6), button has `style` (default/accent/ghost), image has `layout` (cover/contain/fill), and so on.
- **Schema reference:** The `schema_ref` string that ties this intent file to the actual Zod schema in `@pb/contracts`.

The master registry is the `ENTRIES` array at `packages/catalog/src/intent/ENTRIES.ts`. It's a flat array of every known component ID in the system. CI enforces two invariants: every entry in this array must have a corresponding `*.intent.yaml` file, and every intent file must be listed in the array. You can't have one without the other.

### Probe components

The probe system at `packages/catalog/src/index.ts` provides semantic search over the catalog. The function `findCoveringClusters(intent)` takes a natural-language description and matches keywords against each entry's `feels_like` and `not_this_if` fields.

Here's roughly how the matching works: the search query is tokenized into keywords, each keyword is scored against the intent file's `feels_like` list (positive matches) and `not_this_if` list (negative matches), and the results are ranked by score. A component that explicitly says "not this" for a keyword scores lower than one that says "feels like this."

The probe is what powers the `pb-cli probe` command and the MCP's `probe_components` tool. When you ask the AI editor "find me an element that scrolls horizontally" and it comes back with `elementMarquee`, that's the probe system at work.

There's also `findCluster(id)` for exact ID lookup and `clustersByCategory(category)` for filtering by element, section, trigger, motion, or background categories. These are straightforward -- no semantic matching, just direct lookups and category filters.

### Schema registry

The generator at `packages/catalog/src/generator/index.ts` produces the catalog JSON. It reads all intent files, validates each entry against the schema registry, and emits `catalog.json` and `catalog.yaml` to `packages/catalog/src/generated/`.

The schema registry at `packages/catalog/src/generator/schema-registry.ts` maps intent-file `schema_ref` strings to live Zod schemas from `@pb/contracts`. When the generator processes an intent file, it looks up the `schema_ref`, pulls the actual Zod schema, and validates that the component's variant axes match what the schema defines. If you add a new element type and reference a new schema in its intent file, you must add an entry to the schema registry. The generator hard-fails on unknown schema refs -- it won't produce a catalog with unmapped types.

Coverage checking at `packages/catalog/src/generator/check-coverage.ts` compares the `ENTRIES` array against the schema union to find gaps. It catches two kinds of drift:

- **Components that exist in the schema but have no intent file.** Someone added a new element type to `elementBlockSchema` but forgot to add it to the catalog. The coverage checker flags it.
- **Intent files for components that don't exist in the schema.** Someone created an intent file for a component that was removed from the schema, or never existed. The coverage checker flags it.

Both directions are checked, and both produce clear diagnostics telling you what's missing or orphaned. This is part of `npm run check`.

### Build modes

The catalog has four build commands, each serving a different purpose:

- **`catalog:build`** -- Regenerates catalog files from intent files. Run this locally after adding or modifying intents. It writes the generated JSON and YAML files to the generated directory.

- **`catalog:build:ci`** -- Same as build, but fails if the regenerated output differs from the checked-in copy. Runs in CI to ensure the checked-in catalog is always up to date. If you edit an intent file, build the catalog, and commit the regenerated files together, this passes. If you forget to rebuild, CI fails.

- **`catalog:check-coverage`** -- Reports coverage gaps without rebuilding. Faster than a full build for quick checks. Reports missing intent files, orphaned intent files, and schema-vs-registry mismatches.

- **`catalog:sweep`** -- Like check-coverage, but also removes orphaned intent files that don't correspond to any entry in `ENTRIES.ts`. This is a cleanup command, not something you run in CI.

---

Back to [core.md](core.md). Next: [runtime-react.md](runtime-react.md).
