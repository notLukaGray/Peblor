# Getting started as a content author

If you're reading this, you're about to write content for a Peblor site. Good news: you don't need to open a `.tsx` file, touch a React component, or learn how the build pipeline works. Everything you do happens in JSON files. This doc walks through the mental model, the editing workflow, where things live, the tools you use, and what to do when something breaks.

## The mental model: pages are just JSON files

Every page on the site is a single JSON file living at `content/pages/<route>/index.json`. That file contains everything the page needs: its title, its sections, its elements, its background, its metadata, and the presets it imports. No database queries, no headless CMS tabs to click through, no "where did I put that field" treasure hunt.

A page file has two structural pillars:

- **sectionOrder** — an ordered array of string keys that controls what renders and in what order. Want to move a section up or down on the page? Reorder this array. That's it.
- **definitions** — a flat dictionary where every key from `sectionOrder` maps to a section block. Every key inside that section's `elementOrder` maps to an element definition. Everything is flat. Nothing is nested more than one level deep.

This flat structure means you can open any page file and immediately understand what's on it and in what order. There's no component hierarchy to trace, no slot-within-slot indirection to untangle. A page is a map and a list.

If that sounds simple, good. It's supposed to be. The full page schema (the rules for what fields are allowed and what values they take) lives at `packages/contracts/src/peblor/core/peblor-schemas/page-definition-and-resolution-schemas.ts` — but you don't need to read that file to write pages. The MCP server handles validation for you.

## The editing workflow

You edit pages through the Peblor MCP server — a set of tools that your editor (VS Code, Cursor, or any LSP-compatible editor) talks to. You don't need to know how MCP works to use it. Think of it as a helper that lives in your editor, reads your page files, validates your changes, and writes them back when you're ready. The workflow has four steps.

**Step 1: Open a session.** You tell the MCP server which page you want to edit by its route. For example, to edit the profile page at `/profile`, you'd call `peblor__open_page_session` with the route `"/profile"`. This loads the page into memory. Nothing gets written to disk yet — you're working on a copy.

**Step 2: Make changes.** You apply changes as JSON merge patches using `peblor__patch_page_session`. A merge patch says "set this field to this value" or "remove this field" or "merge these nested fields into the existing object." The MCP server validates each patch immediately. If something's wrong, it tells you right then — not after you've made ten more changes.

For quick metadata changes — updating the page title, description, or tags — use the shorthand tools `peblor__set_page_metadata` and `peblor__set_page_tags` instead of writing raw patches. They're faster and less error-prone for the common stuff.

**Step 3: Preview and inspect.** Call `peblor__preview_page_session` to see all your accumulated changes in memory. Call `peblor__inspect_session` to see what's changed relative to the original file. Made a mistake? `peblor__undo_page_session` reverts the last patch. You can undo multiple times, stepping backward through your changes.

**Step 4: Commit.** When you're happy with the result, call `peblor__commit_page_session`. This runs a full validation — the same pipeline the actual app uses — writes the file to disk, and closes the session. If validation fails, the original file stays untouched. You don't lose anything.

If you need to walk away without saving, call `peblor__close_page_session` to discard the session entirely. No harm done.

## What if the MCP server feels intimidating?

If you've never used an MCP-based tool before, it can feel like there's a layer of mystery between you and the file. Here's the thing to remember: you're just editing JSON files. The MCP server is there to catch your mistakes before they land on disk. Think of it as a helpful proofreader, not a gatekeeper. Every tool command maps to something you could do by hand in a text editor, but with a safety net built in.

## Where things live

The content directory at the repo root (`content/`) is organized by what things are, not by how they're used. Here's the lay of the land:

- **Pages** live at `content/pages/<route>/index.json`. The route is just the URL path — `/work`, `/teaching`, `/work/lenero`. Each page is a directory with an `index.json` file inside it.

