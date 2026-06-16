# apps/web: The Thinnest Possible Skin

`apps/web` is a Next.js 16 consumer of the Peblor pipeline. That's its entire job. It contains zero hardcoded page content, zero special knowledge about what renders where, and zero opinions about what your data looks like. It's the HTML-host equivalent of a USB-C hub: all the interesting stuff plugs in through standardized ports.

You could throw this directory away and build a consumer in Svelte, Vue, or carrier pigeon and every content file would move with you untouched. The pipeline doesn't know Next.js exists. Neither should your content.

This is the thing that starts when you type `npm run dev`. Everything below is specific to the decisions this particular consumer made. A different app could make completely different choices and never touch a single JSON file.

## The route map

The app has exactly four page files. That's the whole routing surface.

**`/` (root page)** — `apps/web/src/app/page.tsx` renders the presets showcase. It hands `slug="presets"` to `PageContent` and gets out of the way. Nothing splashy. The root is just another page flowing through the same machinery.

**`/[...slug]` (catch-all)** — `apps/web/src/app/[...slug]/page.tsx` is the main event. Every page under `content/pages/` routes through here. It's fully static (`force-static`), meaning it generates HTML at build time for every discoverable page. No server-rendering per request. No cookies. No user-agent sniffing. Just static HTML pumped through the pipeline at build time.

The catch-all layout (`apps/web/src/app/[...slug]/layout.tsx`) provides the scroll container shell. It's one div. It has a ref so Framer Motion can calculate scroll progress. That's it.

**`/unlock`** — `apps/web/src/app/unlock/page.tsx` handles password-protected pages. This one is dynamic: it reads cookies, checks User-Agent, parses query parameters, and decides whether to show the page or the unlock modal. All that runtime I/O lives here so the catch-all route can stay fully static.

**`/not-found`** — `apps/web/src/app/not-found.tsx` loads the 404 page from `content/pages/404/` and renders it through the pipeline. Even your missing pages are content-driven.

## How a page gets from JSON to pixels

When a browser hits any URL, here's what happens:

1. Next.js matches the URL against the catch-all route and extracts the slug array. `/work/project-x` becomes `["work", "project-x"]`.

2. The route handler checks whether the slug starts with `dev`. Dev slugs return 404 in production. This keeps the playground and API routes out of the static build.

3. It loads metadata for the page (title, description, visibility) without loading the full page content. This is a fast lookup used solely for generating `<meta>` tags and JSON-LD structured data.

4. `PageContent` (`apps/web/src/app/[...slug]/page-content.tsx`) does the real work. It calls `getPageAsync` which runs stages one through three of the pipeline: LOAD (read the JSON and resolve presets), VALIDATE (check structure against schemas), and EXPAND (inline elements, resolve modules, apply builder defaults).

