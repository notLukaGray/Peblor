// Reference-grounded generation protocols — how to translate MEASURED design-language
// data (typography, color, composition, imagery) from a real reference site into a
// net-new, original Peblor page. Each protocol is a function returning its instruction
// array, accepting template variables as parameters.
//
// FRAMING: passes 1-3 measure what a well-designed reference site does — its type
// scale, color relationships, spacing rhythm, layout patterns, responsive behavior.
// That measured data is a QUALITY BAR, not a source to reproduce. Pass 4 studies it
// and designs something ORIGINAL that clears a comparable bar, using THIS project's
// own idioms — the same catalog guidance, presets, and tokens any other generation
// task would reach for. Nothing about the reference's brand identity (its colors,
// copy, fonts, logo, imagery) is meant to survive into the output.

export function referenceFramingForInspiredGeneration(): string[] {
  return [
    "CONTEXT: passes 1-3 measured a real, well-designed reference site — its type " +
      "scale, color relationships, spacing rhythm, and layout patterns. That measured " +
      "data is your QUALITY BAR for this generation, not a source to reproduce.",
    "",
    "THE GOAL: design and build a net-new, ORIGINAL page that clears a comparable bar " +
      "— comparable rhythm, hierarchy, contrast, and polish — using THIS project's own " +
      "idioms: presets, theme tokens (var(--pb-*), color-mix()), light/dark mode, and " +
      "the general catalog guidance (dom-to-peblor-mapping.md, section-catalog.md, " +
      "SKILL.md) you'd reach for on any other generation task. Nothing here overrides " +
      "that guidance — this prompt only adds 'and here is a measured bar to study first.'",
    "",
    "WHAT TO CARRY OVER FROM THE REFERENCE (the abstract pattern, never the literal value):",
    "  ✓ Type-scale RATIOS — how much bigger is the display heading than the section " +
      "heading than the body? Reproduce that proportional rhythm with this project's " +
      "type presets/tokens — not the reference's exact px/weight/family strings.",
    "  ✓ Color RELATIONSHIPS — the contrast between text and surface, how many distinct " +
      "fills the page leans on, whether accents read saturated or muted. Express the " +
      "RELATIONSHIP via var(--pb-*)/color-mix(), never the reference's literal rgb().",
    "  ✓ Spacing RHYTHM — the ratio between section padding, element gaps, and content " +
      "width; how generous or tight the page feels. Apply that rhythm with this " +
      "project's own spacing conventions.",
    "  ✓ Layout PATTERNS — row-vs-column choices, how feature sections pair text with " +
      "visuals, how the page reflows mobile-to-desktop (see responsiveDiff below).",
    "  ✓ Structural AMBITION — section count, narrative arc, density of detail. A rich, " +
      "considered reference deserves a rich, considered original in return — not a " +
      "thin echo of it.",
    "",
    "WHAT NEVER CROSSES OVER (this is what makes it a NEW page, not a clone):",
    "  ✗ The reference's literal copy, headlines, brand name, product name, or claims — " +
      "see netNewContentProtocol",
    "  ✗ The reference's literal colors as hardcoded rgb()/hex — translate the " +
      "RELATIONSHIP into this project's tokens instead — see colorLanguageReferenceProtocol",
    "  ✗ The reference's exact font family or font files — use this project's existing " +
      "font stack and match the WEIGHT CONTRAST / SIZE RATIOS with your own fonts — " +
      "see typeLanguageReferenceProtocol",
    "  ✗ The reference's logo, product screenshots, photography, or any other asset — " +
      "every visual slot is a PLACEHOLDER — see placeholderImageProtocol. Pass 2 " +
      "deliberately produced a DESCRIPTIVE inventory, not a downloaded asset set.",
    "  ✗ Reaching for a preset/token/layout 'because it looks like theirs' rather than " +
      "because it serves THIS page's content — pick things the same way you would for " +
      "any other generation task.",
    "",
    "Self-check before you write anything: if you find yourself about to type an " +
      "rgb()/hex string, a foreign font-family name, a sentence that paraphrases their " +
      "copy, or a path into a downloaded-asset directory — stop. You've drifted from " +
      "'inspired by' into 'reproducing,' which is exactly what this generation is not for.",
  ];
}

