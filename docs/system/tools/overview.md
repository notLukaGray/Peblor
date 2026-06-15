# Tools at a glance

Peblor ships four pieces of tooling. They all sit on top of the same core packages -- `@pb/contracts` for schemas and `@pb/core` for the pipeline -- but each one solves a different problem for a different audience. This page gives you the lay of the land: what each tool does, why you'd reach for it, how they depend on each other, and which one to use for which task.

(For deep dives on each tool, the individual pages in this directory have you covered.)

---

## pb-cli -- the terminal Swiss Army knife

The CLI is what you reach for when you're in a terminal, a CI pipeline, or a shell script and you need to do something with Peblor content. It's at `tools/pb-cli/src/`, and it's refreshingly unsophisticated -- a single entry file that switches on the first argument, dispatches to command modules, and prints results to stdout or stderr. No argument parser framework, no plugin system, no decorators. Just functions that take arguments and a `CommandIo` object.

You'd use the CLI when you want to:

- **Validate everything** before a push. The `validate-all` command parses every page in the project and reports diagnostics. Your pre-push hook should run this.
- **Validate a single thing.** Individual commands for pages, sections, elements, backgrounds, actions, module fragments, overlay fragments, and capabilities. Grab a specific file and check it against the Zod schemas.
- **Diff two page versions.** Takes two page JSON files and reports what changed, broken down by breaking vs. non-breaking changes. Useful for code review or debugging a regression.
- **Migrate content between schema versions.** When the contracts change, you can automate the upgrade path for existing content files.
- **Search across pages with grep.** Find every element of a certain type, every preset reference, or every block that has a specific field set. The `grep` command is like the Unix tool but Peblor-aware.
- **Scaffold new content.** Generate a new page from a route, or a new section, or a new preset. The generator uses the component catalog to make informed type choices.
- **Fill a section via AI.** Give it a natural-language description of what you want in a section, and it'll populate the content fields using the catalog.
- **Run diagnostics.** The `audit` command checks for orphaned definitions and broken internal links. `lint` flags quality issues like empty text fields or images without alt text. `doctor` runs the full pipeline on a page and shows you every intermediate stage so you can pinpoint exactly where something goes wrong.
- **Manage assets.** List all asset references across pages, resolve a raw path to a signed CDN URL, and audit that every asset ref actually resolves.
- **Batch-edit.** Apply a JSON merge patch to every page matching a filter criteria.
- **Import Figma payloads.** The `import-figma` command accepts the same export format the Figma plugin produces, so you can pipe design exports directly into the content directory from the terminal.
- **Manage the content directory.** Clone pages, rename routes, extract presets, read and write overlays, modals, and modules, set metadata and analytics fields, generate sitemaps.
- **Work with the extension system.** List and validate capability declarations for importers, exporters, and CMS adapters.
- **Propose new components.** The `propose` command helps you file a proposal for a component that doesn't exist in the catalog yet. It checks your proposal against the existing catalog to make sure you're not duplicating something that's already there.

The CLI talks to `@pb/sdk` (which wraps `@pb/core` and `@pb/contracts`) for all of its heavy lifting. The command modules themselves are mostly thin wrappers -- they parse arguments from a string array, call the right SDK function, and format the output. The shared `lib/` directory handles the patterns that repeat across commands: reading JSON files from disk, detecting what kind of fragment a file contains, formatting Zod errors into readable diagnostics, and discovering pages in the content tree.

---

## pb-mcp -- the AI editor's interface

The MCP server at `tools/pb-mcp/src/` is what AI editors (including Claude Code) talk to when they need to read, write, or reason about Peblor content. It exposes the same operations as the CLI -- validation, diffing, migration, content management -- but through the Model Context Protocol, which means they show up as named tools and resources in any MCP-compatible client.

You'd use the MCP server when you want to:

- **Edit a page interactively with an AI agent.** This is the primary use case. The session model (open a page, apply patches, preview, undo, commit) is purpose-built for the conversational editing workflow AI agents use. You don't write intermediate states to disk.
- **Generate a new page from a description.** Tell the AI what you want, and the `generate_page` tool will scaffold a page using the component catalog, complete with appropriate section types and element choices.
- **Fill a section or get layout suggestions.** The `fill_section` and `suggest_layout` tools use the catalog to make smart content choices.
- **Explore the component catalog.** List components by kind, search them by intent, get full schema details for any element or section type. The `probe_components` tool takes natural-language queries like "a button that opens a modal" and returns matching catalog entries.
- **Understand the blast radius of a change.** Before editing a shared preset, use `preview_preset_change` to see exactly which pages it would affect and what fields would change. Same for module usage, overlay usage, and element type usage -- the impact analysis tools tell you who'd be affected.
- **Validate and lint.** Same validation engine as the CLI, but available as tools that return structured JSON for the AI to act on.
- **Batch operations.** Apply edits across many pages, generate sitemaps, audit assets.
- **Import Figma exports.** The `import_figma` tool accepts the same payload format as the CLI and Figma plugin.
- **Export pages.** The `export_page` tool can produce a clean-json version of a page, stripping internal diagnostic fields.

The MCP server is notably different from the CLI in one big way: it has state. Sessions live in memory across tool calls. You open a page once, inspect and modify it over several turns, and commit when you're satisfied. The CLI is stateless -- every invocation starts fresh.

Like the CLI, the MCP server imports from `@pb/core` and `@pb/contracts` for its pipeline logic. It adds its own `lib/` directory for filesystem helpers, merge-patch logic, and slug/path utilities. The resources (read-only data feeds at URIs like `peblor://pages` or `peblor://components/{kind}`) are defined separately from tools but registered through the same entry point.

---

## figma-plugin -- the design-to-JSON converter

The Figma plugin at `tools/figma-plugin/` runs inside Figma's sandboxed JavaScript environment. It's what you use when you want to turn a Figma design into Peblor content without hand-authoring JSON.

You'd use the plugin when you want to:

- **Export a page design from Figma.** Select the frames you've designed using Peblor naming conventions, run the export, and get back a complete page JSON file ready to drop into `content/pages/`.
- **Export design system components as presets.** Name your frames with `Preset/` or `btn-`, `card-` prefixes, and the plugin automatically generates preset files that pages can reference.
- **Export modals, modules, and global backgrounds.** The naming convention system (`Modal/`, `Module/`, `Bg/`) lets you target specific content types from within Figma.
- **Export responsive pairs.** Design desktop and mobile variants of the same frame with matching names, and the plugin detects the pair, converts both, and merges them into a single responsive definition.
- **Validate output against schemas.** Every export goes through Zod validation before it reaches your clipboard or download. Broken output gets flagged with diagnostics in the UI.
- **Export a single section as an artifact.** Don't need a full page? Grab one frame and export just that section.

The plugin has a dual-thread architecture: the main thread (sandboxed, no DOM) handles Figma API access and conversion logic, while the UI thread (an embedded iframe) handles the user interface -- frame previews, export mode selection, and diagnostic display. They talk through `postMessage`.

---

## figma-bridge -- the normalization layer everyone shares

The bridge at `tools/figma-bridge/` isn't a standalone tool you run. It's a shared library that the plugin and widget both consume. It contains the types and normalization logic that strip Figma-specific noise and produce clean intermediate data.

Think of it this way: Figma's raw API output is messy. Node trees of variable depth, Figma-specific type names, undocumented paint properties, variable bindings that need resolving. The bridge normalizes all of it into a consistent intermediate representation that the plugin's converters can work with. It handles:

- Parsing Figma layer names to determine export target type (page, preset, modal, module) from naming prefix conventions.
- Heuristic rules for detecting issues in Figma nodes -- naming conventions, structural validation.
- Stripping `[pb: ...]` annotation strings from layer names.
- Inferring design context from node position and hierarchy.
- Combining rules and context into unified inspection results.
- Converting layer names to valid Peblor slug and ID formats.

The bridge is plain TypeScript with no Figma sandbox dependencies -- it's importable by any package.

---

## figma-widget -- in-canvas audit without leaving the design

The widget at `tools/figma-widget/` runs in Figma's in-canvas widget system. Unlike the plugin, which opens a separate panel, the widget lives on the canvas itself and provides persistent, always-visible tooling.

You'd use the widget when you want to:

- **Audit your design's export readiness without switching contexts.** The audit tab scans every frame on the current page and reports export target kind, responsive pair status (paired, orphan, or n/a), and naming convention violations. All without running the export.
- **Check keyboard shortcuts.** The keys tab shows a reference for Peblor's `[pb: ...]` annotation syntax.
- **Get selection-reactive feedback.** The inspector footer at the bottom of the widget updates in real time as you select different nodes, showing the node's export target info -- what kind of content it would produce and what key it would use.

