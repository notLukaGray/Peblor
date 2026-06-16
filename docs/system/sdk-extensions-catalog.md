# SDK, extensions, and catalog

Three small packages that do zero pipeline work but make everything around it possible. They don't transform content or render pages -- they're the toolbelt you reach for when building things _with_ Peblor rather than _inside_ it.

Think of them as: the SDK for when you want to poke at pages from a script, extensions for when you need to get data in or out of some foreign system, and the catalog for when you need to know what the heck exists and whether it's covered.

---

## SDK (`@pb/sdk`)

The SDK is a thin wrapper around `@pb/core` -- around 170 lines of code that add guardrails for external use. It exists so you don't have to import the core pipeline directly when all you want is to validate a page, diff two of them, migrate a schema version, or load one from disk.

There's exactly one way in: `createPbClient()`. It returns an object with four methods:

### `validate(page)`

Throws your page JSON at the validator. Before it does, it checks the input size -- anything over 2MB gets bounced before it ever reaches core. This is the difference between the SDK and raw core: core trusts you, the SDK does not trust whoever sent you that JSON.

Returns whether the page is valid, the parsed data if it is, and diagnostics if it's not. Same shape as core's output, so your diagnostic formatters work either way.

Use this when you're accepting page JSON from something you don't control: an API endpoint, a file upload, a CMS webhook that arrived at 3 AM.

### `diff(pageA, pageB)`

Walks two page objects and lists what changed. Each change records the JSON path, the before and after values, and a `breaking` flag that lights up when something got removed.

The recursion depth is capped at 32 levels. If your page JSON nests deeper than that, something has gone wrong and the diff will tell you so.

Use this for previewing changes before applying them, generating changelogs, or auditing what a batch edit actually did. The output is plain objects -- readable by humans and machines alike.

### `migrate(page, options)`

Migrates a page between schema versions. It can figure out the source version by reading the page's own `contractVersion` field -- or you can tell it explicitly if you know better. The target version defaults to whatever `@pb/contracts` says is current.

Returns the migrated page plus a log of what transforms were applied. If the page is already current, it's a no-op.

Note: unlike `validate` and `diff`, `migrate` does **not** enforce the 2MB size limit. In practice this rarely matters because you're usually migrating pages you've already loaded, but if you're piping raw user input into `migrate`, you might want to check the size yourself.

Use this when loading older pages that predate the current schema. Most callers never touch it -- `load` calls it automatically.

### `load(source)`

Takes a file path, reads the JSON, validates it, migrates it if needed, and hands you back the result. It's the "just give me the page" button -- what the CLI uses under the hood.

### When to use the SDK vs. importing core directly

Here's the rule: if you're building pipeline internals -- a new pipeline stage, a custom validator, something deep in the guts -- import from `@pb/core`. If you're writing a CLI command, a web API, a script, or anything that accepts input from outside the trusted bubble, use the SDK. The guardrails (size limits, depth bounds, safe version inference) are there for a reason.

The SDK is intentionally small and meant to stay that way. If you find yourself adding significant logic here, it probably belongs in core.

---

## Extensions (`@pb/extensions`)

This package defines plugin interfaces for three kinds of integrations: importers, exporters, and CMS adapters. It does not implement any of them -- it's the contract, not the contractor.

Each plugin carries a `capability` declaration that says exactly what it can do: what formats it handles, what element types it supports, what diagnostic codes it might throw. The capability schemas live in `@pb/contracts` and are validated on load. A plugin claiming to support a format must have the matching capability document, or it won't be trusted.

### ImporterPlugin

Converts external data into Peblor page objects. The `import` method takes... well, anything. The source type is `unknown` -- it could be a file path, raw JSON, a buffer, a stream. What it does with that is up to the implementation. It returns an array of pages, any diagnostics from the conversion, and a list of constructs it found but couldn't map to Peblor types.

The Figma bridge is the primary consumer. Figma's export format is pure auto-layout wrappers and frame groups -- about as Peblor-unfriendly as it gets -- and the importer interface is what normalizes that mess into clean page JSON.

Reference implementations live in the package so you can see the pattern without guessing. There's a JSON file importer (reads a file from disk, hands back a page) and a third-party payload importer (accepts CMS-style document records). Both are simple enough to read in one sitting.

### ExporterPlugin

The reverse of an importer. Takes a Peblor page, returns output in some external format. The `export` method returns a `target` (what format it produced), `output` (the actual exported data), and diagnostics.

The reference implementation is a no-brainer: it deep-clones the page and calls it "peblor-json" (lossless, naturally). Real exporters would target things like WordPress XML, Markdown, or whatever else the world needs.

### CmsAdapterPlugin

A two-way sync interface. Has optional `pull` and `push` methods -- both are optional because not every adapter is bidirectional.

