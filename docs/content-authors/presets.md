# Presets

Here's the problem presets solve: you have a beautiful heading style -- large, bold, with a gradient underline and a slide-up entrance animation. You use it on your homepage hero, your about page, your services page, and three different blog post layouts. Every one of those pages has the exact same heading configuration copy-pasted into its JSON.

Then someone decides the underline should be a different color.

You now get to find every copy and change it.

Presets are Peblor's answer to this. A preset is a standalone JSON file containing a reusable definition block. Pages import presets, and the system merges the preset's content into the page at load time. Change the preset file, and every page that references it picks up the change. Need one page to be different? Override specific fields on that page's local block and leave the rest alone. The preset handles the common stuff; the page handles what makes it unique.

This is the most important mechanism in the content system. Understanding how it works is the difference between a clean set of pages you can maintain with your eyes closed and a pile of copy-pasted JSON that you're afraid to touch.

## Where presets live

All presets live under `content/presets/`, organized by what they do:

- **bg/** -- Background definitions. Solid colors, gradients, images, videos, patterns. If it goes behind content, it's here. From simple bg-solid to complex layered backgrounds with multiple gradient stops and noise textures.
- **card/** -- Card layouts and patterns. Feature cards, stat cards, bento grid items, preview panels. These are full section presets that define both structure and styling for card-based layouts.
- **demo/** -- Demo content for the showcase site. Hero sections, scroll content, feature cards. These are great examples to study because they show the full preset pattern in action -- a demo hero preset, for instance, defines the entire hero section structure and leaves only the text to be overridden per page.
- **layout/** -- Column and flow layouts. Two-column editorial, three-column features, hero stacks, KPI matrices, mixed-span grids. If you need a specific number of columns or a particular arrangement, look here first.
- **player/** -- Player UI control presets. Transport controls, seek clusters, state indicators, volume controls, scene selectors. These get composed into video and audio modules.
- **type/** -- Typography presets. Headings (h1 through h6 at multiple sizes), body text (standard, fine, lead, mono, serif), labels, marquees, counters, rich text, effect headings. This is the most-used preset category because every page needs text styling.
- **ui/** -- Interface elements. Buttons, links, panels. The building blocks of user interfaces.
- **video/** -- Video-specific control presets. Play, pause, seek, mute, volume, fullscreen, time display, quality selector. These are smaller and more focused than the player presets -- each one is a single control rather than a full control bar.
- **pages/** -- Page-level layout shells. Full-page templates and work-specific presets that combine multiple sections into a complete page structure.

Each directory holds individual JSON files named after the preset's key. The file `type/core/type-h1-display.json` defines a preset whose key is `type-h1-display`. The subdirectory structure under each category is just for organization -- the loader cares about the filename, not the nesting depth.

## How pages import presets

Every page has a top-level field called presets. It's an array of file or directory paths relative to `content/presets/`. A typical value might include a solid color background, the entire typography directory, and a card presets directory -- something like `bg/bg-solid.json`, `type/core/`, `card/`.

You can see this field in action by opening any page file under `content/pages/`. The homepage, the about page, the demo pages -- they all have presets arrays listing what they need.

The loader lives in the core package's load stage. It walks each referenced file or directory, reads every JSON file it finds, and puts each definition into a single flat namespace keyed by filename (minus the .json extension). So `type/core/type-h1-display.json` becomes a preset available under the key `type-h1-display`.

After loading the explicitly listed presets, the loader then resolves any inline preset references in the page's own definitions. This two-phase approach means a preset can reference another preset, and the chain keeps resolving until everything is inlined or a circular reference is detected.

## How presets compose

When a definition block has a preset field, the system merges the preset's content into the block using a set of rules that are simple to describe but powerful in practice. The rules come from something called JSON merge patch (RFC 7396), but you don't need to know the spec -- you just need to know how it behaves.

**Objects merge recursively.** If both the preset and the local block have a definitions key, the system merges them key by key. Local keys override preset keys at every level of nesting. This is how you inherit a whole section from a preset but swap out a single heading's text or change one button's action. You don't redefine the whole section -- you just override the one thing you want to be different.

**Arrays replace entirely.** If the preset provides an elementOrder array with three items and your local block has one with two items, the local array wins completely. There's no array merging, no concatenation, no smart diffing. The local array replaces the preset's array entirely. This might sound harsh, but it prevents a nightmare scenario where you're trying to reorder elements and the merge keeps fighting you. If you need a different order, provide the full order.

**Scalar values are last-write-wins.** Whatever the local block sets for a text field, a number, or a boolean overrides the preset. Whatever the preset sets fills in what the local block didn't specify. If the preset says variant is display and your local block doesn't mention variant, you get display. If your local block says variant is section, you get section.

**Presets can reference other presets.** A heading preset might reference a type preset for base typography styles and add its own color and motion on top. The resolver walks the chain -- from page to preset, from preset to preset -- merging at each step. If it finds a circular reference (preset A references preset B which references preset A), it throws immediately with an error message listing the full chain. Circular references are always a mistake, and the system catches them at load time, not at render time when they'd be much harder to debug.

The merge logic also handles a tricky edge case: when both a preset and a local block define a section object (which has its own elementOrder and definitions), they merge independently at each level. The section's structure is preserved, and the local overrides are applied where specified.

### A concrete walkthrough

Let's walk through a real example to see how this works. The demo hero preset defines a hero section with multiple elements -- a badge, a large heading, a description paragraph, and a couple of buttons. The preset provides the layout (the element order), the spacing, the backgrounds, and the entrance motion for each element.

Now imagine a specific page that uses this hero preset. The page references the preset on a section block, then overrides just the text content inside the nested definitions. The badge text is different. The heading says something specific to that page. The description is unique.

But the structure stays the same. The element order doesn't change. The spacing doesn't change. The entrance motion -- fade in with stagger -- stays exactly what the preset defined. The page only changed the words.

This is the pattern you want to follow. The preset provides the structure and behavior. The page overrides only what makes it unique. If you later change the preset's entrance animation, every page using it picks up the new animation automatically. The pages that only overrode text keep their new text but get the new animation. The pages that also overrode the entrance animation keep their override.

## Naming conventions

Preset names follow a scope-category-variant pattern. Looking at the files under `content/presets/` will make this obvious, but here's the logic.

The first segment of the name is the scope -- what broad area this preset belongs to. Common scopes are `type` for typography, `bg` for backgrounds, `card` for card layouts, `player` for player controls, `video` for video controls, `demo` for demo content, `layout` for page layouts, and `ui` for interface elements.

The second segment narrows the category within that scope. For type presets: `type-h1`, `type-body`, `type-label`. For backgrounds: `bg-solid`, `bg-aurora`, `bg-gradient`. For cards: `card-feature`, `card-stat`.

The third segment specifies the variant. For type: `type-h1-display`, `type-h1-section`, `type-body-standard`, `type-body-fine`. For cards: `card-feature-basic`, `card-feature-bento`, `card-stat-row`, `card-stat-grid`.

Some real examples from the preset files:

- `type-h1-display` -- a heading preset, h1 level, display variant. Big, bold, attention-grabbing.
- `type-body-standard` -- standard body text. The default for paragraphs.
- `bg-solid` -- a solid color background. Simple but you'll use it everywhere.
- `bg-aurora` -- an aurora gradient background. Multiple soft gradient stops for a atmospheric effect.
- `card-feature-basic` -- a basic feature card with icon, heading, and description.
- `card-stat-row` -- a row of stat cards for metrics and KPIs.
- `player-controls-transport-full` -- full transport control preset for player UI.
- `video-controls-play` -- a play button specifically for video overlays.
- `demo-hero` -- the demo site's hero section.
- `layout-2col-editorial` -- two-column editorial layout with a main column and sidebar.

This naming convention keeps preset keys readable and greppable. Search your project for `type-h1` and you'll find every page using a type-h1 preset, regardless of variant.

## The global uniqueness rule

Every preset key across every category and every page must be unique. There's no namespacing. A preset called `hero` in `bg/hero.json` and a preset called `hero` in `card/hero.json` will collide. The last one loaded wins.

This sounds restrictive, and it is -- but the alternative is worse. If presets were namespaced, references would need full paths like `bg/hero`, and preset-to-preset references from one namespace couldn't transparently reference another without knowing the full path. The global namespace keeps preset references short, readable, and easy to search across your entire project. You can grep for `"preset": "hero-title"` and find every use in half a second.

If you do have a collision, the error message tells you exactly which preset files are conflicting. The fix is simple: rename one of them to something unique.

## Common pitfalls

**Missing presets in the page array.** If a page references a preset in a definition block but doesn't list that preset's path in the top-level presets array, the loader won't find it. You'll get a preset-not-found error. The fix: add the preset's path to the page's presets array. When you get this error, the first thing to check is whether the path is listed.

**Duplicate keys across preset files.** Since all preset keys share one namespace, importing two preset files that define the same key causes one to silently overwrite the other. The loader processes presets in order; the last one wins. If you see unexpected values in a resolved preset -- like a heading coming out with the wrong size -- check for key collisions. Search your preset files for the key and see if it appears in more than one file.

**The array replacement gotcha.** This is the most common surprise. A preset defines an elementOrder with three items: badge, title, description. Your local block also has an elementOrder because you want to reorder the elements. You write an elementOrder with two items: title, description. The result is that you lose the badge element entirely, because arrays replace completely, not merge. If you only wanted to remove the badge and keep the order of everything else, you still need to provide the full array of what you want to keep. Objects merge. Arrays replace. Remember this.

**The recursive merge is your friend.** If the preset defines a definitions map with three elements -- badge, title, description -- and your local block has a definitions key with just one entry (title with different text), they merge key by key. You don't lose the badge and description elements -- they come through from the preset untouched. Your title overrides just the title. This is the behavior you want most of the time, and it's why the system uses recursive merge rather than replace for objects.

**Circular references.** If preset A references preset B and preset B references preset A, the resolver detects the cycle and throws an error with the full chain. This is caught at load time. You'll never see it in production because a page with a circular reference won't load at all. The fix is to break the cycle -- one of the presets should not reference the other, or the reference should go through a third preset.

## Debugging when a preset isn't doing what you expect

Sometimes a preset doesn't produce the result you expected. Here's a troubleshooting checklist.

**Check the page's presets array.** Is the preset path listed? If not, the preset can't load. This is the most common cause of preset-not-found errors.

**Check for key collisions.** Search your entire presets directory for the preset key. Are there multiple files defining the same key? If so, the last one in load order wins. The loader processes presets in the order they appear in the page's presets array, so the last file in the last directory listed wins.

**Check for unintended overrides.** Your local block might have a field that you didn't realize would override the preset. Remember: objects merge (your definitions merge with the preset's definitions key by key), but arrays replace entirely (your elementOrder replaces the preset's elementOrder completely). If an element is missing, check whether your local elementOrder is shorter than the preset's.

**Use the MCP tools.** The probe_preset_usage tool shows every page that references a given preset, with JSON paths to each reference and any override fields set at the use site. This is invaluable for understanding why a particular page looks different from what the preset defines -- you can see exactly what overrides are in play.

## How to extract a new preset

If you find yourself copy-pasting the same definition block across multiple pages, it's time to extract it into a preset. The MCP tool extract_preset does the heavy lifting for you.

You give it three things: the page route where the definition currently lives, the definition key you want to extract, and the preset ID you want to create. The tool pulls the block out of the page, writes it to `content/presets/<category>/<id>.json`, and replaces the inline definition in the page with a preset reference. It validates everything before writing -- if the result wouldn't be valid, it tells you why and doesn't write anything.

After extraction, double-check that the page's presets array includes the path to the new preset file. The tool should handle this, but it's worth verifying.

## How to find where a preset is used

Before editing a shared preset, you need to know what pages depend on it. The MCP tool probe_preset_usage returns every page that references a given preset key, grouped with the JSON paths to each reference and any override fields set at the use site. This is your blast radius check. Run it before changing a preset that multiple pages depend on.

There's also list_unused_presets, which reports presets that no page references. Run this periodically to clean up dead files. An unused preset isn't harmful by itself, but it clutters the namespace and can cause confusion if someone searches for a key and finds a stale definition.

---

Back to [about-these-docs.md](../about-these-docs.md). Architecture context: [data model](../architecture/data-model.md), [pipeline](../architecture/pipeline.md). Related content: [elements and motion](elements-and-motion.md), [sections and backgrounds](sections-and-backgrounds.md), [modules](modules.md).
