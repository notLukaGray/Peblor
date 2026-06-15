# The monorepo layout

Everything lives in one repo. There's no multi-repo orchestration, no separate publishing pipeline, no version-matching dance between packages. You clone one repo, run `npm install`, and everything works together because it was all built together. This is the map.

## The directories

**apps/web/** -- A Next.js 16 consumer. Routes load JSON from `content/pages/`, run the pipeline, and hand the result to a React renderer. No page content lives here. It's just the glue between JSON on disk and pixels on screen. If you're looking for page content, stop looking in the code and look in `content/`. If you're looking for how the demo app configures itself, check `apps/web/src/app/theme/` -- that's where the host config lives for this particular consumer.

**packages/contracts/** -- The single source of truth. Zod 4 schemas that define every type in the system. Everything else derives from here: TypeScript types, JSON schemas for external tooling, runtime validation. Zero React dependencies. If you want to know what shape something is, the answer lives here. More in the [contracts doc](contracts.md).

**packages/core/** -- The framework-agnostic content pipeline. Load, validate, expand, resolve, migrate -- five pure functions in sequence. No React, no Next.js. This is the product. If you're trying to understand how JSON becomes a rendered page, start here. Every stage is a function, every function is in a file, and every file is in `packages/core/src/internal/`. More in the [core doc](core.md).

**packages/runtime-react/** -- The renderer. Takes resolved pipeline output and produces React components. Dispatch is a plain `Record` lookup -- no dependency injection, no registry, no ceremony. If a section or element type isn't rendering, check the component maps at `packages/runtime-react/src/peblor/section/index.ts` and `packages/runtime-react/src/peblor/elements/index.ts`.

**packages/sdk/** -- A thin programmatic wrapper around core. For tools and scripts that need validate/diff/migrate without importing the full pipeline. Keeps itself small -- around 150 lines. If you find yourself adding significant logic here, it probably belongs in core instead. More in the [sdk doc](sdk-extensions-catalog.md).

**packages/extensions/** -- Plugin interfaces for import/export/CMS adapter support. Defines what a plugin looks like, not how one works. The actual plugin implementations live elsewhere -- this package just defines the contract for what a plugin is. More in the [extensions doc](sdk-extensions-catalog.md).

**packages/catalog/** -- The component catalog. Tracks what exists in the schema vs what exists in the runtime. Powers the semantic search system that lets you say "find me an element that scrolls horizontally" and get back the right type. The intent system sits here. More in the [catalog doc](sdk-extensions-catalog.md).

**tools/pb-cli/** -- The content management CLI. Validation, proposal checking, page discovery, and other ops commands. If you need to validate all pages, check for broken links, or run a bulk operation on content, this is the tool. It's executed via `tsx` -- no separate compilation step.

**tools/pb-mcp/** -- The MCP server. Wraps pb-cli and catalog functionality into the Model Context Protocol so AI editors (like the one that wrote these docs) can read and write content directly. This is how the editor integration works -- the MCP server translates tool calls into content operations.

**tools/figma-plugin/** -- A Figma plugin that exports design files to Peblor JSON. On its own, the output is Figma-shaped. The bridge cleans that up.

**tools/figma-bridge/** -- The normalization layer between Figma's output format and Peblor's canonical schema. Strips Figma-specific noise (auto-layout wrappers, frame groups, unnamed layers) and produces clean Peblor JSON. This is what makes the export chain work.

**tools/figma-widget/** -- A companion Figma widget for annotating designs before export. Designers can tag layers with Peblor type hints directly in Figma, which the bridge picks up during conversion.

**content/** -- All site content. Pages, presets, modules, modals, overlays, framer-motion config, schemas, and data all live here, version-controlled alongside the code. A broken page is a failing build. This is the most important directory in the repo -- everything else exists to serve the data in here.

## How packages depend on each other

The dependency graph is a directed acyclic graph with contracts at the root. Here's the chain:

- **@pb/contracts** depends on Zod 4 and nothing else. No React, no Node APIs, no other package from this repo. You can import a schema from contracts in any context -- a server component, a CLI tool, a CI script, a third-party editor plugin -- without dragging in the rest of the stack. This constraint is enforced by the boundary checker in CI (`check-boundaries.ts` in the scripts directory).

- **@pb/core** depends on @pb/contracts, Zod 4, and a couple of utility libraries like rehype-stringify for rich text processing. It has zero React or Next.js imports. The pipeline is deliberately isolated from the renderer so it can be reused in any context -- server-side, build-time, or in a Node script that's never heard of a DOM.

- **@pb/runtime-react** depends on @pb/contracts, @pb/core, and then everything the renderer needs: React, Next.js, framer-motion, three.js, hls.js, lottie-web, and a few others. This is the only package that pulls in browser-focused dependencies. It sits at the top of the chain.

- **@pb/sdk** depends on @pb/contracts and @pb/core. It's a consumer of core, not a dependency of it.

- **@pb/extensions** depends on @pb/contracts and @pb/core.

- **@pb/catalog** depends on @pb/contracts and js-yaml (for parsing intent files).

The critical rule: nothing above contracts imports from anything below it. Core imports from contracts. Runtime imports from core and contracts. The direction is always forward. This keeps the dependency graph simple enough to hold in your head and prevents the circular-dependency nightmares that plague larger monorepos.

## The build chain

**npm workspaces** are declared in the root `package.json` through the `workspaces` field, covering `apps/*`, `packages/*`, and `tools/*`. The lockfile is `package-lock.json` -- do not use yarn or pnpm. There's only one lockfile for the whole repo, and it's committed.

**TypeScript project references** are not used. Instead, every package compiles independently via `tsc --noEmit` for type-checking, and the bundler resolves source directly through workspace symlinks. Each package has its own `tsconfig.json` at `packages/<name>/tsconfig.json` with its own `paths` and `include` settings.

The `postinstall` hook runs `npm run generate-json-schemas` automatically after every install. This step generates JSON Schema files from the Zod definitions in `@pb/contracts` and writes them to `content/schemas/`. Those schemas are what IDEs, MCP tools, and external validators use to provide autocomplete and validation for Peblor JSON files.

## Import aliases

The root `tsconfig.json` defines these path aliases. They're available across the entire project -- tests, app code, scripts, everything:

| Alias                 | Resolves to                           |
| --------------------- | ------------------------------------- |
| `@/peblor/*`          | `packages/runtime-react/src/peblor/*` |
| `@pb/runtime-react/*` | `packages/runtime-react/src/*`        |
| `@/core/*`            | `apps/web/src/core/*`                 |
| `@/content/*`         | `content/*`                           |
| `@/*`                 | `apps/web/src/*`                      |

Packages also have their own internal `@/*` aliases that map to their own `src/*` directories. But cross-package references always use the published package name -- for example, you'd write `import { peblorSchema } from "@pb/contracts"`, not an alias.

There's no barrel file pattern in this repo. No `index.ts` re-exports except where frameworks like Next.js explicitly require them. Each package's `package.json#exports` map controls exactly what's importable from outside. For `@pb/contracts`, the `exports` map in `packages/contracts/package.json` tells you exactly what entry points are public.

## Where to add things

**New schema type or variant** -- Add to `packages/contracts/src/peblor/core/peblor-schemas/`. Create a new file or extend an existing one. Add the variant to the appropriate `z.discriminatedUnion`. Add the import to the barrel file at `peblor-schemas.ts`. Then add the corresponding ID to the catalog's `ENTRIES.ts` at `packages/catalog/src/intent/ENTRIES.ts` and create an intent file. Details in the [contracts doc](contracts.md).

**New pipeline logic** -- Add to `packages/core/src/internal/`. If it's a new stage, follow the shape of the existing ones: a pure function that takes domain state in and returns domain state out. Export through `packages/core/src/index.ts`. Details in the [core doc](core.md).

**New React component** -- Add to `packages/runtime-react/src/peblor/`. Register it in the section or element dispatch map at `packages/runtime-react/src/peblor/section/index.ts` or `packages/runtime-react/src/peblor/elements/index.ts`. Use `next/dynamic()` if it's heavy (3D, Rive, Lottie, Tabs, Drag).

**New brand or set of defaults** -- Configure through `setPeblorHostConfig()` in `packages/core/src/internal/adapters/host-config.ts`. The demo consumer in `apps/web/src/app/theme/` provides one example you can copy.

**New tool or script** -- Add to `tools/` for bundled tools, `scripts/` for one-off scripts. CLI scripts use `tsx` for execution -- no separate compilation step needed.

## Testing

Testing uses **Vitest** with **happy-dom** for DOM emulation when needed. Configuration is at the root `vitest.config.ts`.

Tests are **co-located** next to their source files. A file named `peblor-load.ts` has a corresponding `peblor-load.test.ts` in the same directory. This keeps test imports relative and makes it obvious when a file is untested. Search for `*.test.ts` to find every test in the repo.

The 30-second timeout is deliberate, not an oversight. Cold `import()` calls after `vi.resetModules()` can exceed five seconds under parallel load, and when you're running a hundred tests at once, those five-second cold starts compound. The timeout gives the test runner breathing room without flaky failures.

Path aliases in tests match the root `tsconfig.json` paths. Tests don't import from barrel files -- they import from the specific file being tested or the package entry point.

## The check command

`npm run check` is the gate. If it passes, you can push. If it fails, you can't. Here's what it runs, in order:

1. **type-check** -- TypeScript compilation across all workspaces. Catches type mismatches, missing exports, and import errors before anything else runs. This is the fastest check and the one that catches the most basic mistakes.

2. **lint** -- ESLint with `--max-warnings 0`. Zero tolerance for warnings. If the linter says something is off, it has to be fixed or explicitly suppressed. The ruleset comes from eslint-config-next and eslint-config-prettier.

3. **format:check** -- Prettier validation. Checks that every file matches the formatter's expected output. The relevant settings are print width of 100, semicolons on, trailing commas in ES5 style, and single quotes off.

4. **test** -- Runs all `*.test.ts` files through Vitest. Unit tests, integration tests, and any test that doesn't need a browser. If a test fails, the command fails.

5. **validate-pages** -- Per-page schema validation. Checks every page in `content/pages/` against the Zod schemas without loading global presets. Fast -- useful as a quick content sanity check.

6. **validate-content** -- Runs the bulk `validate-all-pages.ts` script, which loads every page with full preset resolution. This is the same code path the runtime uses, so it catches issues that schema-only validation misses: missing preset files, broken preset references, circular dependencies.

7. **catalog:check-coverage** -- Verifies that every entry in the catalog's `ENTRIES.ts` has a corresponding intent file and that every intent file is listed in the registry. Detects drift between what exists in the schema and what's documented.

8. **catalog:build:ci** -- Regenerates the catalog from source intent files, then fails if the regenerated output differs from the checked-in copy. If you added a new component and its intent file but forgot to rebuild the catalog, this catches it.

9. **pb-cli propose --check-all** -- Validates every proposal file in the proposals directory. Checks structural correctness and that existing clusters were actually considered.

10. **check:tools** -- Type-checks the Figma plugin, bridge, and widget. These live in `tools/` and use their own TypeScript configs, so they need a separate type-check pass.

11. **check-boundaries** -- Runs `tsx scripts/check-boundaries.ts` to verify that no React or Next.js imports have leaked into `packages/core` or `packages/contracts`. This is the enforcement mechanism for the dependency rule. If someone accidentally adds a React import to core, the check fails.

Pre-push hooks enforce all of this through husky. If any step fails, the push is blocked. You can run `npm run check` locally as many times as you want -- it's designed to be fast enough for iteration on the things you changed, and thorough enough to catch everything before CI.

---

Back to [about-these-docs.md](../about-these-docs.md). Next: [contracts.md](contracts.md).
