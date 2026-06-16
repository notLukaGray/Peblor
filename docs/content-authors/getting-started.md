# Getting started as a content author

Welcome. You're about to write content for a Peblor site, and the good news is you won't need to touch a line of code. Everything you do happens in JSON files. This doc covers the mental model, the editing workflow, where things live, and what to do when something inevitably goes sideways.

## The mental model: pages are just JSON files

Every page on the site is a single JSON file. That file contains everything the page needs: its title, sections, elements, background, metadata, and the presets it borrows from. No database, no headless CMS, no "where did that field go" mystery.

A page has exactly two structural pillars:

- **sectionOrder** — a list of string keys that controls what renders and in what order. Want to move a section up? Reorder this array. That's the whole trick.
- **definitions** — a flat dictionary where every key from `sectionOrder` points to a section, and every key inside that section's `elementOrder` points to an element. Nothing nested deeper than that.

Everything is flat by design. You open any page file and immediately know what's on it and in what order. No component hierarchy to trace, no slot-inception. A page is just a map and a list.

If that sounds simple, good. It's supposed to be. The full schema (the rulebook for what fields are allowed) is, well, extensive — but you don't need to read it to write pages. The MCP server handles validation for you.

## The editing workflow

You edit pages through a set of tools called the Peblor MCP server. Your editor talks to it. You don't need to know how MCP works to use it. Think of it as a friendly assistant that lives in your editor, reads your page files, double-checks your changes, and writes them back when you're ready. The workflow has four steps.

**Step 1: Open a session.** Tell the tool which page you want to edit by its route. For example, to edit the unlock page, you'd call `peblor__open_page_session` with the route `"/unlock"`. This loads the page into memory. Nothing gets written to disk yet — you're working on a copy.

**Step 2: Make changes.** Apply changes as JSON merge patches using `peblor__patch_page_session`. A merge patch is just a way of saying "set this field to this value" or "remove this field." The server validates each change immediately. If something's wrong, it tells you right then, not after ten more changes have piled on.

For quick metadata edits — updating the page title, description, or tags — use the shorthand tools `peblor__set_page_metadata` and `peblor__set_page_tags`. They're faster and less error-prone for the common stuff.

**Step 3: Preview and inspect.** Call `peblor__preview_page_session` to see all your accumulated changes in memory. Call `peblor__inspect_session` to see what's different from the original. Made a mistake? `peblor__undo_page_session` reverts the last change. You can undo multiple times, stepping backward like a time machine for your edits.

**Step 4: Commit.** When you're happy, call `peblor__commit_page_session`. This runs a full validation — the same checks the actual site uses — then writes the file to disk and closes the session. If validation fails, your original file stays untouched. Nothing lost.

Need to walk away without saving? Call `peblor__close_page_session` to throw away the session. No harm done. The file on disk never changed.

## What if the MCP server feels intimidating?

If you've never used an MCP-based tool before, it can feel like there's a layer of mystery between you and the file. Here's the thing to remember: you're just editing JSON files. The MCP server is there to catch your mistakes before they land on disk. Think of it as a helpful proofreader, not a gatekeeper. Every tool command maps to something you could do by hand in a text editor, but with a safety net built in.

Also: you can't break anything permanently. The worst that happens is your commit gets rejected, and you try again. The original file is always preserved until you pass the full validation gauntlet. So relax. Experiment. The system has your back.

## Where things live

All content lives in the `content/` directory at the project root. It's organized by what things are, not by how they're used.

- **Pages** are in `content/pages/`. Each page is a directory named after its route, with an `index.json` file inside. The route is just the URL path — `/unlock`, `/presets/cards-basic`, `/404`. You'll also see sidecar files next to `index.json` sometimes — those are section files that got too big and moved out for sanity.

- **Presets** live in `content/presets/` and are grouped by category: `type`, `bg`, `card`, `demo`, `layout`, `player`, `ui`, `video`. Presets are reusable definition fragments that pages import by name. Define something once in a preset, reference it everywhere. They're the primary way you share content across pages.

- **Modules** live in `content/modules/`. These are self-contained definitions for video and audio players — controls layout, keyboard shortcuts, gesture regions, all in JSON. Need a new player variant? You write JSON, not code.

- **Overlays** live in `content/site/overlays/`. These are site-wide sections that appear on every page — the header, the footer, the theme toggle. They apply automatically unless a page explicitly opts out.

- **Framer motion presets** live in `content/framer-motion/`. Every entrance animation — fade, slideUp, blurIn, popIn — is defined here as keyframe data. You don't write JavaScript to add a new animation. You add JSON.

- **Modals** live in `content/modals/`. These are sections that can be triggered to appear on top of a page rather than being rendered inline. Pop-ups, lightboxes, overlay-style content.

## Running validation

You can validate pages at any time through the MCP server. Validation is how you catch problems before they become broken pages in the wild.

- **Single page:** `peblor__validate_page` with the page route. Checks the page against the schema, verifies all element keys resolve to real definitions, and returns a list of any issues.

- **Soft audit:** `peblor__audit_page` goes deeper. It finds orphaned definitions (stuff in your definitions that nothing references), broken internal links, sections that can never be visible, and disabled overlays. Run this before you declare a page done.

- **All pages at once:** `peblor__batch_validate` validates every page in the project. Use the `changed` flag to limit it to pages that changed since your last commit — handy before pushing.

- **Broken links:** `peblor__check_routes` verifies that every internal navigation target (button links, navigate actions) points to a real page. Rename a page and forget to update the link? This catches it.

- **CLI:** From the project root, `npm run pb-cli -- validate-all-pages` runs the full validation on every page — the same thing CI runs. Run this before you push.

