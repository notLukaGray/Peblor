# pb-mcp: the MCP server for AI-driven editing

The MCP server at `tools/pb-mcp/src/` is how AI editors interact with Peblor content. It exposes validation, editing, discovery, and generation capabilities as named tools and resources through the Model Context Protocol. If you're using Claude Code or another MCP-compatible client to work with Peblor content, this is the server you're talking to.

It's not a general-purpose API. It's purpose-built for the conversational, iterative editing workflow that AI agents use -- the kind where an agent opens a page, inspects it, makes a few changes, previews the result, undoes one, and commits. That workflow doesn't map well to stateless request-response patterns, which is why the MCP server has a session model and the CLI doesn't.

---

## How it connects

The server uses the standard MCP SDK with stdio transport. The entry point at `tools/pb-mcp/src/index.ts` creates an MCP `Server` instance and registers handlers for six standard request schemas from the SDK:

- **`ListToolsRequestSchema`** returns the definitions of all registered tools. The MCP client calls this during initialization to discover what tools are available.
- **`CallToolRequestSchema`** dispatches a named tool call to its implementation. It finds the tool by name in the flat `allTools` array, calls its `run` function with the parsed arguments, and returns the result as JSON text. If the tool throws, it catches the error and returns it as an `isError` response.
- **`ListResourcesRequestSchema`** returns all static resource URIs. These are fixed URIs like `peblor://pages` that always read from the same data source.
- **`ListResourceTemplatesRequestSchema`** returns URI template patterns for parameterized resources. These are patterns like `peblor://components/{kind}` where the client fills in the parameter.
- **`ReadResourceRequestSchema`** reads a specific resource by URI. It checks static resources first (exact URI match), then falls through to template resources (regex match against the template pattern). If nothing matches, it throws.

The transport is stdio -- the server reads JSON-RPC messages from stdin and writes responses to stdout. No HTTP, no WebSockets, no network configuration. This makes it trivial to integrate with any MCP client that can spawn a child process.

---

## Tool registration pattern

All tools live in the flat `allTools` array at `tools/pb-mcp/src/tools/index.ts`. It's organized into commented sections for maintainability (pipeline/validation, discovery, read content, write/generate, page sessions, AI generation, cross-page operations, etc.), but it's fundamentally just a giant array -- about 110 tools at last count.

Each tool is a `Tool` object with two properties:

- **`def`** is a `ToolDef` with three fields: `name` (unique string, used for dispatch), `description` (human-readable, becomes the MCP tool description shown to the AI), and `inputSchema` (a JSON Schema object describing the tool's parameters). The MCP SDK uses `inputSchema` to validate arguments on the client side before calling the tool.
- **`run`** is an async function that takes `args: Record<string, unknown>` and returns `Promise<unknown>`. The return value is serialized to JSON text by the entry point handler.

Every tool file in `tools/pb-mcp/src/tools/` exports one or more `Tool` objects. A typical tool file imports from `@pb/core` and `@pb/core/loader` for pipeline operations, and from the MCP's own `lib/` directory for filesystem and utility helpers.

The tool index file imports every tool and pushes them into the array. Adding a new tool means adding an import statement and one line in the array -- no schema registration, no routing table, no auto-discovery.

### Resource registration pattern

Resources work similarly but are defined separately in `tools/pb-mcp/src/resources/index.ts`. There are two kinds:

- **`StaticResource`** objects have a fixed `uri` string and a `read` function that returns data every time the resource is accessed. Examples include `peblor://pages` (lists all page routes) and `peblor://presets` (lists all preset IDs grouped by category).
- **`TemplateResource`** objects have a `uriTemplate` string with placeholders (like `peblor://components/{kind}`), a `match` function that tests a URI against the template and extracts parameters via regex, and a `read` function that takes the matched parameters and returns data.

The entry point filters the resource array into static and template groups, then uses both when handling resource requests.

---

## The session model: why it exists

The MCP server's most distinctive feature is its in-memory page session model, implemented in `tools/pb-mcp/src/tools/page-session.ts`. This is the core innovation that makes AI editing practical.

Here's the problem it solves: when an AI agent edits a page, it typically needs to make several changes in sequence. Maybe it renames a section, then adds a new element, then tweaks some text, then previews the result, then changes its mind and undoes the last edit. If every edit required reading from disk, writing to disk, and re-parsing the full page, the workflow would be painfully slow -- and every partial save would leave the file system in an intermediate state.

The session model solves this by keeping everything in memory until the agent explicitly commits. The lifecycle works like this:

**open_page_session** reads the page from disk into memory and creates a session object. The session holds two copies of the page: `page` (the current working state) and `originalPage` (a snapshot of what was on disk at open time). It also initializes a `history` array (for undo) and timestamps. After loading, it runs `validatePageAsync` on the content so the agent knows about any pre-existing issues before making changes. The session ID is returned to the agent and used for all subsequent operations.

**patch_page_session** applies a JSON merge patch (RFC 7396) to the in-memory `page`. Before applying the patch, it pushes the current `page` state onto the `history` stack. After applying, it validates the patched state and returns diagnostics. Crucially, the patch is held even if validation fails -- the agent can inspect the diagnostics and apply a correcting patch. This is different from a "fail on invalid" approach: it lets the agent iterate toward a valid state rather than restarting from scratch.

**undo_page_session** pops the last state from the history stack and restores it as the current `page`. It validates after restore. Multiple undos work because each patch pushes to history before applying.

**preview_page_session** returns the current in-memory state without writing to disk. This is how the agent inspects what it has so far.

**inspect_session** gives the agent a view of changes. In summary mode, it computes a field-level diff against `originalPage` and reports only the changed paths. In full mode, it returns the entire page JSON. Summary mode is significantly faster and usually more useful.

**session_diff** goes deeper than inspect -- it returns a detailed list of add, remove, and replace operations with their paths and values, similar to a structured git diff.

**set_session_value** and **get_session_value** are targeted read/write operations at a specific dot-path in the session state. Instead of applying a full merge patch and re-validating the entire page, you can reach in and change exactly one value. Useful for quick edits where you already know the path.

**commit_page_session** writes the in-memory state to disk. This is where the safety net is: after writing, it runs a strict-load validation using the same route-aware pipeline the app uses (including preset resolution, module merging, section hydration, and cross-reference checks). If strict-load fails, it rolls back by restoring the original file content from the `originalPage` snapshot. A `force` flag bypasses the rollback, but that's not recommended -- strict-load failures mean the page won't render.

**close_page_session** discards the session without writing. Any uncommitted changes are lost.

### The session store

Sessions live in a plain `Map<string, Session>` at module scope in the page-session file. There's no database, no persisted state, no external store. The map survives across tool calls for the lifetime of the MCP server process, but if the server restarts, all sessions are gone.

The `export_session` and `import_session` tools (at `tools/pb-mcp/src/tools/session-persistence.ts`) provide a way around this. `export_session` serializes the current session state (page JSON, original page, history stack) to a `.pb-session.json` file on disk. `import_session` reads that file back and restores the session. This lets you checkpoint a session for later, or move it across MCP reconnects.

---

## How it wraps the core pipeline

The MCP server doesn't reimplement any pipeline logic. Every significant operation leans on `@pb/core`:

- **Validation** uses `validatePageAsync` for pages and the individual schema validators (`peblorSectionBlockSchema`, `elementBlockSchema`, etc.) for fragments.
- **Loading** uses `loadPeblorByPathAsync` from `@pb/core/loader`, which handles the full route-aware load including preset resolution and module merging.
- **Page discovery** uses `discoverAllPages` to find every page in the content directory.
- **Preview** runs the page through the pipeline up to the resolve stage and returns the expanded result.

The MCP's own `lib/` directory fills in the gaps that `@pb/core` doesn't cover:

- `fs.ts` provides `findPage` (route or absolute path resolution) and other filesystem helpers.
- `merge-patch.ts` implements the RFC 7396 merge-patch algorithm that the session system uses for incremental edits.
- `slug.ts` and `paths.ts` handle URL slug generation and path normalization.
- `fragment-kind.ts` duplicates some logic from the CLI's lib for detecting what kind of fragment a file contains.

The separation is deliberate: `@pb/core` handles the pipeline (load, validate, expand, resolve). The MCP server handles the editing layer on top (sessions, patches, undo, commit). Neither needs to know about the other's concerns.

---

## What you can do with the tools

The tools span pretty much everything you'd want to do with Peblor content. By category:

**Validation and pipeline:** Validate any content type (page, section, element, background, action, module, overlay, fragment). Batch-validate all pages or fragments in a directory. Run the full pipeline on demand with `preview_page`. Run conformance tests. Doctor a page through each pipeline stage to find where things break.

**Discovery and reading:** List pages, presets, modals, modules, overlays, tags, project groups. Search presets by name. Grep across pages for blocks matching type, field, or preset. Read any content type by ID or route. Get a compact structural outline of a page (sections, element types, text previews) without reading the full JSON.

**Writing and editing:** Open a page session and make incremental edits. Edit a page directly (without session overhead). Add, remove, and move sections. Scaffold new pages, elements, sections, backgrounds, presets, modules, and action types. Write modals, modules, and overlays. Set page metadata, analytics config, and taxonomy tags.

**AI generation:** Generate a complete page scaffold from a natural-language intent prompt. Fill a specific section's content from a description. Get layout suggestions ranked by relevance to your content goals.

**Component catalog:** List all components by kind. Probe the catalog with semantic search queries. Get full schema details for any element or section type, including all field paths and valid enum values. Explain what a component is for and what it composes with.

**Cross-page operations:** Clone a page to a new route. Rename a route and get notified of other pages that reference the old one. Extract a definition block into a shared preset. Find unused presets.

**Asset pipeline:** List asset references, resolve raw paths to signed CDN URLs with image transform parameters, audit all asset references for validity.

**Batch operations:** Batch-edit pages matching filter criteria. Generate XML or JSON sitemaps.

**Impact analysis:** Before editing a shared preset, module, or overlay, probe its usage to see which pages would be affected and where. Same for element type usage.

**Session persistence:** Export a session to a checkpoint file and import it back later.

**Advanced diagnostics:** Audit and lint pages (orphaned definitions, broken links, quality issues). Check all internal navigation routes for broken targets. Explain diagnostic error codes in plain English with suggested fixes. Run schema doctor for fragment-level debugging.

---

## How to add a new MCP tool

The process is simple and involves no registration ceremony beyond the tools index file.

**Step 1: Create your tool file.**

Add a file in `tools/pb-mcp/src/tools/`. Export one or more `Tool` objects. Each tool needs a unique `def.name`, a clear `def.description` (this is what the AI sees when deciding which tool to call), and a valid `def.inputSchema` in JSON Schema format.

The `run` function receives `args` as a plain object. It should validate the input, do its work (importing from `@pb/core` or the MCP's own `lib/` as needed), and return a JSON-serializable value. If something unrecoverable happens, throw an `Error` -- the entry point handler catches it and returns an error response.

**Step 2: Import and register in the tools index.**

In `tools/pb-mcp/src/tools/index.ts`, add an import for your tool(s) at the top, then push them into the `allTools` array under the appropriate section comment. The array is ordered by theme, so find the right section (or add a new one if your tool doesn't fit existing categories).

**Step 3: Add resources if needed.**

If your tool exposes read-only data that would benefit from resource access (like a listing or catalog), add a `StaticResource` or `TemplateResource` in `tools/pb-mcp/src/resources/` and register it in the index there. Resources are separate from tools -- they're for data the AI queries passively, not actions the AI performs.

That's all. No schema changes, no configuration updates, no route table modifications. The tool appears in the MCP's tool list automatically because `allTools` is what the `ListToolsRequestSchema` handler returns.

---

## Key files

- `tools/pb-mcp/src/index.ts` -- MCP server entry point, request handlers, server creation
- `tools/pb-mcp/src/types.ts` -- `Tool`, `ToolDef`, `StaticResource`, `TemplateResource` type definitions
- `tools/pb-mcp/src/tools/index.ts` -- Flat array of all registered tools (about 110)
- `tools/pb-mcp/src/tools/page-session.ts` -- Session lifecycle tools (open, patch, undo, preview, inspect, commit, close, list, diff, get/set value, merge-patch logic)
- `tools/pb-mcp/src/tools/session-persistence.ts` -- Export/import session state to disk
- `tools/pb-mcp/src/tools/edit-page.ts` -- Direct page edit without session overhead
- `tools/pb-mcp/src/tools/validate-page.ts` -- Page validation tool
- `tools/pb-mcp/src/tools/batch-validate.ts` -- Batch page validation across all or changed pages
- `tools/pb-mcp/src/tools/generate-page.ts` -- AI page generation from intent
- `tools/pb-mcp/src/tools/probe-components.ts` -- Semantic catalog search
- `tools/pb-mcp/src/tools/probe-usage.ts` -- Impact analysis for presets, modules, overlays, element types
- `tools/pb-mcp/src/tools/preset-dry-run.ts` -- Preview the effect of a preset change before committing
- `tools/pb-mcp/src/tools/section-surgery.ts` -- Add, remove, move, list sections
- `tools/pb-mcp/src/resources/index.ts` -- All resource registrations
- `tools/pb-mcp/src/lib/fs.ts` -- Filesystem helpers (findPage and friends)
- `tools/pb-mcp/src/lib/merge-patch.ts` -- RFC 7396 merge patch implementation
- `tools/pb-mcp/src/lib/slug.ts` -- URL slug generation
- `tools/pb-mcp/src/lib/paths.ts` -- Path normalization

---

Back to [about-these-docs.md](../../about-these-docs.md). See also: [overview.md](overview.md), [pb-cli.md](pb-cli.md).
