# Pages and overlays

A page in Peblor is a single JSON file that declares everything about itself: its metadata, its sections, its elements, its background, and the presets it imports. Overlays are sections that span the entire site — the header, the footer — that attach to every page automatically. This doc covers the page-level fields and the overlay system in detail.

## Page structure

Every page JSON file follows the same top-level shape. The schema is defined at `packages/contracts/src/peblor/core/peblor-schemas/page-definition-and-resolution-schemas.ts`. Two fields are structural and always present:

- **sectionOrder** — an array of string keys in render order. The first key renders at the top of the page, the last renders at the bottom. This is the only thing that determines render sequence. Changing the order of keys in this array changes the visual order of sections on the page. Move a key, move a section. Nothing else controls it.

- **definitions** — a flat dictionary where each key in `sectionOrder` maps to a section block, and each section block can have its own nested `elementOrder` and `definitions`. The nesting only goes one level deep per container: a section has an elementOrder that references keys in its own definitions dictionary. You can always see what belongs to what at a glance.

The rest of the fields are optional metadata and configuration. They control everything from how the page appears in search results to who can see it.

## Metadata fields

The page schema includes these top-level fields. Some are required, most are optional. Use them to control how the page appears in search, social sharing, and the browser.

### title (required)

The page title. Used in the browser tab, Open Graph tags, and as the primary heading for SEO. Keep it descriptive and unique per page. Think of it as the first thing someone reads about this page — in a search result, a social media card, or a browser tab. "Work" is fine. "About us" is fine. But "Untitled" or "Page 1" is not. Every page should have a distinct title that tells someone what they're looking at.

### description

The meta description for search results and social sharing. This is the text that shows up under the title in a Google result or in a link preview on social media. It doesn't affect ranking much, but it affects whether people click. Write something that summarizes the page in a sentence or two. Skip it and search engines will auto-generate one from page content, which is usually worse.

### slug

The URL path segment. You don't set this in the JSON file — it's injected automatically from the file location at load time. If your page lives at `content/pages/work/index.json`, the slug is `/work`. If it lives at `content/pages/work/lenero/index.json`, the slug is `/work/lenero`. You can rename a page by moving the directory. Don't try to override slug in the JSON; it won't do what you expect.

### canonicalUrl

An explicit canonical URL override. Use this when the same content is reachable at multiple routes. For example, if `/work/featured` and `/featured` both serve the same content, set the canonical URL on one of them to point to the other. Search engines use this to know which URL is the "real" one so they don't split ranking signals. If you don't set it, the slug-based URL is used. You'll probably only need this for edge cases — most pages don't need it.

### robots

A robots meta directive, like `"noindex, nofollow"`. Pages are indexable by default. Set this to `"noindex"` to exclude a page from search results. When would you use it? For staging pages, duplicate content pages, or pages that are useful to visitors but shouldn't show up in Google. The value follows the standard robots meta tag format — a comma-separated list of directives.

### keywords

A comma-separated string of keyword hints for SEO. The honest truth: most search engines don't give this much weight anymore. But it's still used by some internal site search tools and content management systems. If you have obvious keywords, include them. Don't stress over it.

### lang

A BCP 47 language tag like `"en"`, `"en-US"`, or `"fr"`. This gets rendered as the `lang` attribute on the `<html>` element. Screen readers use it for pronunciation. Search engines use it for language-specific indexing. If your site is mostly English, you probably want `"en"` or `"en-US"`. If a page is in a different language, this is essential — without it, screen readers and search engines assume the page language from context, and they often guess wrong.

### structuredData

A JSON-LD structured data blob. Rendered as a `<script type="application/ld+json">` tag in the document head. This is how you tell search engines about structured information — if the page is an article, a product, a FAQ, a person, a video, or any other structured content type. Search engines can use this to show rich results (star ratings, prices, dates) in search listings. If you're not sure what structured data to use, you probably don't need it. If your page is a project, article, or event, it's worth adding.

### ogImage

A path to an Open Graph image for social sharing cards. When someone shares a link to your page on social media, this is the image that shows up. If you don't set it, platforms pick a random image from the page or show nothing. A good Open Graph image is 1200x630 pixels (the standard aspect ratio) and includes the page title or some identifying text so people know what they're clicking. You can see how pages define their images at `content/pages/` — most project pages set this.

## Visibility and access control

Pages have a visibility system with three levels, controlled by the **visibility** field:

- **`"public"`** (default) — the page appears in the sitemap, is discoverable by search, and loads normally. Use this for pages you want people to find.

- **`"protected"`** — the page requires a password to access. When you set this, you should also set **passwordProtected** to `true`. The page still appears in the sitemap, but the content is gated. Use this for client previews, early drafts, or any content that shouldn't be broadly visible but should still be reachable by people who have the password.

- **`"unlisted"`** — the page is not included in the sitemap and isn't discoverable through navigation or search, but it's accessible to anyone with the direct URL. Use this for pages that need to be shared with specific people but not indexed — things like internal resources, temporary pages, or content that's not ready for public listing.

These are set at `pageVisibilitySchema` in the contracts package.

