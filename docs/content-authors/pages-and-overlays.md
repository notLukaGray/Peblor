# Pages and overlays

A page in Peblor is one JSON file. It declares everything: its metadata, its sections, its background, the presets it imports. Overlays are sections that span the entire site — the header, the footer — and they attach to every page automatically. This doc covers both.

## Page structure

Every page file follows the same skeleton. Two fields are structural and always present:

- **sectionOrder** -- an array of string keys in render order. First key renders at the top, last at the bottom. This is the only thing that determines the sequence of sections on the page. Move a key, move a section. Nothing else controls it.

- **definitions** -- a flat dictionary where each key in `sectionOrder` maps to a section block, and each section can have its own `elementOrder` (same idea, one level deeper). The nesting never goes more than one level: a section has elements, that's it. You can always see what belongs to what at a glance.

Everything else is optional metadata and configuration.

## Metadata fields

These control how the page appears in search results, social media, and the browser tab. Some are required. Most aren't.

### title (required)

The page title. Shows up in browser tabs, Open Graph tags, and search results. Every page needs a real, distinct title. "Work" is fine. "About us" is fine. "Untitled" is not.

### description

The meta description. Shows under the title in Google results and social link previews. Write a sentence or two summarizing the page. Skip it and search engines will auto-generate one from page content, which is usually much worse.

### slug

The URL path segment. You don't set this -- it's injected automatically from the file's location on disk. A page at `content/pages/unlock/index.json` gets the slug `/unlock`. Move the directory, rename the slug. Don't try to set this in the JSON; the system ignores it.

### canonicalUrl

An explicit canonical URL override. Use this when the same content is reachable at multiple routes (for example, if `/presets/cards-basic` and `/presets/cards-basic/` both serve the same thing). Search engines use it to know which URL is the canonical source so they don't split ranking signals. Most pages won't need this.

### robots

A robots directive like `"noindex, nofollow"`. Pages are indexable by default. Set this to `"noindex"` to exclude a page from search results. Use it for staging pages, duplicate content, or pages that are useful to visitors but shouldn't show up in Google.

### keywords

A comma-separated string of SEO keyword hints. Search engines mostly ignore these now. Some internal site search tools still use them. Include obvious keywords if you want, but don't lose sleep over it.

### lang

A BCP 47 language tag like `"en"`, `"en-US"`, or `"fr"`. Gets rendered as the `lang` attribute on the `<html>` element. Screen readers use it for pronunciation. Search engines use it for language-specific indexing. If a page is in a different language, this is essential -- without it, screen readers and search engines guess, and they often guess wrong.

### structuredData

A JSON-LD blob. Gets rendered as a `<script type="application/ld+json">` tag in the document head. This is how you tell search engines "this page is an article" or "this page is a product" so they can show rich results (ratings, prices, dates) in search listings. If your page is a project, article, or event, it's worth adding. If you're not sure, skip it.

### ogImage

A path to an Open Graph image for social sharing cards. When someone shares a link to this page on social media, this is the image that shows up. A good Open Graph image is 1200x630 pixels and includes the page title so people know what they're clicking. Most project pages set this.

## Visibility and access control

Pages have three visibility levels, set via the **visibility** field:

- **`"public"`** (default) -- shows up in the sitemap, indexed by search engines, loads normally. Use this for pages you want people to find.

- **`"protected"`** -- requires a password to access. Set **passwordProtected** to `true` alongside this. The page stays in the sitemap, but content is gated. Use for client previews, early drafts, or anything that should be reachable but not openly visible.

- **`"unlisted"`** -- excluded from the sitemap and not linked from navigation, but the direct URL still works. Use for internal resources, temporary pages, or content that needs a link but not an audience.

## Theme and layout controls

### forcedTheme

Locks the page to `"light"` or `"dark"` mode regardless of the user's system preference. Most pages shouldn't use this. The only good reason is when a page's visual design specifically relies on one theme -- a dark project page that breaks in light mode, or a presentation designed for light backgrounds. If you're unsure, leave it unset.

### density

