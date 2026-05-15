# Peblor

A JSON-driven page builder. You define pages as structured JSON (sections, elements, layouts, modules), and Peblor handles the rest — loading, validation, expansion, and rendering.

This is the monorepo. The platform lives in `packages/` (schemas, core pipeline, React runtime, SDK, CLI). The demo app in `apps/web` consumes those packages and shows how everything fits together. Content lives in `content/` at the root.

## Quick start

```bash
npm install
npm run dev
```

## What's here

- **`packages/contracts`** — canonical Zod schemas for every page, section, element, and module shape
- **`packages/core`** — content pipeline: load, validate, expand, resolve, migrate
- **`packages/runtime-react`** — React server/client rendering runtime
- **`packages/sdk`** — programmatic client for validate/diff/migrate/load workflows
- **`packages/extensions`** — plugin interfaces for import/export/CMS adapters
- **`packages/catalog`** — coverage tooling that tracks which components have intent files, examples, and schema cross-checks
- **`tools/pb-cli`** — CLI for validate, diff, migrate, conformance checks
- **`tools/figma-plugin`** — Figma export plugin
- **`apps/web`** — Next.js demo app consuming all of the above

## Commands

| Command                   | What it does                                                       |
| ------------------------- | ------------------------------------------------------------------ |
| `npm run dev`             | Start the demo app + dev tools                                     |
| `npm run build`           | Production build                                                   |
| `npm run check`           | Type-check, lint, format check, content validation, catalog checks |
| `npm run test`            | Run vitest                                                         |
| `npm run pb-cli -- <cmd>` | Run the platform CLI                                               |

## Config

Non-secret project configuration lives in `peblor.config.json` at the root. Env vars override it for CI or machine-specific needs.