- `pull(query)` fetches from the CMS, returns pages and diagnostics (same shape as an importer's output).
- `push(pages)` sends an array of pages to the CMS, returns a sync report with changed IDs and diagnostics.

A pull-only adapter (importing from a CMS) doesn't need `push`. A push-only adapter (publishing to a CMS) doesn't need `pull`. The `syncModes` field in the capability declaration tells the world which direction it works.

### The AnyPbPlugin type

There's a union type that covers all three: `ImporterPlugin | ExporterPlugin | CmsAdapterPlugin`. Useful when you're building a tool that needs to accept any kind of plugin and dispatch by capability type at runtime.

### The testkit

The package ships a testkit with `runImporterFixtureSuite` and `runExporterFixtureSuite`. Each takes a plugin and a set of fixture files, runs every fixture through the plugin, and scores the results. A fixture passes if the plugin produced no error-level diagnostics.

The Figma bridge tests work this way: fixture files capture known Figma export patterns, and the testkit verifies the bridge converts them to the expected Peblor output. New Figma pattern shows up? New fixture captures it.

---

## Catalog (`@pb/catalog`)

The catalog tracks what components exist, cross-references them against the schema registry, and lets you search them by intent. It's the answer to "do we have an element for that?" and "did someone forget to wire up the new thing?"

### Intent files

Every component gets a `*.intent.yaml` file. These are plain-language descriptions of what a component does, when to use it, what it composes with, what it feels like, and -- crucially -- what it is **not**. That last part is what prevents semantic search from returning a button when you asked for a link.

An intent file has fields like:

- **feels_like** -- what it does and why you'd reach for it
- **not_this_if** -- the cases where you should pick something else (this is the real key to good search results)
- **axes** -- the dimensions it varies along: headings scale by level, buttons come in variants, images have layout modes, etc.
- **covers** / **does_not_cover** -- concrete things the component handles or explicitly doesn't
- **composes_with** -- what parents, siblings, and motion patterns it plays nice with

There are about 90 intent files covering elements, sections, backgrounds, triggers, and motion presets.

### The ENTRIES registry

Every known component has a slot in `ENTRIES.ts`. It's a flat array of all valid component IDs -- 77 of them, divided into clusters (elements/sections/backgrounds), triggers, and motion presets. CI checks one side of the equation: every entry in this array must have a matching intent file. The other direction (every intent file must be listed) is not enforced, which is why there are more intent files than entries. Some intent files are vestigial, some are for components still in flight.

### The probe

The `findCoveringClusters()` function is the search engine. It's not AI -- it's a straightforward substring match. It takes your query, lowers the case, and checks if it appears anywhere in a component's `feels_like` description or `not_this_if` list. If it does, that component lands in the results.

A component that says "horizontal scrolling" in its feel is a match. A component that says "not a carousel" in its `not_this_if` means your query for "carousel" hits the wrong thing and counts _against_ the match. Crude? Yes. But for "find me a heading element" it works perfectly and never hallucinates.

The probe powers the `pb-cli probe` command and the MCP's `probe_components` tool. When the AI editor asks "find me an element that scrolls horizontally" and returns `elementMarquee`, that's the probe at work. No embeddings, no vectors, no API calls -- just old-fashioned string matching.

There are also `findCluster(id)` for exact lookups and `clustersByCategory(category)` for filtering by type.

### The generator

A script reads all intent files, validates each entry against the schema registry, and writes `catalog.json` and `catalog.yaml` to the generated directory. The schema registry maps intent-file schema references to live Zod schemas from `@pb/contracts`. Unknown schema ref? The generator hard-fails.

### Coverage checking

CI runs `catalog:check-coverage`, which verifies that every entry in ENTRIES has a valid intent file with actual examples that parse against the registered schema. It also catches stubs -- intent files whose examples have fewer than three non-type fields and aren't marked as minimal.

The `--sweep` mode takes coverage further: it walks every field of every schema in the registry and flags any field that no catalog entry's axes cover. This finds schema fields that exist but have no documentation -- a quieter kind of drift than a missing intent file, but drift nonetheless.

### The four build commands

| Command                  | What it does                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `catalog:build`          | Rebuild catalog files from intent files. Run locally after adding or modifying intents.                    |
| `catalog:build:ci`       | Same as build, but fails if the output differs from what's checked in. Keeps the committed catalog honest. |
| `catalog:check-coverage` | Reports coverage gaps without rebuilding. Faster for quick checks between edits.                           |
| `catalog:sweep`          | Like check-coverage plus a field-by-field audit of every schema for undocumented fields.                   |

---

## One doc or three?

Right now all three live here because they're small and share the "not a pipeline stage" vibe. That's fine as long as they stay small. If any of them grows significantly -- say the extension system accumulates a dozen plugin types, or the catalog adds a real semantic embedding pipeline -- it earns its own page. Until then, the belt stays buckled.

---

Back to [core.md](core.md). Next: [runtime-react.md](runtime-react.md).
