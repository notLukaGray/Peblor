# Tools at a glance

Peblor ships four tools and one shared library that keeps them speaking the same language. They all sit on top of the same core packages -- `@pb/contracts` for schemas and `@pb/core` for the pipeline -- but each one solves a different problem for a different audience. Some are for developers in a terminal. Some are for designers in Figma. One is for AI editors that don't have hands.

This page is the 10,000-foot view. For the deep dives, the individual pages in this directory have you covered.

---

## pb-cli -- the terminal Swiss Army knife

The CLI is what you reach for when you're in a terminal, a CI pipeline, or a shell script and you need to do something with Peblor content. It lives at `tools/pb-cli/` and it's refreshingly unpretentious -- no argument parser framework, no plugin system, no dependency injection. Just functions that take arguments and a `CommandIo` object, print results, and get out of your way.

You'd use the CLI when you want to:

- **Validate everything** before a push. The `validate-all` command parses every page in the project and reports diagnostics. Your pre-push hook should run this.
- **Validate a single thing.** Individual commands for pages, sections, elements, backgrounds, actions, module fragments, overlay fragments, and capabilities. Grab a specific file and check it against the Zod schemas.
- **Diff two page versions.** Compare two page JSON files and see what changed, with breaking and non-breaking changes called out separately. Useful for code review or debugging a regression.
- **Migrate content between schema versions.** When the contracts change, automate the upgrade path for existing content.
- **Search across pages.** Find every element of a certain type, every preset reference, or every block that has a specific field set. Grep, but Peblor-aware.
- **Scaffold new content.** Generate a new page from a route, or a new section, or a new preset. The generator consults the component catalog so it makes informed type choices.
- **Fill a section via AI.** Give it a plain-English description of what you want in a section, and it'll populate the content fields using the catalog.
- **Run diagnostics.** Audit for orphaned definitions and broken internal links. Lint for quality issues like empty text fields or images without alt text. Doctor runs the full pipeline on a page and shows every intermediate stage so you can pinpoint exactly where something goes wrong.
- **Manage assets.** List all asset references across pages, resolve a raw path to a signed CDN URL, and audit that every asset ref actually resolves.
- **Batch-edit.** Apply a JSON merge patch to every page matching a filter criteria.
- **Import Figma payloads.** Pipe design exports directly into the content directory from the terminal.
- **Manage the content directory.** Clone pages, rename routes, extract presets, read and write overlays, modals, and modules, set metadata and analytics fields, generate sitemaps.
- **Propose new components.** Check your proposal against the existing catalog to make sure you're not reinventing a wheel that's already there.

The CLI talks to `@pb/sdk` (which wraps `@pb/core` and `@pb/contracts`) for all of its heavy lifting. The command modules are mostly thin wrappers -- parse arguments from a string array, call the right SDK function, format the output. The shared `lib/` directory handles the patterns that repeat across commands.

[Read the full pb-cli docs &rarr;](pb-cli.md)

---

## pb-mcp -- the AI editor's interface

The MCP server at `tools/pb-mcp/` is what AI editors (including Claude Code) talk to when they need to read, write, or reason about Peblor content. It exposes the same operations as the CLI -- validation, diffing, migration, content management -- but through the Model Context Protocol. That means they show up as named tools and resources in any MCP-compatible client.

Why have both a CLI and an MCP server, you ask? Because typing commands is what humans do. Conversing through tools is what AI agents do. They serve the same purpose for different kinds of collaborators.

You'd use the MCP server when you want to:

- **Edit a page interactively with an AI agent.** This is the whole reason it exists. The session model -- open a page, apply patches, preview, undo, commit -- is purpose-built for the conversational editing workflow AI agents use. No intermediate states written to disk.
- **Generate a new page from a description.** Tell the AI what you want, and `generate_page` scaffolds a complete page using the component catalog, with appropriate section types and element choices.
- **Fill a section or get layout suggestions.** The `fill_section` and `suggest_layout` tools use the catalog to make smart content choices.
- **Explore the component catalog.** List components by kind, search them by intent, pull full schema details for any element or section type. The `probe_components` tool takes natural-language queries like "a button that opens a modal" and returns matching catalog entries.
- **Understand the blast radius of a change.** Before editing a shared preset, use `preview_preset_change` to see exactly which pages it would affect. Same for modules, overlays, and element types -- the impact analysis tools tell you who you'd break.
- **Validate, lint, and diagnose.** Same engine as the CLI, but returns structured JSON for the AI to act on.
- **Batch operations, sitemaps, asset audits.** You get the idea.
- **Import Figma exports.** The `import_figma` tool accepts the same payload format as the CLI and Figma plugin.

The MCP server is notably different from the CLI in one big way: **it has state**. Sessions live in memory across tool calls. You open a page once, inspect and modify it over several turns, and commit when you're satisfied. The CLI is stateless -- every invocation starts fresh. That statefulness is what makes the conversational editing workflow possible.

Like the CLI, the MCP server imports from `@pb/core` and `@pb/contracts` for pipeline logic. It adds its own `lib/` for filesystem helpers, merge-patch logic, and slug utilities. The resources (read-only data feeds at URIs like `peblor://pages` or `peblor://components/{kind}`) are defined separately from tools but registered through the same entry point.

[Read the full pb-mcp docs &rarr;](pb-mcp.md)

---

## The Figma toolchain

Three pieces, one story. The plugin converts designs to JSON. The bridge normalizes Figma's messy output into clean data. The widget gives designers real-time feedback without leaving the canvas. They're designed to be used together.

### figma-plugin -- the design-to-JSON converter

The plugin at `tools/figma-plugin/` runs inside Figma's sandboxed JavaScript environment. It's what you use when you want to turn a Figma design into Peblor content without hand-authoring JSON.

Select the frames you've designed using Peblor naming conventions, run the export, and get back a complete page JSON file ready to drop into `content/pages/`. It handles presets, modals, modules, global backgrounds, responsive pairs, and single-section artifacts. Every export goes through Zod validation before it reaches your clipboard -- broken output gets flagged with diagnostics in the UI.

The plugin has a dual-thread architecture: the main thread (sandboxed, no DOM) handles Figma API access and conversion logic, while the UI thread (an embedded iframe) handles the user interface -- frame previews, export mode selection, and diagnostic display. They talk through `postMessage`.

### figma-bridge -- the normalization layer everyone shares

The bridge at `tools/figma-bridge/` isn't a tool you run. It's a shared library that the plugin and widget both consume. It contains the types and normalization logic that strip Figma-specific noise and produce clean intermediate data.

Figma's raw API output is messy. Node trees of variable depth. Figma-specific type names. Undocumented paint properties. Variable bindings that need resolving. The bridge normalizes all of it into a consistent intermediate representation. It handles parsing layer names to determine export targets, stripping `[pb: ...]` annotation strings, inferring design context from node position and hierarchy, and converting layer names to valid Peblor slug and ID formats.

The bridge is plain TypeScript with no Figma sandbox dependencies. Any package can import it.

### figma-widget -- in-canvas audit without leaving the design

The widget at `tools/figma-widget/` runs in Figma's in-canvas widget system. Unlike the plugin, which opens a separate panel, the widget lives on the canvas itself. It provides persistent, always-visible tooling that designers can glance at without switching context.

The audit tab scans every frame on the current page and reports export target kind, responsive pair status (paired, orphan, or n/a), and naming convention violations. The keys tab shows a reference for Peblor's `[pb: ...]` annotation syntax. The inspector footer updates in real time as you select different nodes, showing what kind of content that frame would produce and what key it would use.

The widget is the fast feedback loop. The plugin is the "export when ready" button. A designer places frames, the widget catches issues immediately, and when everything is clean, the plugin does the final conversion. No back-and-forth.

[Read the full Figma toolchain docs &rarr;](figma.md)

---

## How the tools connect

All four tools sit on top of the same foundation:

- **`@pb/contracts`** provides the Zod schemas that every tool validates against. Change the contracts, and every tool picks up the new rules on the next sync.
- **`@pb/core`** provides the pipeline functions: loading, validating, expanding, resolving, and migrating content. Both the CLI and MCP server import from it directly.
- **`@pb/sdk`** wraps `@pb/core` into a convenient client API. The CLI and MCP server both consume it.
- **`figma-bridge`** is a separate shared library consumed only by the Figma plugin and widget. The CLI and MCP don't need it.

The data flow across the tools works like this:

1. Designs start in Figma. The **widget** provides real-time feedback during authoring. The **plugin** converts frames to Peblor JSON.
2. The **bridge** normalizes Figma's raw data into the intermediate representation the plugin and widget share.
3. The export payload lands in the content directory -- via the plugin's clipboard or zip output, via the CLI's `import-figma` command, or via the MCP's `import_figma` tool.
4. Once the JSON is in `content/`, the **CLI** and **MCP server** take over for editing, validation, batch operations, and deployment prep.

---

## Which tool for which task

| If you want to...                               | Use this tool                                            |
| ----------------------------------------------- | -------------------------------------------------------- |
| Validate every page before a push               | `pb-cli validate-all` (run in CI)                        |
| Validate a single page or fragment              | `pb-cli validate-page` or the MCP `validate_page` tool   |
| Compare two page versions in a PR               | `pb-cli diff a.json b.json` or the MCP `diff_pages` tool |
| Edit a page through an AI assistant             | MCP page session tools (open, patch, commit)             |
| Generate a new page from a description          | MCP `generate_page` or `pb-cli generate-page`            |
| Turn a Figma design into Peblor JSON            | figma-plugin                                             |
| Check if your Figma frames are ready to export  | figma-widget, then figma-plugin                          |
| Make the same edit across many pages            | MCP `batch_edit_pages` or `pb-cli batch-edit`            |
| Find broken internal links                      | MCP `check_routes` or `pb-cli check-routes`              |
| Generate an XML sitemap                         | MCP `generate_sitemap` or `pb-cli sitemap`               |
| Import a Figma export payload from the terminal | `pb-cli import-figma` or MCP `import_figma`              |
| Find what pages use a specific preset           | MCP `probe_preset_usage`                                 |
| Search for every element of a certain type      | `pb-cli grep --type elementHeading` or MCP `grep_pages`  |
| Add a new section to a page                     | `pb-cli section add` or MCP `add_section`                |
| Figure out why a page won't validate            | `pb-cli doctor` or MCP `doctor_page`                     |
| Set metadata on a page                          | `pb-cli set-metadata` or MCP `set_page_metadata`         |
| Learn about a component's schema                | MCP `explain_component` or `get_element_schema`          |
| Propose a new component for the catalog         | `pb-cli propose` or MCP `propose_component`              |
| Export a clean (diagnostic-free) page JSON      | MCP `export_page` with format `clean-json`               |

---

## Key files

- `tools/pb-cli/src/index.ts` -- CLI entry point and command dispatch
- `tools/pb-cli/src/commands/` -- all command modules (about 50 of them)
- `tools/pb-cli/src/lib/` -- shared helpers for the CLI
- `tools/pb-mcp/src/index.ts` -- MCP server entry point and request handlers
- `tools/pb-mcp/src/tools/` -- all tool implementations (nearly 100 files)
- `tools/pb-mcp/src/resources/` -- resource definitions
- `tools/pb-mcp/src/lib/` -- shared helpers for the MCP server
- `tools/figma-plugin/src/main.ts` -- plugin main thread entry point
- `tools/figma-plugin/src/main-run-export.ts` -- export orchestration
- `tools/figma-plugin/src/converters/` -- all node-to-content converters
- `tools/figma-bridge/src/` -- shared types and normalization logic
- `tools/figma-widget/src/widget.ts` -- widget entry point and state

---

Back to [about-these-docs.md](../../about-these-docs.md). Its sibling pages: [pb-cli.md](pb-cli.md), [pb-mcp.md](pb-mcp.md), [figma.md](figma.md).