Controls the overall spacing rhythm of the page. Accepts `"comfortable"`, `"balanced"` (default), or `"compact"`. "Comfortable" gives things more breathing room. "Compact" tightens everything up. The default is fine for most pages. Tweak it if the page feels too cramped or too spread out.

### layoutFromJson

When `true`, the page provides its own header and footer via Peblor sections instead of using the site defaults. Project pages use this for custom immersive layouts -- think full-screen video backgrounds with custom navigation. When you turn this on, you're responsible for providing whatever navigation the user needs. Don't use it unless you have a specific design that demands it.

### renderMode

Accepts `"standard"` (default) or `"background-island"`. The island mode isolates the page background into its own client component so sections can render on the server first. You'll know when you need this -- if your page has heavy background animations or video that degrades the initial load experience.

## Scroll configuration

The **scroll** object configures page-level scrolling. It lives on the `scroll` field.

- **smooth** -- enables smooth scrolling for anchor links and scroll-based interactions.
- **lockBody** -- locks body scroll when the page mounts. Used on pages with custom scroll containers that manage their own scrolling experience.
- **scrollX** and **scrollY** -- control overflow behavior. `scrollX` accepts `"hidden"`, `"auto"`, or `"visible"`. `scrollY` adds `"scroll"` to the options. Use `"hidden"` on X to prevent horizontal scrollbars. Use `"auto"` on Y for natural vertical scrolling.
- **snapType** (deprecated) / **scrollSnapType** -- CSS scroll-snap behavior. Accepts `"none"`, `"x mandatory"`, `"y mandatory"`, `"both mandatory"`, `"x proximity"`, `"y proximity"`, or `"both proximity"`. Use "mandatory" for aggressive full-viewport snapping. Use "proximity" for a gentler experience.
- **scrollPadding** -- a responsive size value for scroll padding adjustments.

Project pages typically set `smooth: true`, `lockBody: true`, and `scrollX: "hidden"` with `scrollY: "auto"` for section-by-section scrolling.

## Importing presets

Pages import presets through the **presets** array (plural -- the file-level field. Individual definition blocks use the singular `preset`). Each entry is a path to a preset file under `content/presets/`, minus the `.json` extension.

The preset demo pages, for example, import `"presets": ["type/core", "ui/link", "bg"]`. The system merges all loaded presets into a single flat namespace, so any key from any loaded preset is available to any block on the page.

When a block uses `"preset": "some-key"`, the system finds "some-key" in the merged namespace, takes all fields defined there, and shallow-merges them with any fields the block defines itself. Local fields win. This is merge-patch semantics (RFC 7396), not inheritance. There's no class hierarchy, no prototype chain. You can always trace exactly which field came from where.

What does this mean in practice? If a preset defines a button with a blue background and white text, and your page overrides the text color, the button keeps the blue background and picks up your text color. You're not subclassing a button. You're merging two dictionaries. It's simpler than it sounds.

## Background key

The **bgKey** field points to a key in `definitions` that holds the page's background. Backgrounds are standalone definition blocks, not sections. A page can have exactly one active background, pointed to by `bgKey`. Background transitions can animate between multiple background definitions at runtime, but `bgKey` establishes the starting point.

If a page doesn't set `bgKey`, it renders with no background -- transparent, whatever the parent provides. That's fine for content-heavy pages. For splash pages, project pages, and hero sections, you'll almost certainly want one.

## Tags and taxonomy

Pages can carry taxonomy tags through the **tags** field -- a record of category keys to string arrays. Tags are how project pages get classified by brand ("Echo"), medium ("Short Documentary"), or whatever taxonomy the site defines. Tags power the filtering on listing pages.

If you're adding a new project page, you'll need to tag it correctly so it shows up in the right filters. Tags that don't match the known taxonomy produce validation warnings -- not errors, but warnings worth paying attention to.

## Page-level triggers and transitions

- **onPageProgress** -- a trigger action that fires as the user scrolls through the page. Receives a progress value from 0 to 1. Use it for progress bars, tab title updates, or coordinating animations.

