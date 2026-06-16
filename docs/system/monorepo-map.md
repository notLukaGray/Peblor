# The monorepo map

One repo. One `npm install`. One lockfile that eats your soul if you let it drift. No multi-repo orchestration, no version-matching dance between packages, no "oh, that fix needs to be released in a separate PR." You clone it, you build it, it works. Here's the map.

## The directories

**apps/** -- Two Next.js 16 consumers. `apps/web/` is the primary demo site. `apps/studio/` is the design tool (yes, Peblor has its own design tool -- dogfooding is a core value). Neither contains page content; they're just the glue between JSON on disk and pixels on screen. If you're looking for content, stop looking in the code and look in `content/` -- that's where the actual page data lives.

**packages/contracts/** -- The single source of truth. Zod 4 schemas that define every type in the system. Zero React, zero Node APIs, just pure schema declarations with one dependency: Zod. TypeScript types, JSON schemas, runtime validation -- everything derives from here. If you want to know what shape something is, the answer is here. More in the [contracts doc](contracts.md).

**packages/core/** -- The pipeline. Five pure functions (load, validate, expand, resolve, migrate) that turn JSON-on-disk into render-ready data. No React, no Next.js, no browser dependencies. It could run in a Node script, a build step, or a serverless function. The internals live in `packages/core/src/internal/` (adapters, defaults, overlay logic, asset resolution), but the main pipeline functions are directly in `packages/core/src/`. If you want to understand how a page goes from disk to screen, start here. More in the [core doc](core.md).

**packages/runtime-react/** -- The renderer. Takes resolved pipeline output and turns it into React components. Dispatch is a plain `Record` lookup -- no dependency injection, no magic registry, no ceremony. Sections dispatch at `runtime-react/src/peblor/section/index.ts` (8 section types), elements dispatch at `runtime-react/src/peblor/elements/index.ts` (34 element types). This is the only package that drags in browser things: React, framer-motion, Three.js, HLS.js, Lottie, Rive -- the whole party.

**packages/sdk/** -- A thin programmatic wrapper around core (~170 lines). For tools and scripts that need validate/diff/migrate without importing the full pipeline. If you find yourself adding significant logic here, it probably belongs in core instead. More in the [sdk doc](sdk-extensions-catalog.md).

**packages/extensions/** -- Plugin interfaces for import/export/CMS adapter support. Defines what a plugin looks like (importer, exporter, CMS adapter), not how one works. The actual implementations live elsewhere -- this package just draws the shape of the hole. More in the [extensions doc](sdk-extensions-catalog.md).

**packages/catalog/** -- The component catalog. Tracks every element, section, background, motion, and trigger type that exists in the schema, and checks that they have corresponding intent files. Powers the semantic search: "find me an element that scrolls horizontally" gets you the right type without guessing. More in the [catalog doc](sdk-extensions-catalog.md).

**tools/** -- Six utilities that don't have a home in packages. `pb-cli` is the content management CLI (validating, proposing, discovering). `pb-mcp` wraps that into the Model Context Protocol so AI editors can read and write content directly. `figma-plugin`, `figma-bridge`, and `figma-widget` form the Figma export pipeline (plugin spits it out, bridge cleans it up, widget annotates it). `dev-hls-server` is a local HLS streaming server for development -- because sometimes you need to test video without uploading to prod.

**content/** -- Every scrap of site content. Pages, presets, modules, modals, overlays, framer-motion config, generated JSON schemas, taxonomy tags, CDN config, layout templates -- all version-controlled alongside the code. A broken page is a failing build. This is the most important directory in the repo. Everything else exists to serve the data in here.

**scripts/** -- 23 scripts ranging from "check that nothing weird is happening" (`check-boundaries.ts`) to "please don't break the web" (`check-web-vitals.ts`) to "let's rename a field across every file" (`migrate-*-tiers.ts`). Run via `tsx`, no separate compilation step.

## How packages depend on each other

The dependency graph is a directed acyclic graph with contracts at the root. The rule is simple: nothing imports from something that depends on it. Direction is always forward.

- **@pb/contracts** depends on Zod 4 and nothing else. No React, no Node APIs, no other package from this repo. You can import a schema in any context -- server component, CLI tool, CI script, third-party editor plugin -- without dragging in the rest of the stack. This constraint is enforced by `scripts/check-boundaries.ts` in CI.

- **@pb/core** depends on `@pb/contracts`, Zod, and a handful of Markdown utilities (remark/rehype for rich text processing). Zero React or Next.js imports. The pipeline is deliberately isolated from the renderer so it can run anywhere -- server-side, build-time, or a Node script that hasn't heard of a DOM.

- **@pb/runtime-react** depends on `@pb/contracts` and `@pb/core`, then pulls in everything the renderer needs: React, Next.js, framer-motion, Three.js, HLS.js, Lottie, Rive, Zustand, and friends. This is the only package that touches browser APIs. It sits at the top of the chain.

- **@pb/sdk** depends on `@pb/contracts` and `@pb/core`. It's a consumer of core, not a dependency of it.

- **@pb/extensions** depends on `@pb/contracts` and `@pb/core`.

- **@pb/catalog** depends on `@pb/contracts` and `js-yaml` (for parsing intent files).

The critical rule: nothing above `@pb/contracts` imports from below it. Core imports from contracts. Runtime imports from core and contracts. This keeps the graph simple enough to hold in your head and prevents the circular-dependency nightmares that plague larger monorepos.

## The build chain

**npm workspaces** cover `apps/*`, `packages/*`, and `tools/*` through a single `"workspaces"` field in the root `package.json`. One lockfile. Do not use yarn or pnpm.

**TypeScript project references** are not used. Every package type-checks independently via `tsc --noEmit`, and the bundler resolves source through workspace symlinks. Each package has its own `tsconfig.json`.

The `postinstall` hook runs `patch-package` (applying any patches in `patches/`) and then generates JSON schemas from the Zod definitions in `@pb/contracts`, writing them to `content/schemas/`. Those schemas are what IDEs, MCP tools, and external validators use to provide autocomplete and validation.

## Import aliases

Defined in the root `tsconfig.json`. Available across the entire project -- tests, app code, scripts, everything.

| Alias                 | Resolves to                             |
| --------------------- | --------------------------------------- |
| `@/peblor/*`          | `packages/runtime-react/src/peblor/*`   |
| `@pb/runtime-react/*` | `packages/runtime-react/src/*`          |
| `@/core/*`            | `apps/web/src/core/*`                   |
| `@/content/*`         | `content/*`                             |
| `@content/*`          | `content/*` (same thing, different hat) |
| `@/*`                 | `apps/web/src/*`                        |

Packages also have internal `@/*` aliases mapping to their own `src/` directories. But cross-package code always uses the published package name -- `import { peblorSchema } from "@pb/contracts"`, not an alias.

No barrel files. No `index.ts` re-exports except where frameworks explicitly require them. Each package's `package.json#exports` map controls exactly what's importable. Check `packages/runtime-react/package.json` for a good example -- 12 entry points with a wildcard re-export.

## Where to add things

**New schema type or variant** -- Add to `packages/contracts/src/peblor/core/peblor-schemas/`. Create a file or extend an existing one. Add the variant to the appropriate `z.discriminatedUnion`. Wire the import into the schema aggregation at `peblor-schemas.ts`. Then register it in the catalog at `packages/catalog/src/intent/ENTRIES.ts` and create an intent file. Details in the [contracts doc](contracts.md).

**New pipeline logic** -- Add to `packages/core/src/internal/` for supporting logic, or add a new top-level function in `packages/core/src/` if it's a pipeline stage. Pure functions in, domain state out. Export through `packages/core/src/index.ts`. Details in the [core doc](core.md).

**New React component** -- Add to `packages/runtime-react/src/peblor/`. Register it in the section or element dispatch map at `packages/runtime-react/src/peblor/section/index.ts` or `packages/runtime-react/src/peblor/elements/index.ts`. Use `next/dynamic()` if it's heavy (3D, Rive, Lottie, Tabs, Drag).

**New brand or set of defaults** -- Configure through `setPeblorHostConfig()` in `packages/core/src/internal/adapters/host-config.ts`. The demo consumer at `apps/web/src/app/theme/` provides a reference implementation you can fork.

**New tool or script** -- Add to `tools/` for bundled tools, `scripts/` for one-off scripts. Both run via `tsx` -- no compilation step needed.

## Testing

**Vitest** with **happy-dom** for DOM emulation. Configuration at the root `vitest.config.ts`.

Tests are **co-located** next to their source files. `peblor-load.ts` has `peblor-load.test.ts` in the same directory. Keeps imports relative and makes it obvious when a file is untested. Search for `*.test.ts` to find every test.

The 30-second timeout is deliberate, not an oversight. Cold `import()` calls after `vi.resetModules()` can exceed five seconds under parallel load, and when you're running a hundred tests at once, those cold starts compound. The timeout gives the runner breathing room without flaky failures.

Path aliases in tests match the root `tsconfig.json`. Tests import from specific files or package entry points, never from barrel files.

## The check command

`npm run check` is the gate. If it passes, push. If it fails, fix it. Fifteen steps, chained with `&&`, all-or-nothing. Every step must pass. Here's the sequence:

1. **knip** -- Dead file and unused export detection. Cleans up the things time and ego leave behind.

2. **type-check** -- TypeScript compilation across all workspaces. The fastest check, the one that catches the most common mistakes.

3. **lint** -- ESLint with `--max-warnings 0`. Zero tolerance. If the linter flags it, fix or suppress it.

4. **format:check** -- Prettier validation. Print width 100, semicolons on, trailing commas (ES5 style), single quotes off. Every file must match.

5. **test** -- Vitest runs every `*.test.ts` file. Unit, integration, anything that doesn't need a browser. Failures block the push.

6. **validate-pages** -- Per-page schema validation. Checks every page in `content/pages/` against Zod schemas. Fast content sanity check.

7. **validate-content** -- The full `validate-all-pages.ts` script, loading every page with preset resolution. Same code path the runtime uses. Catches missing preset files, broken references, circular dependencies -- the kind of thing schema-only validation misses.

8. **audit-section-key-collisions** -- Ensures no two sidecar section files define the same key. Duplicate keys silently overwrite each other, so this catches silent data loss.

9. **audit-preset-key-collisions** -- Same idea for presets. Preset keys must be globally unique across every preset file.

10. **catalog:check-coverage** -- Every `ENTRIES.ts` entry must have a corresponding intent file, and every intent file must be in the registry. No drift between schema and documentation.

11. **catalog:build:ci** -- Regenerates the catalog from source intent files and fails if the output differs from what's checked in. Forget to rebuild after adding a component? Caught.

12. **pb-cli propose --check-all** -- Validates every proposal file in `proposals/`. Structural correctness, existing clusters properly considered, the works.

13. **check:tools** -- Separate type-check pass for the Figma plugin, bridge, widget, and pb-cli. These have their own tsconfigs and dependencies, so they get their own pass.

14. **check-boundaries** -- Runs `tsx scripts/check-boundaries.ts` to verify that no React or Next.js imports have leaked into `packages/core` or `packages/contracts`. The enforcement mechanism for the dependency rule.

15. **check:schemas-fresh** -- Regenerates the JSON schemas, then runs `git diff --exit-code` on `content/schemas/`. If you changed a Zod schema but forgot to regenerate the JSON schema output, this catches it.

16. **check:web-vitals** -- Runs `scripts/check-web-vitals.ts` to verify that the app's Core Web Vitals haven't regressed beyond defined budgets. Performance is a feature, and it's tested like one.

Pre-push hooks enforce all of this through husky. Fail at step 1 and you never make it to step 16. Run `npm run check` locally as many times as you want -- it's fast enough for iteration on what changed, and thorough enough to catch everything before CI.

---

Back to [about-these-docs.md](../about-these-docs.md). Next: [contracts.md](contracts.md).