## Theme and layout controls

### forcedTheme

Forces the page to render in either `"light"` or `"dark"` mode regardless of the user's system preference. Use this sparingly. Most pages should respect the user's setting. The only good reason to force a theme is when a page's visual design specifically relies on it — if a project page has a dark background that only looks right in dark mode, or a presentation that was designed for light mode and breaks in dark. Defined at `forcedThemeSchema`. If you're unsure, leave it unset.

### density

A page-level density level that scales spacing and sizing. Levels are defined at `PAGE_DENSITY_LEVELS` in `packages/contracts/src/peblor/core/page-density.ts`. Controls the overall visual density of the page content — how tight or loose everything feels. A higher density number means more compact spacing; a lower number means more breathing room. The default is typically fine for most pages. Tweak it if the page feels too cramped or too spread out.

### layoutFromJson

When `true`, the page provides its own header and footer via Peblor sections instead of using the app's default layout components. Project detail pages use this to create custom immersive layouts — think full-screen video backgrounds with custom navigation. When you turn this on, you're responsible for providing whatever navigation the user needs to get around. Don't use it unless you have a specific design that requires it.

### renderMode

When set to `"background-island"`, the page background is isolated into its own client-side island so sections can render server-first. Useful for pages with complex background animations that would otherwise block the initial render. You'll usually know when you need this — if your page background involves heavy animation or video that degrades the initial load experience.

## Scroll configuration

The **scroll** object configures page-level scrolling behavior. The full schema lives at `pageScrollConfigSchema`.

- **smooth** — enable smooth scrolling behavior for anchor links and scroll-based interactions.

- **lockBody** — lock the body scroll when the page mounts. Used on pages with custom scroll containers, typically project pages that manage their own scrolling experience.

- **overflowX** and **overflowY** — control overflow behavior. Accepts `"hidden"`, `"auto"`, `"visible"`, or `"scroll"`. Use `"hidden"` on the X axis to prevent horizontal scrollbars on pages with wide content. Use `"auto"` on the Y axis for natural vertical scrolling.

- **snapType** — CSS scroll-snap behavior. Accepts `"none"`, `"x mandatory"`, `"y mandatory"`, `"both mandatory"`, `"x proximity"`, or `"y proximity"`. Scroll snapping makes the viewport snap to the nearest scroll position when the user stops scrolling. "Mandatory" always snaps (which can feel aggressive if content doesn't fit perfectly in the viewport). "Proximity" only snaps when the user stops near a snap point. Use this for full-viewport section-by-section scrolling experiences.

Project pages typically set `smooth: true`, `lockBody: true`, and `overflowX: "hidden"` with `overflowY: "auto"` or `"hidden"` for full-viewport scrolling experiences. Look at `content/pages/work/` for examples.

## Importing presets

Pages import presets through the **presets** array. Note the plural — this is the file-level field. Individual definition blocks use the singular `preset` field. Each entry in the array is a path to a preset file under `content/presets/`, without the `.json` extension.

For example, the teaching page at `content/pages/teaching/index.json` imports `"presets": ["type/core", "ui/link", "bg"]`. This imports three preset files. The system merges all of them into a single flat namespace, so every key exported by any loaded preset becomes available to the page via the `preset` field on individual definition blocks.

When a block uses `"preset": "some-key"`, the system looks up "some-key" in the merged preset namespace, takes all the fields defined there, and shallow-merges them with any fields the block defines itself. Local fields win. This is RFC 7396 merge-patch semantics, not inheritance. There's no class hierarchy, no chain of prototypes. You can always trace exactly which field came from where. The code that handles this lives at `packages/core/src/internal/peblor-presets.ts`.

What does this mean in practice? If a preset defines a button with a blue background and a white text color, and your page overrides the text color, the button keeps the blue background and picks up your text color. You're not subclassing a button class — you're merging two dictionaries. It's simpler than it sounds.

## Background key

The **bgKey** field points to a key in `definitions` that holds the page's background definition. Backgrounds are standalone definition blocks, not sections. A page can have exactly one active background, pointed to by `bgKey`. Background transitions can animate between multiple background definitions at runtime, but the bgKey establishes the starting background.

If a page doesn't set `bgKey`, it renders with no background — transparent, whatever the parent provides. That's fine for content-heavy pages that don't need a full-screen backdrop. For splash pages, project pages, and hero sections, you'll almost certainly want one.

## Tags and taxonomy

Pages can carry taxonomy tags through the **tags** field — a record of category keys to string arrays. Tags are used for filtering on listing pages (the work index page, for example). The `filterConfig` field on listing pages defines which tag categories are exposed as filters and how they behave (single-select or multi-select). The `projectGroups` field maps element keys on listing pages to specific project pages so tags can cascade correctly during filtering.

Tags are how project pages get categorized by brand ("Echo"), ability ("Short Documentary"), or any other taxonomy the site defines. If you're adding a new project page, you'll need to tag it correctly so it shows up in the right filters. The tag validation logic lives at `validateKnownPageTags` in the page definition schema file. Tags that don't match the known taxonomy produce validation warnings — not errors, but warnings worth paying attention to.

## Page-level triggers and transitions

- **onPageProgress** — a trigger action that fires as the user scrolls through the page. The action receives a progress value from 0 to 1. Use this for things like updating a progress bar, changing the page title in the tab, or coordinating animations.

- **transitions** — background transitions the page can activate. Each transition specifies a `from` and `to` background definition key, a trigger type (`"TIME"`, `"TRIGGER"`, or `"SCROLL"`), timing, and easing. Background transitions are covered in the sections and backgrounds doc, but the short version is: you can animate from one background to another based on scroll position, a timer, or a trigger event. This is how project pages fade from a video background into a solid color as the user scrolls down.

- **modals** — an array of modal IDs to mount in event-driven mode. These modals listen for `peblor-modal` events and open when triggered. If your page has pop-up content or lightboxes, they go here.

- **triggers** — an array of trigger definition keys (sectionTrigger blocks) that should be active at the page level. Page-level triggers fire regardless of what section the user is looking at.

## Overlays

Overlays are sections that render on every page by default. They live in `content/site/overlays/` as individual JSON files, each containing a single section block. You don't need to import them on individual pages — they just work. The idea is that site-wide chrome (navigation, footer, theme controls) shouldn't have to be duplicated across every page file.

### How overlays load

The loading process is handled by `packages/core/src/internal/overlay/peblor-overlay-loader.ts`. Here's what happens when any page loads:

1. The system reads every `.json` file inside the `content/site/overlays/` directory.
2. For each overlay, it resolves any preset references (same as it does for regular section definitions).
3. It expands each overlay through the normal section pipeline — the same one regular sections go through.
4. It signs any CDN asset URLs.
5. It attaches each overlay to the resolved page output as an additional section.

This means overlays go through the same validation, the same expansion, the same everything as regular sections. An invalid overlay file breaks every page it renders on, so test your overlays carefully.

Each overlay becomes a section rendered at its natural position in the DOM. Fixed-position elements like the header use CSS positioning rather than document flow, so they sit on top of the page content rather than pushing it down.

### The three overlays

**header** (`content/site/overlays/header.json`) — The main navigation bar. It's a `sectionColumn` type with fixed positioning at the top of the viewport. It contains navigation links, the site logo, and any top-level navigation controls. It's pinned to the top so it stays visible as the user scrolls. You can see it on every page of the site.

**footer** (`content/site/overlays/footer.json`) — The site footer. Also a `sectionColumn` with fixed positioning at the bottom of the viewport. It contains copyright info, secondary navigation links, and any site-wide footnotes. It sits at the bottom of the viewport, below the page content.

**nav-theme-toggle** (`content/site/overlays/nav-theme-toggle.json`) — The dark/light mode toggle button. It's a `sectionColumn` with fixed positioning that overlays the navigation bar. It has the highest z-index (201, above the header's 200) so it always sits on top. It's typically positioned at the edge of the viewport, visible but out of the way.

