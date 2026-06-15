# What Peblor thinks about building for the web

We built this because we got tired of the same crap every project: fight Next.js for three days, wire up a headless CMS, negotiate pricing for the fifth editor seat, write the same image optimization wrapper you wrote last time, and six months later you're maintaining a thousand lines of glue that has nothing to do with what you set out to build.

So we stopped. We wrote a platform that makes the choices we were making anyway, just once, so we never have to make them again. Here is what we decided.

## The opinions

**Pages are data, not code.** JSON is not a beautiful format. Nobody looks at a JSON file and thinks "hell yes." But here is the thing: data is portable. You can version it, diff it, validate it against a schema, review it in a pull request, and render it with anything that can read a dictionary. A React component can do exactly none of those things. The bet is simple — content should look like content and code should look like code. A content author should never have to open a TSX file. A page should survive a framework migration. If you wake up tomorrow and decide Next.js was a terrible mistake, your content moves with you untouched.

**Flat dictionaries beat deep trees.** Every page is a flat map of named definitions plus an array that says what order to render them in. No nested component hierarchies. No slots inside slots inside slots. Why? Because when everything is flat, merging two things is trivial — you merge two flat objects. Deep nesting looks good on a whiteboard but it makes everything worse: overrides, validation, debugging, diffing. We tried it the other way. Flat won.

**Composition is merge-patch, not inheritance.** Presets don't extend each other in some fragile class hierarchy that breaks the moment someone reorders the chain. They get merged. Local values override preset values. Last write wins. That is the whole system. You can trace exactly which field came from where, and you can explain the rule to someone in ten seconds. Inheritance chains cannot make either of those claims.

**All defaults are swappable.** Heading sizes, button styles, image aspect ratios, spacer heights — every visual default comes from a config object, not from hardcoded magic numbers buried in component files. A different brand swaps one config and moves on with their life. We do not get to decide what looks good for your project, and we should not pretend to.

**Animation belongs to content, not components.** Motion presets live in JSON files. Entrance animations, hover gestures, scroll-driven background transitions — all data. The runtime just plays back whatever it receives. This means a designer or animator can tweak motion without opening a pull request that touches JavaScript. It also means the same motion preset works the same way on every element type that uses it, which is more than you can say for most codebases.

**The server does the heavy lifting.** Breakpoints are resolved server-side from the User-Agent header. Entrance motion keyframes are computed at build time. CDN URLs are signed before the page ever hits a browser. The client gets a pre-resolved tree and focuses on what it is actually good at: rendering pixels and handling interaction. "use client" is an explicit opt-in, not a default you stumble into by accident.

**Type-string dispatch beats DI frameworks.** We use a plain object to map type strings to React components. That is it. No decorators, no providers, no injection tokens, no framework ceremony. A plain object is easier to debug, easier to tree-shake, and does not require anyone to learn a dependency injection mental model before they can understand how a button gets on screen.

**Errors are data, not exceptions.** When a page JSON has a problem, you get a list of diagnostics — path, message, severity — not a crash. Content authors make mistakes all the time. Those mistakes should be discoverable and fixable, not catastrophic. We throw only when the programmer screwed up, not when the content author did.

**The renderer is replaceable. The pipeline is not.** Everything through stage four of the pipeline has zero React or Next.js imports. It loads, validates, expands, and resolves content in pure TypeScript. Stage five happens to use React, but it could be anything. If you want to swap the renderer tomorrow, the pipeline does not care. The pipeline is the product.

**CSS handles theming. JavaScript stays out of it.** Custom properties, OKLCH color space, color-mix(). Light and dark mode is a per-property object, not a class name toggle. The browser already knows how to do this. We are not going to build a JavaScript layer on top of a perfectly good CSS feature and call it innovation.

**Figma is an input, not an authority.** Design tools export to our format, not the other way around. The Figma plugin normalizes its output through a bridge that strips Figma-specific noise and produces clean Peblor JSON. Your design file is a source, not the source of truth. The content files are the source of truth.

**Content goes through CI.** Pages live at the repo root in version control, right next to the code. They go through the same pull request, lint, and validation pipeline as everything else. A broken page is a failing build. You can bisect your content history, revert a bad page change, and grep every page on the site in half a second. Try doing any of that in a headless CMS.

**Media players are configuration, not custom components.** Video and audio players are defined entirely in JSON: key bindings, gesture regions, slot layouts, feedback chrome. Every behavior — seek on double-tap, show center play button when paused, hide bottom bar after timeout — is a declarative rule. There are no bespoke player React components. There does not need to be.

## Table of contents

### Architecture — start here

| File                                                     | What's inside                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [architecture/overview.md](architecture/overview.md)     | What Peblor is, the opinions above in more detail, and how the system connects |
| [architecture/pipeline.md](architecture/pipeline.md)     | The 5-stage pipeline with diagrams                                             |
| [architecture/data-model.md](architecture/data-model.md) | Pages, presets, merge-patch semantics, theming                                 |
| [architecture/motion.md](architecture/motion.md)         | The four motion layers                                                         |

### Writing pages (content authors)

| File                                                                                       | What's inside                                            |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [content-authors/getting-started.md](content-authors/getting-started.md)                   | Editing workflow, validation, troubleshooting            |
| [content-authors/pages-and-overlays.md](content-authors/pages-and-overlays.md)             | Page structure, metadata, section order, overlays        |
| [content-authors/sections-and-backgrounds.md](content-authors/sections-and-backgrounds.md) | Sections, backgrounds, and their shared properties       |
| [content-authors/elements-and-motion.md](content-authors/elements-and-motion.md)           | Elements, nesting, motion                                |
| [content-authors/presets.md](content-authors/presets.md)                                   | How presets compose, naming conventions, common mistakes |
| [content-authors/modules.md](content-authors/modules.md)                                   | Video and audio player configuration                     |

### Extending the platform (developers)

| File                                                                 | What's inside                                 |
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

## Finding your way around these docs

Everything links to everything else. If a sentence mentions presets, there is a link to the presets doc. If it mentions a source file, there is a link to that file. You should never have to search for what comes next — just follow the links.

If something is missing or wrong, the docs live in `docs/` alongside the code. Fix them.
