# What Peblor believes

Peblor has opinions. Some are about data modeling. Others are about who should write CSS. A few are about why your next framework migration should not cost you your content.

This file collects the short versions. Each one links to a doc that goes deep.

## The short version

Peblor is a pipeline: structured JSON goes in, rendered pages come out. The content is portable data, the rendering is swappable infrastructure, and the work in between is pure TypeScript with strong opinions about how data should behave.

## The core ideas

**Data is portable. Components are not.** JSON lives in version control, moves through a pull request, and survives a framework migration. A React component can do exactly none of those things. Content and code are different materials, and Peblor treats them that way.

**Flat dictionaries. Merge semantics. That is the whole system.** Every page is a flat map of named definitions plus a render-order array. Deep nesting is replaced with merge-patch composition: local values win, last write wins, and you can trace any field to its source. Inheritance chains cannot say the same.

**Animation lives in JSON, not JavaScript.** Entrance presets, hover gestures, scroll-driven effects — all data. A designer can tweak a motion preset without touching a pull request that contains code. The same animation behaves identically on every element that references it.

**The server does not pass the buck.** Breakpoints resolve from headers. CDN URLs sign before shipping. Entrance keyframes compute at build time. The client receives a pre-cooked tree and focuses on pixels and interaction; it does not negotiate, resolve, or compute at runtime.

**Type strings, not dependency injection.** A plain `Record<string, Component>` resolves every element and section. No decorators. No providers. No injection tokens. The dispatch map fits in your head.

**Errors are structured diagnostics, not crashes.** Bad page JSON returns a list of issues with paths and severities. Content authors make mistakes. The platform should surface those mistakes gracefully, not throw an exception.

**The pipeline is the product. The renderer is a detail.** Everything before rendering has zero React imports. The renderer happens to be React, but it could be anything. The pipeline does not care what you swap in.

**CSS does theming. JavaScript contributes nothing.** Custom properties, OKLCH, `color-mix()`. Per-property light and dark values, not class-name toggles. We are not going to rebuild CSS features in JavaScript and call it innovation.

**Figma is a source of inspiration, not truth.** The plugin sends design output through a bridge that strips tool-specific noise. The source of truth lives in version-controlled JSON.

**Media players are configuration objects.** Video and audio players define every behavior — key bindings, gesture zones, layout slots — in JSON. There are no bespoke React components for different player flavors.

**Content ships through CI, not a CMS dashboard.** Pages live in the repo, flow through pull requests, and break the build when they are wrong. You can bisect, revert, and grep your entire content library. Good luck doing any of that from a WYSIWYG editor.

## Table of contents

### Architecture — start here

| File                                                     | What is inside                                            |
| -------------------------------------------------------- | --------------------------------------------------------- |
| [architecture/overview.md](architecture/overview.md)     | Full explanation of every idea above, with system context |
| [architecture/pipeline.md](architecture/pipeline.md)     | The five-stage pipeline with diagrams                     |
| [architecture/data-model.md](architecture/data-model.md) | Pages, presets, merge-patch semantics, theming            |
| [architecture/motion.md](architecture/motion.md)         | The four motion layers                                    |

### Writing pages (content authors)

| File                                                                                       | What is inside                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [content-authors/getting-started.md](content-authors/getting-started.md)                   | Editing workflow, validation, troubleshooting      |
| [content-authors/pages-and-overlays.md](content-authors/pages-and-overlays.md)             | Page structure, metadata, section order, overlays  |
| [content-authors/sections-and-backgrounds.md](content-authors/sections-and-backgrounds.md) | Sections, backgrounds, and their shared properties |
| [content-authors/elements-and-motion.md](content-authors/elements-and-motion.md)           | Elements, nesting, motion                          |
| [content-authors/presets.md](content-authors/presets.md)                                   | How presets compose, naming conventions, gotchas   |
| [content-authors/modules.md](content-authors/modules.md)                                   | Video and audio player configuration               |

### Extending the platform (developers)

| File                                                                 | What is inside                                |
| -------------------------------------------------------------------- | --------------------------------------------- |
| [system/monorepo-map.md](system/monorepo-map.md)                     | What lives where and how the packages connect |
| [system/contracts.md](system/contracts.md)                           | Zod schemas, adding variant types             |
| [system/core.md](system/core.md)                                     | Pipeline internals                            |
| [system/runtime-react.md](system/runtime-react.md)                   | How JSON becomes React on screen              |
| [system/sdk-extensions-catalog.md](system/sdk-extensions-catalog.md) | SDK, plugins, component catalog               |
| [system/tools/overview.md](system/tools/overview.md)                 | All tools at a glance                         |
| [system/tools/pb-cli.md](system/tools/pb-cli.md)                     | CLI architecture                              |
| [system/tools/pb-mcp.md](system/tools/pb-mcp.md)                     | MCP server for editing                        |
| [system/tools/figma.md](system/tools/figma.md)                       | Figma plugin, bridge, and widget              |
| [system/apps-web.md](system/apps-web.md)                             | Next.js demo app                              |
| [system/extending-the-platform.md](system/extending-the-platform.md) | Every file to touch when adding something new |

## Where to go next

If any of the ideas above made you curious, [architecture/overview.md](architecture/overview.md) is where each one gets the full treatment — what Peblor is, why it exists, and how all the pieces connect. You do not need to have read this first.

Something missing or wrong? These docs live in the repo alongside the code. Fix them.
