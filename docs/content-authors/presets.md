# Presets

Here is the problem presets solve. You have a beautiful heading style -- big, bold, with a gradient underline and a slide-up entrance. You use it on your homepage hero, your about page, your services page, and three different blog layouts. Every one of those pages has the exact same heading JSON copy-pasted in.

Then someone decides the underline needs a different color.

Now you get to find every copy and change it. Good luck.

Presets are the answer. A preset is a reusable definition block stored in its own JSON file. Pages import presets, and the system merges them in at load time. Change the preset file, and every page referencing it picks up the change. Need one page to be different? Override just the fields you want to change on that page and leave the preset alone. The preset handles the common stuff. The page handles what makes it unique.

This is the most important mechanism in the content system. Understand it, and you can maintain a hundred pages with your eyes closed. Ignore it, and you're playing whack-a-mole with copy-pasted JSON.

## Where presets live

Presets live in `content/presets/`, organized by what they do:

- **bg/** -- Background definitions. Solids, gradients, images, videos, noise textures, aurora effects. If it goes behind content, it's here.
- **card/** -- Card layouts and patterns. Feature cards, stat cards, bento grids, preview panels, testimonials. These are full element structures you drop into a page and fill with your content.
- **demo/** -- Demo content for the showcase site. Hero sections, scroll bodies, navigation headers. Great examples to study because they show presets at full power -- a demo hero preset defines the whole hero structure and leaves you to override just the text.
- **layout/** -- Column and flow layouts. Two-column editorial, three-column features, hero stacks, KPI matrices, mixed-span grids. Need a specific arrangement of columns? Look here first.
- **pages/** -- Full-page templates. Presets for work-specific pages that combine multiple sections into a complete page structure.
- **player/** -- Player UI controls. Transport bars, seek clusters, state indicators, volume controls. These get composed into video and audio player modules.
- **type/** -- Typography presets. Headings (h1 through h6 at various sizes), body text (standard, fine, lead, mono, serif), labels, marquees, counters, rich text, effect headings. The most-used category, because every page needs text.
- **ui/** -- Interface elements. Buttons, links, panels. The building blocks of interactive bits.
- **video/** -- Video controls. Play, pause, seek, mute, volume, fullscreen, time display. Each one is a single control, smaller and more focused than the player-level presets.

Each category has subdirectories for further organization -- `type/core/`, `type/effects/`, `ui/button/`, `video/control/`, and so on. But the subdirectory structure is just for your sanity. The loader doesn't care how deep you nest. It cares about filenames.

## How pages import presets

Every page has a top-level field called `presets`. It's an array of paths relative to the presets directory. A page might say it needs `["bg", "type/core", "card", "demo"]` -- and the system goes and loads every JSON file it finds in those directories.

This is how a simple 404 page looks:

```json
{
  "presets": ["bg"],
  "definitions": {
    "bg": { "preset": "bg-solid" }
  }
}
```

One line in the `presets` array loads the entire `bg/` directory. The page then references a specific preset by its key -- `bg-solid`. The loader finds it, merges it in, and the page has a background.

Files and directories both work in the `presets` array. Point it at a file to load a single preset. Point it at a directory to load everything inside. The loader walks each referenced file or directory, reads every JSON file, and collects everything into a single flat namespace keyed by filename (minus the `.json` extension).

A page can also declare inline presets -- a `preset` field at the page level containing key-value pairs of preset definitions that don't live in separate files. This is useful for one-off overrides that you don't want to create a whole file for.

## How presets compose

When a definition block has a `"preset": "some-key"` field, the system merges the preset's content into the block. The rules come from something called JSON merge patch (RFC 7396), but you don't need to read a spec. You just need to know three things.

**Objects merge recursively.** If both the preset and the local block have a `definitions` key, the system merges them key by key. Local keys override preset keys at every nesting level. This is how you inherit a whole section from a preset but swap out a single heading's text. You don't redefine the entire section. You override the one thing you want to be different, and everything else comes through from the preset untouched.

**Arrays replace entirely.** If the preset provides an `elementOrder` array with three items and your local block has one with two items, the local array wins completely. No concatenation. No smart diffing. No "well, maybe I'll keep that third item." The local array replaces the preset's array, full stop. This sounds harsh, but the alternative is a nightmare where you're trying to reorder elements and the merge keeps fighting you. If you need a different order, provide the full order.

(There is exactly one exception: the `elements` array inside a definition block appends rather than replaces. This is a deliberate design choice -- elements arrays are additive by nature. But for everything else -- `elementOrder`, lists of things, any other array you can think of -- the local version wins completely. Remember: objects merge, arrays replace.)

**Scalar values are last-write-wins.** Whatever the local block sets for a text field, a number, or a boolean overrides the preset. Whatever the preset sets fills in what the local block didn't specify. The preset says `"variant": "display"`. Your local block doesn't mention variant. You get display. Your local block says `"variant": "section"`. You get section.

### A walkthrough

The demo hero preset defines a hero section with multiple elements -- a badge, a large heading, a description, and a couple of buttons. The preset provides the layout (the element order), the spacing, the backgrounds, and the entrance motion for each element.

Now imagine a page that uses this hero preset. The page references the preset on a section block, then overrides just the text inside the nested definitions. The badge text is different. The heading says something specific to that page. The description is unique.

The structure doesn't change. The element order stays. The spacing stays. The entrance motion -- fade in with stagger -- stays exactly what the preset defined. The page only changed the words.

This is the pattern. The preset provides the structure and behavior. The page overrides only what makes it unique. Later, when you change the preset's entrance animation, every page using it picks up the new animation automatically. The pages that only overrode text keep their new text but get the new animation. The pages that also overrode the entrance animation keep their override.

### Presets referencing presets

A preset can reference another preset. A heading preset might reference a type preset for base typography styles and add its own color and motion on top. The resolver walks the chain -- page to preset, preset to preset -- merging at each step.

If it finds a circular reference (preset A references preset B which references preset A), it throws immediately with an error listing the full chain. Circular references are always a mistake, and the system catches them at load time, not at render time when they'd be much harder to debug.

## Naming conventions

Preset keys follow a loose scope-category-variant pattern. Look at any preset file and you'll see it:

- `type-h1-display` -- heading, h1 level, display variant. Big and bold.
- `type-h5-meta` -- heading, h5 level, meta variant. Small labels for metadata.
- `type-body-standard` -- body text, standard size. Your everyday paragraph.
- `bg-solid` -- background, solid color. Simple but everywhere.
- `bg-aurora` -- background, aurora variant. Multiple soft gradient stops for an atmospheric effect.
- `card-feature-basic` -- card, feature category, basic variant. Icon, heading, description.
- `card-stat-row` -- card, stat category, row variant. Metrics and KPIs in a row.
- `player-controls-transport-full` -- player, controls, full transport bar.
- `video-controls-play` -- video control, play button. Single-purpose.
- `demo-hero` -- demo content, hero section. The full package.
- `composition-column-2col-editorial` -- layout, column composition, two-column editorial.
- `layout-flow-hero-stack` -- layout, flow composition, hero stack.

The first segment is the broad scope. The second segment narrows within that scope. The third is the specific variant.

A few presets play fast and loose with the convention -- you'll find `type-link-*` files living under `ui/link/` and `btn-*` files under `ui/button/`. This is fine. The naming convention is a guide, not a law. The system doesn't care about your naming -- it cares that every key in the entire presets namespace is globally unique.

## The global uniqueness rule

Every preset key across every category and every page must be unique. There is no namespacing. A preset called `hero` in `bg/hero.json` and a preset called `hero` in `card/hero.json` will collide, and the last one loaded silently wins.

This sounds restrictive. The alternative is worse. If presets were namespaced by directory, references would need full paths like `bg/hero`, and a preset in one directory couldn't transparently reference a preset in another without knowing the full path. The global namespace keeps preset references short, readable, and easy to search. You can grep for `"preset": "hero-title"` and find every use in half a second.

If you do have a collision, the loader prints a warning telling you exactly which files are conflicting. The fix is simple: rename one of them.

## Common mistakes

**Missing presets in the page array.** A page references a preset but doesn't list that preset's path in the top-level `presets` array. The loader can't find it. You get a preset-not-found error. The fix: add the path. When you get this error, check the `presets` array first.

**Duplicate keys across preset files.** Two preset files define the same key. The loader processes presets in order -- the last one wins silently. If you see unexpected values -- a heading coming out with the wrong size -- search your preset files for the key and see if it appears in more than one file.

**The array replacement gotcha.** This is the most common surprise. A preset defines an `elementOrder` with three items: badge, title, description. Your local block also has an `elementOrder` because you want to reorder things. You write an `elementOrder` with two items: title, description. You now have a hero section with no badge element, because arrays replace entirely. If you only wanted to remove the badge and keep the order of everything else, you still need to provide the full array of everything you want to keep. Objects merge. Arrays replace. Say it out loud.

**The recursive merge is your friend.** The preset defines a `definitions` map with three elements -- badge, title, description. Your local block has a `definitions` key with just one entry (title with different text). They merge key by key. You don't lose the badge and description. They come through from the preset untouched. Your title overrides just the title. This is the behavior you want most of the time, and it's why the system uses recursive merge rather than replace for objects.

**Circular references.** Preset A references preset B. Preset B references preset A. The resolver catches this at load time and throws an error with the full chain. You'll never see it in production because a page with a circular reference won't load at all. The fix: break the cycle.

## Before you edit a preset

Editing a shared preset is like changing the foundation of a house. If you get it right, the whole structure benefits. If you get it wrong, everything shifts.

Before you touch a preset that multiple pages depend on, run `probe_preset_usage`. This tool returns every page that references the preset, with JSON paths to each reference and any override fields set at the use site. This is your blast radius check. It tells you exactly which pages will be affected by your change and what those pages are overriding.

Ask yourself these questions before editing:

- **Who uses this preset?** Run `probe_preset_usage` first. Always.
- **What are they overriding?** If pages override specific fields, make sure your change doesn't silently conflict with those overrides. Remember: local overrides win. If you change a preset field that a page already overrides locally, the page won't see your change -- it'll keep using its override. That might be fine. Or it might mean the page is holding onto an old override it no longer needs.
- **What's the naming?** If you're adding a new field, follow the existing naming patterns. Don't call it `bgColour` when everything else uses `color`.
- **Is there an unused preset you can repurpose?** Run `list_unused_presets` to find presets that no page references. You might save yourself the trouble of creating a new file.

## How to create a new preset

Find yourself copy-pasting the same definition block across multiple pages? Time to extract it.

The `extract_preset` tool does this for you. Give it three things: the page route where the definition currently lives, the definition key you want to extract, and the preset ID you want to create. The tool pulls the block out of the page, writes it into the presets directory, and replaces the inline definition in the page with a preset reference. It validates everything before writing -- if the result wouldn't be valid, it tells you why and leaves your files untouched.

After extraction, double-check that the page's `presets` array includes the path to the new preset file. The tool should handle this, but it's worth verifying.

Choose a name that fits the scope-category-variant pattern, and make sure it doesn't collide with anything already in the presets namespace. A quick grep for the name across `content/presets/` will tell you.

## Debugging when a preset isn't doing what you expect

Sometimes a preset doesn't produce the result you expected. Here is a troubleshooting checklist.

**Check the page's presets array.** Is the preset path listed? If not, the preset can't load. This is the most common cause of preset-not-found errors.

**Check for key collisions.** Search the entire presets directory for the key. Are there multiple files defining it? The last one in load order wins.

**Check for unintended overrides.** Your local block might have a field you didn't realize would override the preset. Objects merge. Arrays replace. If an element is missing, check whether your local `elementOrder` is shorter than the preset's.

**Use probe_preset_usage.** This tool shows every page that references a preset, with JSON paths to each reference and any override fields. Invaluable for understanding why a page looks different from what the preset defines.

**Run list_unused_presets.** This reports presets that no page references. Run it periodically to clean up dead files. An unused preset isn't harmful, but it clutters the namespace and can cause confusion if someone searches for a key and finds a stale definition.

---

Back to [about-these-docs.md](../about-these-docs.md). Architecture context: [data model](../architecture/data-model.md), [pipeline](../architecture/pipeline.md). Related content: [elements and motion](elements-and-motion.md), [sections and backgrounds](sections-and-backgrounds.md), [modules](modules.md).