The `npm run check` command runs the entire suite — validation, linting, formatting, catalog checks. Run it before every push. Yes, it might take a minute. That's fine. It's cheaper than fixing a broken page in production.

## Troubleshooting

This is the section you'll actually reach for. Let's go through the common failure modes, what they look like, and how to fix them.

### Validation errors on commit

Your `commit_page_session` call failed. Don't panic. The page doesn't satisfy the schema, and the system protected your original file. Here's what to do:

1. Run `peblor__validate_page` on your page to get a list of exactly what's wrong.
2. For deeper analysis, run `peblor__audit_page`.
3. Read the diagnostics. They tell you the exact path (like `definitions.hero.fill`) and what the problem is.

Most common causes: a misspelled field name, a missing required field, a value of the wrong type (string where a number is expected), or an element key that doesn't exist in definitions. The diagnostics point right at it.

### Missing preset

If a page references a preset that doesn't exist, validation catches it at commit time. Check that the preset exists in `content/presets/`. But here's the gotcha: preset keys must be globally unique across ALL preset files. The system merges everything into one namespace. If two presets in different files share the same key, one silently overwrites the other. No warning, no error — just the wrong content showing up on your page.

If a page starts looking wrong after you add a preset, this is the first thing to check. Run `peblor__list_unused_presets` to find presets nobody references — that can highlight naming collisions.

### Broken internal links

Pages reference each other by route strings in buttons and navigation actions. If you rename or move a page, every page that links to the old route breaks. The symptom is a link that goes nowhere.

Run `peblor__check_routes` to find these. Fix them by updating the route strings in the linking pages.

### Key collisions

Every key in a page's `definitions` dictionary must be unique. Two sections can't share a key. Two elements in different sections can share a key though — each section has its own nested definitions dictionary, so the scope is contained.

But preset keys are global, and that's where collisions hurt. Two preset files exporting the same key overwrite each other without warning. The last loaded preset wins. If a page looks wrong after you add a preset, check for key collisions first.

### Orphaned definitions

When you remove a key from `sectionOrder` (or `elementOrder`) but leave its definition in the `definitions` dictionary, that definition becomes an orphan. It doesn't break anything, but it's dead weight — and it'll confuse future editors who wonder what it's doing there. `peblor__audit_page` flags these. Clean them up when you see them.

### Section with no visible content

A section whose `elementOrder` is empty, or contains only keys that don't resolve to real definitions, renders nothing. This is technically valid (the schema allows it), but it's probably not what you intended. The soft audit catches this. If a page looks like it's missing a section, check that the section has elements defined and that the element keys point to real definitions.

### Your changes didn't appear

You committed the session, everything validated, but the page looks the same as before. A few things to check:

- Did you close the session properly? An open session means the in-memory version hasn't been written to disk. Run `commit_page_session` if you haven't.
- Does the dev server need a restart? If you're running a local dev server, it may need a kick to pick up file changes.
- Did you edit the right page? Check the route you passed to `open_page_session`. It's easy to accidentally open `/unlock` when you meant `/presets/cards-basic`.

### The MCP server isn't responding

This happens. The MCP server is a separate process, and sometimes it crashes or disconnects. Try restarting it from the project root. If the problem persists, check that your editor is configured to connect to the MCP server (the `.mcp.json` file at the project root handles this). The server spits out diagnostic info when it starts — read the output to see if it loaded successfully.

### Preset change ripples unexpectedly

You updated a preset, and suddenly a dozen pages look different. This is working as designed — presets are shared by nature. Before you edit a preset, check what pages use it by running `peblor__probe_preset_usage`. This shows you every page that references the preset and where. If you want to change the preset for only one page, don't edit the preset — override the fields on that page's individual reference instead.

### Overlay looks wrong

Overlays load on every page. If an overlay has a validation error, it breaks on every page. The fix is the same as for any other section — run validation, find the error, fix it. Remember that `disableOverlays` on a page only hides the overlay; it doesn't fix the underlying problem. See the [pages and overlays](pages-and-overlays.md) doc for more.

### The page is there but it won't load in the browser

If a page passes validation but doesn't render, check:

- Is the route spelled correctly? Routes match directory names under `content/pages/`.
- Is the page set to "protected" and you're not providing the password?
- Is the page marked "unlisted"? It won't show up in navigation, but the direct URL should work.
- Check the browser console for JavaScript errors. The renderer might be failing on a specific element or motion that validated fine at the schema level.

### The wrong theme is showing

If a page is forcing light mode when you expected dark (or vice versa), check the `forcedTheme` field. If you set it, the page ignores the user's system preference entirely. Remove the field if you want the page to respect the user's theme choice.

### Things to check before you call for help

Validated the page? Check. Checked for broken routes? Check. Looked at the MCP server output? Check. Searched for the error message in the diagnostics? Check. If all of those are done and you're still stuck, the issue might be in the rendering pipeline rather than in the content. In that case, it's probably a code change, not a content change — and you've earned the right to tap someone on the shoulder.

## Where to go next

- [Pages and overlays](pages-and-overlays.md) — page structure, metadata fields, sectionOrder, importing presets, how overlays work
- [Sections and backgrounds](sections-and-backgrounds.md) — the section types, background types, and what they share
- [Elements and motion](elements-and-motion.md) — the element types, nesting with elementGroup, entrance animations, gesture motion
- [Presets](presets.md) — how presets compose, naming conventions, common mistakes
- [Modules](modules.md) — configuring video and audio players

---

Back to [about-these-docs.md](../about-these-docs.md) | Architecture: [overview.md](../architecture/overview.md)