export function typeLanguageReferenceProtocol(): string[] {
  return [
    "pass3.scale is the reference's MEASURED type system — four buckets " +
      "(display/section/label/body), each with fontSize, fontWeight, letterSpacing, " +
      "lineHeight. Read it as a STUDY of proportion, not a palette to copy:",
    "",
    "  1. RATIOS — compute display.fontSize ÷ section.fontSize ÷ body.fontSize ÷ " +
      "label.fontSize. These jumps are the system's rhythm. Apply a comparable " +
      "proportional rhythm to whatever type scale this project's catalog/presets give you.",
    "  2. WEIGHT CONTRAST — how many steps separate the display weight from the body " +
      "weight? A reference pairing 510 with 400 reads SUBTLE; one pairing 700 with 400 " +
      "reads STRONG. Match the level of contrast, not the numbers.",
    "  3. LINE-HEIGHT CHARACTER — tight (~1.0-1.1) reads confident/display-ish; loose " +
      "(~1.5-1.7) reads readable/editorial. Match the character to each section's role, " +
      "using values this project's type system already supports.",
    "  4. LETTER-SPACING DIRECTION — negative tracking on display type (tight, modern) " +
      "vs. positive tracking on labels (airy, structured) are DESIGN DECISIONS worth " +
      "carrying over as decisions — express them through this project's own type presets.",
    "",
    "Then build with this project's actual typography system, exactly as you would for " +
      "any other page:",
    "  - elementHeading/elementBody with this project's type presets or tokens.",
    "  - If nothing fits, set explicit values that honor the RATIOS and CONTRAST you " +
      "measured — using fonts and weights this project already loads.",
    "",
    "DO NOT: paste pass3's literal fontFamily, fontSize px value, fontWeight string, " +
      "letterSpacing, or color into the output — those describe THEIR system. Yours " +
      "should read as considered at a comparable level, not identical to theirs.",
  ];
}

export function colorLanguageReferenceProtocol(): string[] {
  return [
    "pass3.textColors / sectionFills / primaryButton / ghostButton describe the " +
      "reference's color SYSTEM — read it for its STRUCTURE, never its swatches:",
    "",
    "  • PALETTE SIZE — how many distinct fills does the page lean on across its " +
      "sections? Two? Five? A restrained palette (one or two surfaces plus an accent) " +
      "reads confident; a richer one needs care to stay coherent. Match that level of " +
      "restraint or richness with this project's own surfaces.",
    "  • TEXT CONTRAST — how far apart do primary and secondary text sit in value? " +
      "Both near-white on near-black? Or a wider spread? That RELATIONSHIP — not the " +
      "specific rgb() — is what reads as 'considered' to a viewer.",
    "  • BUTTON HIERARCHY — is the primary action a high-contrast solid fill or a " +
      "low-contrast ghost/outline? Which gets the visual weight, primary or secondary?",
    "",
    "Then build with this project's actual color system, exactly as you would for any " +
      "other page:",
    "  - var(--pb-primary), var(--pb-secondary), var(--pb-on-secondary), color-mix(in " +
      "oklab, var(--pb-on-secondary) N%, transparent) — the normal token vocabulary.",
    "  - Reproduce the STRUCTURE you measured (restrained vs. rich, high- vs. " +
      "low-contrast) with these tokens, so the page adapts correctly across light/dark " +
      "— something the reference's hardcoded colors can't do, and a place where your " +
      "version can be legitimately BETTER than the thing that inspired it.",
    "",
    "DO NOT: paste a literal rgb()/rgba()/hex string copied from pass3 anywhere in the output.",
  ];
}

export function compositionLanguageReferenceProtocol(): string[] {
  return [
    "pass1.backgroundLayers[] shows HOW the reference builds atmosphere — flat color? " +
      "layered gradients? a glow pulsing behind the hero? Read it for the COMPOSITIONAL " +
      "IDEA, never the literal layer recipe:",
    "",
    "  • Flat single fill → a confident, minimal page leaning on type and spacing for " +
      "interest. If you go this route, your type and spacing need to carry MORE weight.",
    "  • Layered gradients/glows → atmosphere used to add depth and pull the eye toward " +
      "the hero/CTA. Build your OWN layered backgroundVariable that does the same JOB " +
      "— draw the eye, add depth — using this project's tokens and bg presets. Call " +
      "list_bg_types / list_presets first, exactly like any other generation task.",
    "  • Motion (pulsing glows, parallax) → atmosphere that rewards lingering. Reach " +
      "for this project's motion presets (content/framer-motion/) the normal way.",
    "",
    "Build with { type: 'backgroundVariable', layers: [...] } using this project's " +
      "tokens/presets — or a named bg preset if list_bg_types/list_presets surfaces one " +
      "that fits the mood, the same judgment call you'd make generating any other page.",
    "",
    "DO NOT: paste a literal cssValue, fill string, or gradient stop copied from pass1 anywhere in the output.",
  ];
}