- **Presets** live in `content/presets/` grouped by category: `type`, `bg`, `card`, `demo`, `layout`, `player`, `ui`, `video`. Presets are reusable definition fragments that pages import by name. They're the primary way you share content across pages — define something once in a preset, reference it everywhere.

- **Modules** live in `content/modules/`. These are self-contained player definitions for video and audio. Each module defines its controls layout, keyboard shortcuts, gesture regions, and feedback chrome — all in JSON. Examples include `video-player`, `video-player-compact`, `audio-player`, and `audio-player-waveform`. Need a new player variant? You write JSON, not code.

- **Overlays** live in `content/site/overlays/`. These are site-wide sections that appear on every page — the header, the footer, and the theme toggle. They apply automatically unless a page explicitly opts out. You can see real examples at `content/site/overlays/`.

- **Framer motion presets** live in `content/framer-motion/`. Every entrance animation — fade, slideUp, blurIn, popIn, and others — is defined here as keyframe data. You don't write JavaScript to add a new animation; you add JSON.

- **Modals** live in `content/modals/`. These are section definitions that can be opened via triggers rather than being rendered inline on the page. Think pop-ups, lightboxes, or any overlay-style content.

## Running validation

You can validate pages at any time through the MCP server or the CLI. Validation is how you catch problems before they become broken pages in production.

- **Single page validation** via MCP: `peblor__validate_page` with the page route. This checks the page against the schema, verifies that all element keys resolve to real definitions, and returns a list of any issues it found.

- **Soft audit** via MCP: `peblor__audit_page` goes deeper than schema validation. It finds orphaned definitions (stuff in your definitions that nothing references), broken internal links, sections that can never be visible, and disabled overlays.

- **All pages at once** via MCP: `peblor__batch_validate` validates every page in the project. Use the `changed` flag to limit it to pages that changed since the last commit — handy before pushing.

- **Broken links**: `peblor__check_routes` verifies that every internal navigation target (button hrefs, navigate action payloads) points to a real page route. Rename a page and forget to update the link? This catches it.

- **CLI**: From the repo root, `npm run pb-cli -- validate-all-pages` runs the full strict-load validation pipeline on every page — same as what CI runs. Run this before you push.

The `npm run check` command runs the entire validation suite — type-checking, linting, formatting, content validation, and catalog checks. Run it before every push. Yes, it might take a minute. That's fine. It's cheaper than fixing a broken page in production.

## Troubleshooting: what to do when things go wrong

This section is the one you'll reach for when something breaks. Let's go through the common failure modes, what they look like, and how to fix them.

### Validation errors on commit

Your `commit_page_session` call failed. Don't panic. The page JSON doesn't satisfy the schema, and the system protected your original file. Here's what to do:

1. Run `peblor__validate_page` on your page to get a list of exactly what's wrong.
2. For a deeper analysis, run `peblor__audit_page`.
3. Read the diagnostics — they tell you the exact JSON path (like `definitions.hero.fill`) and what the problem is.

The most common causes are: a misspelled field name, a missing required field, a value of the wrong type (like a string where a number is expected), or an element key that doesn't exist in definitions. The diagnostics will point right at it.

### Missing preset

If a page references a preset that doesn't exist, validation catches it at commit time. Check that the preset key exists in `content/presets/`. But here's the gotcha: preset keys must be globally unique across ALL preset files. The system merges everything into one namespace. If two presets in different files happen to share the same key, one silently overwrites the other. No warning, no error — just the wrong content showing up on your page.

If a page starts looking wrong after you add a preset, this is the first thing to check. Run `peblor__list_unused_presets` to find presets nobody references — that can help identify naming collisions. One preset is winning over another, and the losing one sits unused.

### Broken internal links

Pages reference each other by route string in button hrefs and navigate actions. If you rename a page or move it to a different route, every page that links to the old route breaks. The broken link surfaces as a navigation that goes nowhere.

Run `peblor__check_routes` to find these. The MCP server also flags broken links during `peblor__audit_page`. Fix them by updating the route strings in the linking pages.

### Key collisions