5. If the page has URL filters (like the work page's `?filter=branding`), those get applied here. Items that don't match the filter get dropped from the render output.

6. `getPeblorPropsFromPage` finishes the job: RESOLVE (sign CDN URLs, compute responsive image sizes, resolve theme strings), load overlays (header, footer, nav from `content/site/overlays/`), collect modals, and precompile rich text.

7. `PeblorServerPage` from the runtime-react package turns the resolved data into HTML. It decides which sections need client hydration and which are pure static HTML.

8. The HTML goes to the browser. The client hydrates the interactive sections. Page is live.

The first three pipeline stages (LOAD, VALIDATE, EXPAND) are cached aggressively. On a warm server, step four starts from a cache hit. The last-mile resolve-and-render step is cheap enough to run per-request without meaningful overhead.

## Static generation: how SSG actually works

The catch-all route's `generateStaticParams` discovers every page via `discoverAllPages` and returns their slugs. Next.js generates static HTML for each one at build time.

Protected pages (password or visibility-based) are excluded from static params. They render on demand through the unlock flow. Unlisted pages are also excluded.

The build includes a few pre-generation scripts that run before the Next.js build:

- **Font download** (`download-webfonts.ts`) — fetches webfont files from Bunny Fonts at build time so fonts are self-hosted with zero runtime requests to external services.
- **Protected slugs list** (`generate-protected-slugs.ts`) — generates a static lookup file so the unlock page can check protected status without loading page content.
- **JSON schema generation** (`generate-json-schemas.ts`) — regenerates the JSON schemas from the Zod source of truth.

Everything else is built from the content files. Change a JSON file, rebuild, and the output updates. No database, no CMS sync, no build pipeline beyond "run the build command."

## The host config: where brands customize

The core pipeline is brand-agnostic. It doesn't know your heading sizes, your color palette, or your button styles. All of that lives in the consumer app's host config, and it's loaded at startup in `bootstrap.ts`.

The bootstrap runs before the first page render. It calls `setCoreConfig` from the pipeline core, passing in two things:

1. **Builder defaults** — default element variants. What size should an H1 be? What style should a primary button use? What aspect ratio should images default to? Content authors can override these per-element, but the defaults come from here.

2. **Content guidelines** — spacing rules, alignment defaults, font slot bindings, rich text margins. These define the design system's constraints.

The config then propagates internally to the host config adapter, which the pipeline reads when it needs to make a visual decision.

The source files for all of this live in `apps/web/src/app/theme/`. Here's what's in there:

- **Color tokens** (`config.ts`, `pb-color-tokens.ts`) — the brand palette as CSS custom properties in OKLCH color space, with light and dark values.
- **Spacing, shadows, z-index** (`pb-spacing-tokens.ts`, `pb-shadow-tokens.ts`, `pb-z-index-layers.ts`) — the spatial vocabulary of the design system.
- **Breakpoints** (`pb-breakpoint-tokens.ts`) — which viewport widths count as mobile versus desktop. The pipeline uses these when selecting responsive variants.
- **Motion tokens** (`pb-motion-tokens.ts`) — duration scale, easing presets, stagger steps. The animation primitives of the system.
- **Type scale** (in `apps/web/src/app/fonts/`, not theme/) — font sizes, line heights, letter spacing. Separated from theme because it's tightly coupled to font loading.
- **Foundations config** (`pb-foundation-config.ts`) — stitches all the token files into a single CSS custom property map that gets injected into the root layout as an inline `<style>` block.

A different consumer app would provide different values in `theme/` and get a completely different default look without touching any pipeline or component code. The renderer never hardcodes a heading size. It reads from the host config. Swap the config, swap the look.

## Overlays: how every page gets a header and footer

Overlays (header, footer, navigation, theme toggle) are defined as Peblor section JSON files in `content/site/overlays/`. They apply to every page by default.

The overlay loading happens in step six of the pipeline, inside `getPeblorPropsFromPage`. The loader reads each overlay's section file, validates it against the section schema, and appends the resolved sections to the page output. A page can opt out of specific overlays via its `disableOverlays` array.

The overlay sections are rendered by the same `PeblorServerPage` renderer. They're not special components. They're just sections that happen to apply globally. This means the header can contain any Peblor element type — buttons, links, images, rich text — and it all works the same way as page content.

## Fonts: a surprising amount of complexity

Fonts live in `apps/web/src/app/fonts/` and they're more involved than you'd expect. The system supports two modes:

- **Webfont mode** (default) — fonts are loaded from Bunny Fonts at build time. The build downloads the font files. An inline `<style>` block in the root layout injects critical `@font-face` rules synchronously so the browser starts downloading font files during HTML parse, not after CSS discovery.

- **Self-hosted mode** — fonts are served from `public/font/`. Manifest files map font families to file paths. Preload hints prioritize the LCP-critical weights.

Either way, metric-adjusted fallback `@font-face` rules are generated at build time. These make Arial match Urbanist's metrics exactly, eliminating CLS during font swap. If you've ever watched text jump around while a page loads, you know why this matters.

The font config (`apps/web/src/app/fonts/config.ts`) defines three slots: primary (Urbanist, headings and body), secondary (Vollkorn, accent), and mono (Intel One Mono, code). Each slot can be toggled between webfont and local source by changing one line.

## Dev-only features

In development mode, the root layout imports `DevRuntimeClients`, which mounts four client components:

- **`DevPageValidationClient`** — runs page validation in the background and surfaces diagnostics.
- **`DevContentReloadClient`** — watches content files for changes and triggers hot reloads.
- **`PbFoundationsRuntimeSync`** and **`PbColorsRuntimeSync`** — synchronize foundation config and color token changes from the dev workbench into the live preview.

These are dynamically imported with zero production bundle impact. In production, they don't exist.

There are also two dev API routes at `/api/dev/content-watch` and `/api/dev/page-validation` that support the dev tooling. Both are excluded from production SSG.

All slugs starting with `dev` are blocked from the production build by the catch-all route. The `robots.txt` also disallows `/dev/`, `/api/`, and `/style-guide`.

## Key files

- `apps/web/src/app/[...slug]/page.tsx` — catch-all route, fully static SSG
- `apps/web/src/app/[...slug]/page-content.tsx` — the actual pipeline orchestrator
- `apps/web/src/app/[...slug]/layout.tsx` — scroll container shell
- `apps/web/src/app/[...slug]/error.tsx` — error boundary
- `apps/web/src/app/layout.tsx` — root layout (fonts, theme CSS, providers, analytics)
- `apps/web/src/app/page.tsx` — root page (renders the presets showcase)
- `apps/web/src/app/not-found.tsx` — 404 page
- `apps/web/src/app/unlock/page.tsx` — password-protected page handler
- `apps/web/src/bootstrap.ts` — startup config (sets builder defaults + content guidelines)
- `apps/web/src/app/theme/` — brand configuration (colors, spacing, breakpoints, motion)
- `apps/web/src/app/fonts/` — font config, manifest, and download scripts
- `apps/web/next.config.ts` — caching, security headers, redirects, bundle analysis
- `packages/core/src/index.ts` — public API of the pipeline (`getPageAsync`, `getPeblorPropsFromPage`, etc.)
- `packages/core/src/internal/adapters/host-config.ts` — the host config bridge

---

Back to [about-these-docs.md](../about-these-docs.md). See also: [pipeline.md](../architecture/pipeline.md), [runtime-react.md](runtime-react.md), [overview.md](tools/overview.md).
