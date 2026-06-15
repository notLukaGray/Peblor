# apps/web: The Next.js demo app

`apps/web` is a consumer of the peblor packages. That's all it is. It doesn't contain any hardcoded page content — everything is driven by the JSON in `content/pages/`. It doesn't have any special insight into how rendering works — it just calls the pipeline and displays whatever comes out. You could replace this entire directory with a different framework (Svelte, Vue, whatever) and the content would move with you untouched. The pipeline doesn't know Next.js exists, and neither should your content.

This is the directory you run when you type `npm run dev`. It's a Next.js 16 app using the App Router, configured for static site generation. Everything below is specific to this particular consumer — the decisions this app made about routing, theming, and build configuration. A different app could make different decisions without touching a single content file.

## What's where

The app lives at `apps/web/src/app/`. The top-level files handle the root page, the global layout, fonts, theme configuration, and global assets.

- `apps/web/src/app/page.tsx` — the root page at `/`, rendered outside the catch-all route. This page gets its own special handling because it's the entry point for the entire site.
- `apps/web/src/app/layout.tsx` — the root layout. Provides fonts, theme CSS variables, analytics plumbing, and the HTML shell that wraps every page.
- `apps/web/src/app/globals.css` — global CSS custom properties and base styles. Things like the color palette tokens, spacing scale, and resets live here.
- `apps/web/src/app/robots.ts` — generates `robots.txt` at build time. Uses the page discovery system to know which pages exist and what their visibility settings are.
- `apps/web/src/app/sitemap.ts` — generates the XML sitemap from the discovered page list. Also runs at build time, so the sitemap always reflects the current content.

## The catch-all route

The primary render path is `apps/web/src/app/[...slug]/page.tsx`. If you understand this file, you understand how the app works. Every page under `content/pages/` flows through here.

It's a catch-all route, which means it matches any path with one or more segments. A request for `/about` resolves the slug array `["about"]`. A request for `/work/project-x` resolves `["work", "project-x"]`. The route handler takes this slug array and works through a fixed sequence of steps.

First, it resolves the slug and checks whether it looks like a dev-only slug. Slugs that start with `dev` are blocked in production. This is how the playground and style guide pages stay out of the production build.

Next, it loads the page's visibility metadata to check whether the page is password-protected. If the user hasn't unlocked it yet, the route renders an unlock modal instead of the page content. This check is fast — it only loads the metadata, not the full page.

Then it loads the full page data by calling `getPageAsync` from `packages/core`. This runs stages one through three of the pipeline (load, validate, expand) and returns the mid-pipeline result. At this point, all presets are resolved, elements are inlined, and builder defaults are applied.

The route then determines the user's viewport. It checks the User-Agent header for a mobile-or-desktop guess, then looks for a browser data cookie that gives a more accurate viewport width measurement. The cookie approach handles tablet-sized screens that the User-Agent heuristic would misclassify.

With the viewport known, the route runs the rest of the pipeline via `getPeblorPropsFromPage`. This handles the fourth stage (asset resolution: CDN signing, responsive image sizes, theme string resolution), plus overlay loading (header, footer, navigation from `content/site/overlays/`) and modal discovery.

Any active URL filters get applied to the resolved sections at this point. If the page supports filterable content (the work page, for instance), the filter parameter in the URL determines which portfolio items are visible.

Finally, the resolved data gets rendered through `PeblorServerPage` from `@pb/runtime-react/server`. The server renderer handles the server-client split, hydration priorities, and the full page shell.

## The full request flow

Here's what happens, start to finish, when a browser requests a page.

1. Next.js matches the URL against the catch-all route `[...slug]/page.tsx`. The slug array gets extracted from the path.
2. The route checks for dev-only slug patterns. If the slug is a dev route and we're in production, it returns a 404.
3. The route loads the page's metadata — title, description, visibility, password protection status. If the page is protected and the request doesn't have a valid unlock token, the unlock modal renders instead.
4. `getPageAsync` from `packages/core` loads the page JSON, merges presets, validates the structure, expands elements, and applies defaults. This is the heavy lifting — it's the load, validate, and expand stages of the pipeline.
5. The route reads the User-Agent header and the browser data cookie to determine desktop or mobile layout. Breakpoints are resolved server-side — the client never sees a responsive decision.
6. `getPeblorPropsFromPage` finishes the pipeline: asset resolution (CDN URL signing, responsive image sizes, theme string resolution), overlay loading, and modal collection. This is the resolve stage.
7. URL filters get applied to the resolved sections. If the URL has `?filter=branding`, portfolio items without the "branding" tag get removed from the output.
8. `PeblorServerPage` renders the HTML. The server renderer decides which sections need client hydration and which are pure static HTML.
9. The HTML response goes to the browser. The client hydrates the interactive sections and the page is live.

That's it. Every page goes through exactly this path. The pipeline stages are always the same. The only variability is in step one (which page was requested) and step six (which overlays and modals apply).