The widget is designed for continuous feedback during design work. A designer can see warnings and issues as they work, without switching to the plugin or leaving the canvas. It's the fast feedback loop; the plugin is the "export when ready" button.

---

## How the tools connect

All four tools sit on top of the same foundation:

- **`@pb/contracts`** provides the Zod schemas that every tool validates against. If the contracts change, every tool picks up the new rules.
- **`@pb/core`** provides the pipeline functions: loading, validating, expanding, resolving, and migrating content. Both the CLI and the MCP server import from it directly.
- **`@pb/sdk`** wraps `@pb/core` into a convenient client API. The CLI and MCP server both consume it.
- **`figma-bridge`** is a separate shared library consumed only by the Figma plugin and widget -- the CLI and MCP server don't need it.

The data flow across the tools looks like this:

1. Designs start in Figma. The **widget** provides real-time feedback during authoring. The **plugin** converts frames to Peblor JSON.
2. The **bridge** normalizes Figma's raw data into the intermediate representation that the plugin and widget share.
3. The export payload (pages, presets, modals, modules, backgrounds) lands in the content directory via the plugin's clipboard/zip output, or via the CLI's `import-figma` command, or via the MCP's `import_figma` tool.
4. Once the JSON is in `content/`, the **CLI** and **MCP server** take over for editing, validation, batch operations, and deployment prep.

---

## Which tool for which task

| If you want to...                                   | Use this tool                                                 |
| --------------------------------------------------- | ------------------------------------------------------------- |
| Validate every page before a push                   | `pb-cli validate-all` (run this in CI)                        |
| Validate a single page or fragment                  | `pb-cli validate-page <file>` or the MCP `validate_page` tool |
| Compare two page versions in a PR                   | `pb-cli diff a.json b.json` or the MCP `diff_pages` tool      |
| Edit a page through an AI assistant                 | MCP page session tools (open, patch, commit)                  |
| Generate a new page from a description              | MCP `generate_page` or `pb-cli generate`                      |
| Turn a Figma design into Peblor JSON                | figma-plugin                                                  |
| Check if your Figma frames are ready to export      | figma-widget, then figma-plugin                               |
| Make the same edit across many pages                | MCP `batch_edit_pages` or `pb-cli batch-edit`                 |
| Find broken internal links                          | MCP `check_routes` or `pb-cli check-routes`                   |
| Generate an XML sitemap                             | MCP `generate_sitemap` or `pb-cli sitemap`                    |
| Import a Figma export payload from the command line | `pb-cli import-figma <file>` or MCP `import_figma`            |
| Find what pages use a specific preset               | MCP `probe_preset_usage`                                      |
| Search for every element of a certain type          | `pb-cli grep --type elementHeading` or MCP `grep_pages`       |
| Add a new section to a page                         | `pb-cli section add` or MCP `add_section`                     |
| Understand why a page won't validate                | `pb-cli doctor <file>` or MCP `doctor_page`                   |
| Set metadata on a page                              | `pb-cli set-metadata` or MCP `set_page_metadata`              |
| Learn about a component's schema                    | MCP `explain_component` or `get_element_schema`               |
| Propose a new component for the catalog             | `pb-cli propose new` or MCP `propose_component`               |
| Export a clean (diagnostic-free) page JSON          | MCP `export_page` with format `clean-json`                    |

---

## Key files

- `tools/pb-cli/src/index.ts` -- CLI entry point and command dispatch
- `tools/pb-cli/src/commands/` -- all command modules (about 50 of them)
- `tools/pb-cli/src/lib/` -- shared helpers for the CLI
- `tools/pb-mcp/src/index.ts` -- MCP server entry point and request handlers
- `tools/pb-mcp/src/tools/` -- all tool implementations (about 110 tools)
- `tools/pb-mcp/src/resources/` -- resource definitions
- `tools/pb-mcp/src/lib/` -- shared helpers for the MCP server
- `tools/figma-plugin/src/main.ts` -- plugin main thread entry point
- `tools/figma-plugin/src/main-run-export.ts` -- export orchestration
- `tools/figma-plugin/src/converters/` -- all node-to-content converters
- `tools/figma-bridge/src/` -- shared types and normalization logic
- `tools/figma-widget/src/widget.ts` -- widget entry point and state

---

Back to [about-these-docs.md](../../about-these-docs.md). Its sibling pages: [pb-cli.md](pb-cli.md), [pb-mcp.md](pb-mcp.md), [figma.md](figma.md).