Every key in a page's `definitions` dictionary must be unique. Two sections can't share a key. Two elements in different sections can share a key though — because each section has its own nested definitions dictionary, so the scope is contained.

But preset keys are global, and that's where collisions hurt. Two preset files exporting the same key overwrite each other without warning. The last loaded preset wins. If a page starts looking wrong after you add a preset, check for key collisions first.

### Orphaned definitions

When you remove a key from `sectionOrder` (or `elementOrder`) but leave its definition in the `definitions` dictionary, that definition becomes an orphan. It doesn't break anything, but it's dead weight — confusing to future editors who wonder what it's doing there. `peblor__audit_page` flags these. Clean them up when you see them.

### Section with no visible content

A section whose `elementOrder` is empty, or contains only keys that don't resolve to actual definitions, renders nothing. This is technically valid JSON (the schema allows it), but it's probably not what you intended. The soft audit catches this. If a page looks like it's missing a section, check that the section has elements defined and that the element keys point to real definitions.

### Your changes didn't appear

You committed the session, everything validated, but the page looks the same as before. A few things to check:

- Did you close the session properly? An open session means the in-memory version hasn't been written to disk. Run `commit_page_session` if you haven't.
- Did the development server restart? If you're running a local dev server, it may need a restart to pick up file changes.
- Did you edit the right file? Check the route you passed to `open_page_session`. It's easy to accidentally open `/profile` when you meant `/work/profile`.

### The MCP server isn't responding

This happens. The MCP server is a separate process, and sometimes it crashes or disconnects. Try restarting it from the repo root. If the problem persists, check that your editor is configured to connect to the MCP server (the `.mcp.json` file at the repo root handles this). The MCP server spits out diagnostic information when it starts — read the output to see if it loaded successfully.

### Preset change ripples unexpectedly

You updated a preset, and suddenly a dozen pages look different. This is working as designed — presets are shared by nature. Before you edit a preset, check what pages use it by running `peblor__probe_preset_usage`. This shows you every page that references the preset and where. If you want to change the preset for only one page, don't edit the preset — override the fields on that page's individual reference instead.

### Overlay looks wrong

Overlays are loaded on every page. If an overlay has a validation error, it breaks on every page. The fix is the same as for any other section — run validation, find the error, fix it. Remember that `disableOverlays` on a page only hides the overlay; it doesn't fix the underlying problem. See the pages-and-overlays doc for more details.

### The page is there but it won't load in the browser

If a page passes validation but doesn't render in the browser, check:

- Is the route spelled correctly? Routes match directory names under `content/pages/`.
- Is the page set to `"protected"` and you're not providing the password?
- Is the page marked `"unlisted"`? It won't show up in navigation, but the direct URL should work.
- Check the browser console for JavaScript errors. The renderer might be failing on a specific element or motion that validated fine at the schema level.

### The wrong theme is showing

If a page is forcing light mode when you expected dark (or vice versa), check the `forcedTheme` field. If you set it, the page ignores the user's system preference entirely. Remove the field if you want the page to respect the user's theme choice.

### Things to check before you call for help

Validated the page? Check. Checked for broken routes? Check. Looked at the MCP server output? Check. Searched for the error message in the diagnostics? If all of those are done and you're still stuck, the issue might be in the rendering pipeline rather than in the content. In that case, it's probably a code change, not a content change.

## Where to go next

- [Pages and overlays](pages-and-overlays.md) — page structure, metadata fields, sectionOrder, importing presets, how overlays work
- [Sections and backgrounds](sections-and-backgrounds.md) — the seven section types, the five background types, and the properties they share
- [Elements and motion](elements-and-motion.md) — the 25+ element types, nesting with elementGroup, entrance animations, gesture motion
- [Presets](presets.md) — how presets compose, naming conventions, common mistakes
- [Modules](modules.md) — configuring video and audio players

---

Back to [about-these-docs.md](../about-these-docs.md) | Architecture: [overview.md](../architecture/overview.md)