- **transitions** -- background transitions the page can activate. Each transition specifies a `from` and `to` background definition key, a trigger type (`"TIME"`, `"TRIGGER"`, or `"SCROLL"`), timing, and easing. This is how project pages fade from a video background into a solid color as the user scrolls down. Accepts a single transition or an array.

- **modals** -- an array of modal IDs to mount in event-driven mode. These modals listen for `peblor-modal` events and open when triggered. Lightboxes and pop-up content go here.

- **triggers** -- an array of trigger definition keys that should be active at the page level. Page-level triggers fire regardless of what section the user is looking at.

## Overlays

Overlays are sections that render on every page by default. They live as individual JSON files in the overlays directory. You don't import them on individual pages -- they just work. This is the good kind of magic: site-wide chrome (navigation, footer, theme toggle) lives in one place instead of being duplicated across every page.

### How overlays work

When any page loads, the system reads every JSON file from the overlays directory, runs each one through the same pipeline as regular sections (preset resolution, element expansion, asset URL signing), and attaches them to the page output. An invalid overlay file breaks every page it renders on. Test your overlays carefully.

Each overlay becomes a section at its natural position in the DOM. Fixed-position elements like the header use CSS positioning rather than document flow, so they sit on top of the page content rather than pushing it down.

### The three overlays

**Header** -- A `contentBlock` with fixed positioning at the top. Contains the site logo (an SVG vector) with glassmorphism effects that give it that frosted-glass look. It stays pinned as the user scrolls, uses `layer: 500` to stay on top, and adapts to dark mode through CSS custom properties.

**Footer** -- A `sectionColumn` with fixed positioning at the bottom. Holds links to GitHub, Docs, CLI, MCP, and a "Built with Peblor" credit. Same glassmorphism treatment, `layer: 400`. At `layer: 500`, the header sits above it. The footer is a row type with five columns.

**Theme toggle** -- A `sectionColumn` at `layer: 501` (one above the header) that houses the dark/light mode toggle button. It's positioned at the top-right edge of the viewport -- tiny, unobtrusive, but always accessible. Click it and the page theme toggles via a `setTheme` action. It also uses glass effects.

All three overlays share a pattern: fixed positioning, glassmorphism via effects, and CSS custom properties (`var(--pb-on-secondary)`, `var(--pb-link-hover)`) instead of hardcoded color values. This means they adapt automatically when the user toggles dark mode -- no JavaScript needed.

### Disabling overlays per page

Not every page wants every overlay. A full-screen project page might not want the standard footer. A custom immersive layout might provide its own navigation. That's where **disableOverlays** comes in.

The value is an array of overlay IDs (the filename without `.json`):

```json
"disableOverlays": ["footer"]
```

This tells the system to skip the footer on this page. The header and theme toggle still load. Disable multiple overlays at once: `["header", "footer"]`.

This is most useful on pages that set `layoutFromJson: true` and provide their own custom navigation through page sections.

### A quick note on typos

When you add a page, the system checks the overlays directory, and for each overlay file it finds, it checks whether that overlay's ID is in the `disableOverlays` array. "Footer" matches? Skip it. But `"footr"` doesn't match `"footer"` -- so the overlay loads anyway. No error. No warning. The page just keeps the footer.

Double-check your disableOverlays entries match the filenames exactly. The system won't save you from yourself here.

Also worth noting: disabling an overlay on one page does not fix a broken overlay. The overlay file still gets loaded for every other page. If an overlay is broken, fix the overlay file itself -- not the pages that try to escape it.

## Where to go next

- [Sections and backgrounds](sections-and-backgrounds.md) -- section types, background types, and shared properties
- [Elements and motion](elements-and-motion.md) -- element types, nesting, entrance animations, gesture motion
- [Presets](presets.md) -- how presets compose, naming conventions, common mistakes
- [Getting started](getting-started.md) -- editing workflow, tools, troubleshooting

---

Back to [about-these-docs.md](../about-these-docs.md) | Architecture: [overview.md](../architecture/overview.md)