export function placeholderImageProtocol(): string[] {
  return [
    "ABSOLUTE RULE: every visual slot on this page is a PLACEHOLDER. Nothing is " +
      "downloaded from the reference site, nothing is copied from it, nothing served " +
      "from this project's domain originated on theirs. Pass 2 deliberately produced a " +
      "DESCRIPTIVE inventory (pass2-visual-inventory.json) instead of a downloaded asset " +
      "set — that choice is load-bearing, don't work around it by fetching images yourself.",
    "",
    "For each entry in pass2-visual-inventory.json you have: role (hero / content / icon " +
      "/ logo / decorative), an approximate aspect ratio, the section it belongs to, and " +
      "a short description of WHAT KIND of image occupies that slot — e.g. 'wide " +
      "product-UI screenshot, dashboard with charts' or 'square portrait in a circular crop'.",
    "",
    "Build each slot as an elementGroup placeholder:",
    "  1. Reserve the CORRECT proportions — width/aspectRatio matching the inventory " +
      "entry — so the page reflows exactly as it would with a real image dropped in later.",
    "  2. Use this project's surface tokens for the placeholder fill:",
    "       { type: 'elementGroup', width: '100%', aspectRatio: '<from inventory entry>',",
    "         fill: 'color-mix(in oklab, var(--pb-on-secondary) 6%, transparent)',",
    "         borderRadius: '<match this section's card radius>',",
    "         section: { elementOrder: ['lbl'], definitions: { lbl: { type: 'elementBody',",
    "           text: '<short production note drawn from the inventory description, e.g. \"Product dashboard — placeholder\">',",
    "           color: 'color-mix(in oklab, var(--pb-on-secondary) 35%, transparent)' } } } }",
    "  3. Keep the label SHORT and PRACTICAL — a note for whoever drops in the final " +
      "asset later, not page copy a visitor is meant to read as content.",
    "",
    "Hero visual: same placeholder pattern, sized from the inventory's aspect ratio and " +
      "the responsiveDiff measurements. Set explicit height/minHeight so it never " +
      "collapses to 0px — width:'100%' with no height collapses if the parent has none. " +
      "(That gotcha is real regardless of whether the slot holds a placeholder or a " +
      "final image — it's a Peblor layout fact, not a steal-specific one.)",
    "",
    "Logo bar / icon row: a row of evenly-sized placeholder rectangles communicates the " +
      "RHYTHM of a logo strip without reproducing anyone's mark.",
    "",
    "Why a placeholder is strictly better here than a downloaded image: it can't 404, " +
      "can't arrive at the wrong crop, can't bake someone else's typography into your " +
      "page, and can't leak a foreign brand identity into something whose entire point " +
      "is to be original. It's also exactly the pattern a real content author reaches " +
      "for before final assets land — exercising it here is useful in its own right.",
  ];
}

export function netNewContentProtocol(sitename: string): string[] {
  return [
    `pass1-layout.json captures ${sitename}'s actual headlines, body copy, nav labels, ` +
      "and CTAs. Use it ONLY as a STRUCTURAL reference for questions like:",
    "  • How long is a typical hero headline — three words, or a full sentence?",
    "  • How many feature sections does a page like this carry, and how does the " +
      "narrative arc move (problem → solution → proof → CTA, or something else)?",
    "  • How direct vs. suggestive is the copy register — does it explain, or tease?",
    "  • What's the information density per section — one big claim, or several supports?",
    "",
    "Then WRITE ORIGINAL COPY for a page about a different, plausible subject — one " +
      "that fits this project's actual context (its work, its voice, its audience) — " +
      "and write headlines, body, labels, and CTAs from scratch in that register.",
    "",
    "DO NOT: copy a sentence, headline, company name, product name, or tagline from " +
      "pass1-layout.json into the output, even reworded. If a string you're about to " +
      "write would be recognizable as 'basically their hero headline' — rewrite it " +
      "from the underlying IDEA outward, not from their phrasing inward.",
  ];
}
