# pb-mcp: the MCP server for AI-driven editing

## What is MCP?

Model Context Protocol (MCP) is a standard for AI editors to talk to tools. Think of it as a waiter who brings a menu (tool descriptions), takes your order (tool calls), and brings back the result. The Peblor MCP server is that waiter, but instead of food it brings back validated page JSON, session diffs, and catalog schemas. And instead of a restaurant, it lives inside your terminal on stdio transport.

The MCP server at `tools/pb-mcp/src/` is the bridge between AI editors and Peblor content. Claude Code or any MCP-compatible client talks to it over stdio. If you've ever said "add a hero section to the landing page" to an AI and watched it happen, this is the server that made it work.

## The big idea

This is not a general-purpose API. It is purpose-built for a very specific kind of workflow: the conversational, iterative, change-my-mind-a-lot editing loop that AI agents naturally fall into.

Imagine what editing a page looks like when you're an AI agent. You open the page, skim the structure, change some text, add a section, change your mind about the section, undo the change, try something else, preview the result, and finally commit. That sequence of operations maps beautifully to an in-memory session model. It maps terribly to stateless request-response. So that is exactly what this server provides: sessions, undo, diff, incremental patch, and a commit that runs the entire validation pipeline before writing anything.

The CLI (`pb-cli`) is great for one-off operations and scripting. The MCP server is great for having a conversation with your content.

## How it connects

The server uses the standard `@modelcontextprotocol/sdk` with stdio transport. The entry point at `tools/pb-mcp/src/index.ts` creates an MCP `Server` instance and registers handlers for five standard request schemas:

- **ListToolsRequestSchema** returns all registered tool definitions. The MCP client calls this once at startup to discover what it can do. This is the menu.
- **CallToolRequestSchema** dispatches a named tool call to its implementation. It finds the tool by name in the giant `allTools` array, calls its `run` function with the parsed arguments, and returns the result as JSON text. If the tool throws, it catches the error and returns it as an `isError` response.
- **ListResourcesRequestSchema** returns static resource URIs -- fixed addresses like `peblor://pages` for read-only data that the AI queries passively.
- **ListResourceTemplatesRequestSchema** returns URI template patterns for parameterized resources, like `peblor://components/{kind}` where the client fills in `kind`.
- **ReadResourceRequestSchema** reads a specific resource by URI. It checks static resources first (exact URI match), then falls through to template resources (regex match against the template pattern).

The transport is stdio. No HTTP, no WebSockets, no network config. The server reads JSON-RPC messages from stdin and writes responses to stdout. Any MCP client that can spawn a child process can talk to it.

## Tool registration pattern

All tools live in a flat array called `allTools` at `tools/pb-mcp/src/tools/index.ts`. It's organized into commented sections -- validation, discovery, read content, write/generate, page sessions, AI generation, cross-page operations, asset pipeline, advanced diagnostics, overlays, tags, batch ops, impact analysis -- but underneath the organization, it's just a big array. About 130-odd tools at last count, and growing.

Each tool is an object with exactly two properties:

- **`def`** is a `ToolDef` with `name` (unique, used for dispatch), `description` (human-readable, this is what the AI reads when deciding which tool to call), and `inputSchema` (a JSON Schema object describing the tool's parameters).
- **`run`** is an async function that takes `args: Record<string, unknown>` and returns `Promise<unknown>`. The return value gets serialized to JSON text by the entry point handler.

Every tool file in `tools/pb-mcp/src/tools/` exports one or more `Tool` objects. A tool file typically imports from `@pb/core` and `@pb/core/loader` for pipeline operations, and from the MCP's own `lib/` directory for filesystem and utility helpers.

The tool index file imports every tool and pushes them into the array. Adding a new tool means exactly two lines: an import and an array entry. No schema registration, no routing table, no auto-discovery ceremony.

### Resource registration pattern

Resources work similarly but are defined separately in `tools/pb-mcp/src/resources/index.ts`. There are two kinds:

- **Static resources** have a fixed `uri` string and a `read` function that returns data every time the resource is accessed. Examples: `peblor://pages` (lists all page routes), `peblor://presets` (lists all preset IDs grouped by category).
- **Template resources** have a `uriTemplate` string with placeholders (like `peblor://components/{kind}`), a `match` function that tests a URI against the template and extracts parameters via regex, and a `read` function that takes the matched parameters and returns data.

The entry point file filters the resource array into static and template groups, then uses both when handling resource requests. Resources are read-only -- they're for data the AI queries passively, not actions it performs.

## The session model: the secret sauce

The most interesting thing about this MCP server, and the reason it doesn't just wrap the CLI, is the session model in `tools/pb-mcp/src/tools/page-session.ts`. Here's the problem it solves:

When an AI agent edits a page, it typically needs to make several changes in sequence. Rename a section, add a new element, tweak some text, preview the result, change its mind and undo. If every single edit required reading from disk, writing to disk, and re-parsing the full page, the workflow would be glacial. And every partial save would leave the filesystem in an inconsistent state.

The session model keeps everything in memory until the agent explicitly commits. Sessions live in a plain `Map<string, Session>` at module scope. No database. No persistence. Just a map that survives across tool calls for the lifetime of the MCP server process. If the server restarts, all sessions vanish -- unless you exported them.

Here is what the lifecycle looks like:

**`open_page_session`** reads the page from disk into memory. The session holds two copies: `page` (the current working state) and `originalPage` (a snapshot of what was on disk at open time). It also initializes a `history` array for undo and timestamps. After loading, it runs validation so the agent knows about pre-existing issues before making changes.

**`patch_page_session`** applies a JSON merge patch (RFC 7396) to the in-memory `page`. Before applying, it pushes the current state onto the history stack. After applying, it validates the patched state. Crucially, the patch is held even if validation fails -- the agent can inspect the diagnostics and apply a correcting patch rather than starting over.

**`undo_page_session`** pops the last state from the history stack and restores it. Validates after restore. Multiple undos work because each patch pushes to history before applying.

**`preview_page_session`** returns the current in-memory state without writing to disk. The agent inspects what it has so far.

**`inspect_session`** gives the agent a view of what changed. In summary mode, it computes a field-level diff against `originalPage` and reports only the changed paths. In full mode, it dumps the entire page JSON. Summary mode is faster and usually more useful.

**`session_diff`** goes deeper: it returns a detailed list of add, remove, and replace operations with paths and values -- like a structured git diff.

**`set_session_value`** and **`get_session_value`** are targeted read/write at a specific dot-path. Instead of applying a full merge patch and re-validating the whole page, you reach in and change exactly one value. Fast and surgical.

**`commit_page_session`** writes the in-memory state to disk and runs a strict-load validation using the same route-aware pipeline the app uses: preset resolution, module merging, section hydration, cross-reference checks, the works. If strict-load fails, it rolls back by restoring the original file. A `force` flag bypasses the rollback, but that is not recommended -- strict-load failures mean the page will not render.

**`close_page_session`** discards the session. Any uncommitted changes evaporate.

### Session persistence

The `export_session` and `import_session` tools at `tools/pb-mcp/src/tools/session-persistence.ts` provide a way to checkpoint a session to disk. `export_session` serializes the current session state (page JSON, original page, history stack) to a `.pb-session.json` file. `import_session` reads that file back and restores the session. This lets you move sessions across MCP reconnects or save your place for later.

## How it wraps the core pipeline

The MCP server does not reimplement any pipeline logic. Every significant operation leans on `@pb/core`:

- **Validation** uses `validatePageAsync` for pages and individual schema validators for fragments.
- **Loading** uses `loadPeblorByPathAsync` from `@pb/core/loader`, which handles the full route-aware load including preset resolution and module merging.
- **Page discovery** uses `discoverAllPages` or the MCP's own filesystem walker.
- **Preview** runs the page through the pipeline up to the resolve stage and returns the expanded result.

The MCP's own `lib/` directory fills in the gaps that `@pb/core` does not cover:

- `fs.ts` provides `findPage` (route or absolute path resolution), page listing, preset discovery, and content file reading.
- `merge-patch.ts` implements the RFC 7396 merge-patch algorithm (with a second copy inline in page-session.ts for the hot path).
- `slug.ts` derives slug segments from file paths for the route-aware loader.
- `paths.ts` defines canonical content directory paths relative to the project root.
- `fragment-kind.ts` infers what kind of schema a standalone JSON fragment should validate against (section, element, action, background, module, or unknown).
- `cli.ts` spawns `pb-cli` subprocesses for operations that are better delegated to the CLI -- primarily the section surgery tools and some bulk operations. This is a deliberate escape hatch: new tools should prefer direct `@pb/core` imports, but the CLI bridge exists for parity when the CLI already has the logic.

The separation is clean: `@pb/core` handles the pipeline (load, validate, expand, resolve). The MCP server handles the editing layer on top -- sessions, patches, undo, commit, AI generation prompts. Neither needs to know about the other's concerns.

## Validation flow through the server

Validation happens at several points in the MCP server, each serving a different purpose:

1. **At session open**: When `open_page_session` loads a page, it immediately runs `validatePageAsync` so the agent can see pre-existing issues before making changes.

2. **On every patch**: Every call to `patch_page_session` or `set_session_value` re-validates the entire page. The patch is still held even if validation fails -- the agent sees diagnostics and can apply corrections.

3. **At commit**: `commit_page_session` runs the full strict-load pipeline -- the same one the app uses at render time. This catches issues that schema-only validation misses, like broken preset references or invalid merged modules. If strict-load fails, the file is rolled back.

4. **Standalone validation tools**: Tools like `validate_page`, `validate_element`, `validate_bg`, `validate_fragment`, `doctor_page`, and `batch_validate` exist for ad-hoc validation outside the session workflow. These go through `@pb/core` schema validators and, for pages inside `content/pages/`, the strict-load pipeline.

5. **Fragment-level validation**: The `schema_doctor` and `suggest_fix` tools provide guided debugging for fragments that fail validation, walking through each error with plain-English explanations and suggested fixes.

## What you can do with the tools

The tool set covers just about everything you can do with Peblor content. Here is the landscape:

**Validation and pipeline:** Validate any content type (page, section, element, background, action, module, overlay, fragment). Batch-validate all pages or fragments in a directory. Run the full pipeline on demand with `preview_page`. Run conformance tests. Diagnose a page through each pipeline stage to find where things break.

**Discovery and reading:** List pages, presets, modals, modules, overlays, tags, project groups, capabilities. Search presets by name. Grep across pages for blocks matching a type, field, or preset reference. Read any content type by ID or route. Get a compact structural outline of a page -- sections, element types, text previews -- without reading the full JSON.

**Writing and editing:** The session model for iterative editing. Direct page edit without session overhead. Add, remove, and move sections. Scaffold new pages, elements, sections, backgrounds, presets, modules, and action types. Write modals, modules, and overlays. Set page metadata, analytics config, and taxonomy tags.

**AI generation:** Generate a complete page scaffold from a natural-language intent. Fill a specific section's content from a description. Get layout suggestions ranked by relevance to your content goals. Steal design patterns from a reference URL (ethically, through measurement rather than copying).

**Component catalog:** List all components by kind. Probe the catalog with semantic search queries. Get full schema details for any element or section type, including all field paths and valid enum values. Explain what a component is for and what it composes with.

**Cross-page operations:** Clone a page to a new route. Rename a route with notification of other pages that reference the old one. Extract a definition block into a shared preset. Find unused presets.

**Asset pipeline:** List asset references across pages. Resolve raw CDN paths to fully signed URLs with image transform parameters. Audit all asset references for validity.

**Batch operations:** Batch-edit pages matching filter criteria. Generate XML or JSON sitemaps.

**Impact analysis:** Before editing a shared preset, module, or overlay, probe its usage to see which pages would be affected. Same for element type usage. The `preview_preset_change` tool shows exactly what changes and which pages are in the blast radius without writing anything.

**Session persistence:** Export a session to a checkpoint file and import it back later.

**Advanced diagnostics:** Audit and lint pages for orphaned definitions, broken links, and quality issues. Check all internal navigation routes for broken targets. Explain diagnostic error codes in plain English with suggested fixes. Run the schema doctor for fragment-level debugging.

## How to add a new MCP tool

Adding a new tool involves no ceremony beyond the tools index file.

**Step 1: Create your tool file.** Add a file in `tools/pb-mcp/src/tools/`. Export one or more `Tool` objects. Each tool needs a unique `def.name`, a clear `def.description` (this is what the AI reads when deciding whether to call your tool), and a valid `def.inputSchema` in JSON Schema format. The `run` function receives `args` as a plain object. Validate input, do your work -- importing from `@pb/core` or the MCP's own `lib/` as needed -- and return a JSON-serializable value. If something unrecoverable happens, throw an `Error`; the entry point handler catches it.

**Step 2: Import and register in the tools index.** In `tools/pb-mcp/src/tools/index.ts`, add an import for your tool at the top, then push it into `allTools` under the appropriate section comment. The array is organized by category, so find the right spot.

**Step 3: Add resources if needed.** If your tool exposes read-only data that would benefit from resource access (like a listing or catalog), add a `StaticResource` or `TemplateResource` in `tools/pb-mcp/src/resources/` and register it in the index there.

That is it. No schema changes, no configuration updates, no new route tables. Your tool appears in the MCP's tool list automatically.

A word on design: prefer importing from `@pb/core` directly. The `cli.ts` lib exists for delegating to `pb-cli` where parity is needed, but direct imports are faster, better typed, and don't spawn subprocesses. Use the CLI bridge sparingly.

## Key files

- `tools/pb-mcp/src/index.ts` -- MCP server entry point, request handlers, server initialization
- `tools/pb-mcp/src/types.ts` -- `Tool`, `ToolDef`, `StaticResource`, `TemplateResource` type definitions
- `tools/pb-mcp/src/tools/index.ts` -- Flat array of all registered tools (about 132 at last count)
- `tools/pb-mcp/src/tools/page-session.ts` -- Session lifecycle tools and the in-memory session store
- `tools/pb-mcp/src/tools/session-persistence.ts` -- Export/import session state to disk
- `tools/pb-mcp/src/tools/edit-page.ts` -- Direct page edit without session overhead
- `tools/pb-mcp/src/tools/validate-page.ts` -- Page validation with both schema-only and strict-load modes
- `tools/pb-mcp/src/tools/batch-validate.ts` -- Bulk page validation
- `tools/pb-mcp/src/tools/generate-page.ts` -- AI page generation from natural language
- `tools/pb-mcp/src/tools/probe-components.ts` -- Semantic catalog search
- `tools/pb-mcp/src/tools/probe-usage.ts` -- Impact analysis for presets, modules, overlays, element types
- `tools/pb-mcp/src/tools/preset-dry-run.ts` -- Preview the effect of a preset change before committing
- `tools/pb-mcp/src/tools/section-surgery.ts` -- Add, remove, move, list sections (delegates to CLI)
- `tools/pb-mcp/src/tools/steal-page.ts` -- Design inspiration pipeline (5-pass workflow)
- `tools/pb-mcp/src/tools/schema-doctor.ts` -- Fragment-level debugging with suggestions
- `tools/pb-mcp/src/tools/explain-diagnostic.ts` -- Human-readable error code explanations
- `tools/pb-mcp/src/resources/index.ts` -- All resource registrations
- `tools/pb-mcp/src/lib/fs.ts` -- Filesystem helpers (findPage, listPages, listPresets, and friends)
- `tools/pb-mcp/src/lib/merge-patch.ts` -- RFC 7396 merge patch implementation
- `tools/pb-mcp/src/lib/slug.ts` -- File-path-to-slug-segments derivation
- `tools/pb-mcp/src/lib/paths.ts` -- Canonical content directory paths
- `tools/pb-mcp/src/lib/cli.ts` -- Subprocess bridge to pb-cli
- `tools/pb-mcp/src/lib/fragment-kind.ts` -- Fragment type inference from JSON discriminators
- `tools/pb-mcp/package.json` -- Package definition, depends on `@pb/core`, `@pb/contracts`, `@pb/catalog`, and `@modelcontextprotocol/sdk`

---

Back to [about-these-docs.md](../../about-these-docs.md). See also: [overview.md](overview.md), [pb-cli.md](pb-cli.md).