## SSG: building everything at compile time

The app builds statically. The `generateStaticParams` function in the catch-all route discovers every page via `discoverAllPages` from `packages/core/src/internal/load/peblor-discover-pages.ts` and returns their slugs. Next.js generates static HTML for each one at build time.

Protected pages and unlisted pages are excluded from the static params. Protected pages need the unlock flow, so they have to render on demand. Unlisted pages shouldn't appear in the sitemap or in pre-rendered output.

The `revalidate` export is set to 300 seconds. This enables incremental static regeneration — when a page is requested after the revalidation window, Next.js regenerates it in the background and serves the stale version until the new one is ready. This matters because content files change (people edit JSON, presets get updated), and you don't want to rebuild the entire site for every change.

Fonts are downloaded at build time via `scripts/download-webfonts.ts`. The font configuration lives under `apps/web/src/app/fonts/` and includes manifest files, CSS variable generation, and type scale definitions. The fonts are self-hosted — no external font service requests at runtime.

## The host-config bridge

This is the mechanism that keeps brand-specific defaults out of the core packages. The core packages define the pipeline and the rendering logic, but they don't know anything about your brand's heading sizes, color palette, or button styles. Those decisions belong to the consumer app.

The app provides its theme configuration through `setPeblorHostConfig` from `packages/core/src/internal/adapters/host-config.ts`. The core package exposes a mutable config object. The consumer app populates it at startup with whatever values it wants. The pipeline reads from this config when it needs to apply defaults.

The app's theme configuration lives in `apps/web/src/app/theme/` and covers everything the pipeline needs to make visual decisions:

- **Builder defaults** — default element variants: what size should an H1 heading be, what style should a primary button use, what aspect ratio should an image default to. These are the fallback values when a content author doesn't specify a variant.
- **Content guidelines** — spacing rules, alignment options, section gap defaults, and font slot bindings. This is where you define the design system's constraints.
- **Color tokens** — the full color palette as CSS custom properties, organized in OKLCH color space. Light and dark mode values are defined here.
- **Breakpoint tokens** — responsive breakpoint definitions. Which viewport widths count as mobile, tablet, desktop. The pipeline uses these when selecting responsive variants.
- **Type scale tokens** — the typography scale. Font sizes, line heights, letter spacing for every text size in the system.
- **Motion tokens** — motion timing and easing defaults. How fast should a fade be, what easing curve should a slide-up use.

A different consumer app would provide different values here and get a completely different default look without touching any component code. The renderer never hardcodes a heading size — it reads it from the host-config bridge. Swap the config, swap the look.

## Dev-only routes

Two dev-only routes live under `apps/web/src/app/`. Both are excluded from production SSG via the dev-slug check in the catch-all route.

**`/playground`** (`apps/web/src/app/playground/page.tsx`) is a component playground for testing elements in isolation. You can load individual element types with custom data, tweak their properties, and see how they render without building a full page around them. It's useful for developing new element types and debugging rendering behavior.

**`/style-guide`** (`apps/web/src/app/style-guide/page.tsx`) shows all available tokens and variants. Color palette, typography scale, spacing, breakpoints — everything the host-config bridge defines. It's a living reference that reflects the current config, not a static document.

The dev tools also include a Figma export diagnostics bridge, dynamically imported only in development mode. It renders export diagnostics from the Figma plugin directly on the page, which is useful when you're setting up new export paths and want to see what's coming through.

## Key files

- `apps/web/src/app/[...slug]/page.tsx` — catch-all route, the primary render path for all pages
- `apps/web/src/app/[...slug]/layout.tsx` — layout component for the catch-all route
- `apps/web/src/app/[...slug]/universal-peblor-shell.tsx` — scroll container shell with `ScrollContainerProvider`
- `apps/web/src/app/[...slug]/error.tsx` — error boundary for the catch-all route
- `apps/web/src/app/[...slug]/analytics-tracker.tsx` — page-level analytics tracking
- `apps/web/src/app/layout.tsx` — root layout with fonts, theme, and HTML shell
- `apps/web/src/app/page.tsx` — root page
- `apps/web/src/app/theme/` — host-config bridge (builder defaults, content guidelines, color tokens, foundation config)
- `apps/web/src/app/fonts/` — font configuration, manifest, and download scripts
- `apps/web/src/app/playground/page.tsx` — component playground (dev only)
- `apps/web/src/app/style-guide/page.tsx` — style guide (dev only)
- `packages/core/src/internal/adapters/host-config.ts` — the host config adapter that apps populate
- `packages/core/src/index.ts` — contains `getPeblorPropsAsync`, `getPageAsync`, `getPeblorPropsFromPage`

---

Back to [about-these-docs.md](../about-these-docs.md). See also: [pipeline.md](../architecture/pipeline.md), [runtime-react.md](runtime-react.md), [extending-the-platform.md](extending-the-platform.md), [overview.md](tools/overview.md).