All overlays share some structural patterns: they use fixed positioning with specific z-index values, glassmorphism effects via the `effects` array (the `"glass"` type for that frosted-glass look), and they reference CSS custom properties (`var(--pb-on-secondary)`, `var(--pb-link-hover)`, `var(--pb-link-active)`) instead of hardcoded color values. This means they automatically adapt to theme changes — when the user toggles dark mode, the overlays update their colors without any JavaScript intervention.

### Disabling overlays per page

Not every page wants every overlay. A full-screen project page might not want the standard footer. A custom immersive layout might provide its own navigation. That's where **disableOverlays** comes in.

A page can opt out of specific overlays through the `disableOverlays` array. The value is an array of overlay IDs, where the ID is the filename without the `.json` extension:

`"disableOverlays": ["footer"]`

This tells the overlay loader to skip the footer on this particular page. The header and theme toggle still load. You can disable multiple overlays at once: `["header", "footer"]`.

This is typically used on pages that set `layoutFromJson: true` and provide their own custom header or footer through the page's own sections. The overlay loader checks each overlay ID against this list before adding it. The check happens at line 42 of the overlay loader file.

### What happens when disableOverlays goes wrong

If you mistype an overlay ID — say `"footr"` instead of `"footer"` — the loader won't recognize it as a match, and the overlay loads anyway. No error, no warning. The page just keeps the footer. Double-check your disableOverlays entries match the actual filenames exactly.

Also worth noting: disabling an overlay only hides it. It doesn't prevent the overlay from being loaded and processed. The overlay file still gets read and validated — it just doesn't get attached to the page output. If an overlay is broken, disabling it on one page doesn't help anyone. You need to fix the overlay file itself.

## Where to go next

- [Sections and backgrounds](sections-and-backgrounds.md) — the seven section types, the five background types, and shared properties
- [Elements and motion](elements-and-motion.md) — element types, nesting, entrance animations, gesture motion
- [Presets](presets.md) — how presets compose, naming conventions, common mistakes
- [Getting started](getting-started.md) — editing workflow, tools, troubleshooting

---

Back to [about-these-docs.md](../about-these-docs.md) | Architecture: [overview.md](../architecture/overview.md)
