// Reference-grounded generation rules — composition patterns worth studying, real
// schema gotchas, mobile-responsiveness lessons, and the per-section workflow for
// turning a measured reference into a net-new page. Every "pattern" here is meant to
// be learned from and re-expressed with original content/tokens — never copied.

export function fieldGotchas(): string[] {
  return [
    "elementGroup children: MUST go inside section:{ elementOrder:[...], definitions:{...} } — NOT at the root level of the group. Root-level elementOrder/definitions on elementGroup are silently ignored by the renderer.",
    "elementLink: field is 'label', NOT 'text'. elementHeading/elementBody use 'text'. elementButton uses 'label'.",
    "elementLink: text color is 'linkDefault', NOT 'color'. 'color' is not a valid field on elementLink.",
    "elementButton navigation: use 'href' directly for link-style buttons. 'action: navigate' + actionPayload also works but href is simpler.",
    "elementButton: set 'level' explicitly (e.g. level:4) to control label typography sizing — it's optional with sane defaults, but explicit is clearer for a hand-tuned hero/CTA.",
    "'border' on contentBlock/sectionColumn IS valid — but it's a STRUCTURED OBJECT { width, style, color }, not a CSS shorthand string. On elements it IS a CSS shorthand string. Use the matching shape for whichever level you're setting it on.",
    "'backdropBlur' is not a flat style field — use 'backdropFilter: \"blur(12px)\"' for inline blur on elements/sections. (effects[].type does support a blur kind — that's a different mechanism.)",
    "elementButton variant: canonical values are 'default' | 'accent' | 'ghost' | 'text'. 'primary'→'accent', 'secondary'→'ghost', 'tertiary'/'link'/'naked'→'text' are accepted ALIASES. Prefer the canonical names directly.",
    "When wrapperFill is set on elementButton: ALWAYS pair with linkDefault set to the button text color — otherwise text contrast against the fill is undefined.",
    "elementGroup placeholder slots: 'aspectRatio' alone does not set a height if the parent collapses — set explicit 'height' (e.g. 'clamp(300px, 40vw, 640px)') for hero-scale placeholders, same as you would for a real hero image.",
    "fontSize on elementHeading/elementBody/elementLink: CANNOT be an array — use clamp().",
    "lineHeight on any element: CANNOT be an array — use a single unitless float.",
    "Use keyed element definitions (elementOrder + definitions) for every section. Never use inline elements[] arrays.",
  ];
}

export function compositionPatternsToStudy(): string[] {
  return [
    "These are PATTERNS the reference uses well — study the shape of each, then build " +
      "your own version with original content and this project's elements/tokens. None " +
      "of these names a thing to copy; each names a COMPOSITIONAL IDEA worth re-expressing:",
    "",
    "  Hero — label + display heading + lead body + CTA row + hero visual, generally " +
      "centered or left-anchored. The visual almost always needs an explicit height on " +
      "its parent or it collapses.",
    "  Logo bar / social proof strip — a horizontal row of evenly-sized marks. The " +
      "RHYTHM (count, spacing, size) is the thing worth matching; the marks themselves " +
      "are placeholders here.",
    "  Feature row (the workhorse pattern) — a label/heading/body cluster paired beside " +
      "a wide visual at the same vertical level. DEFAULT TO ROW for this shape:",
    "      contentBlock: flexDirection: ['column','row'], alignItems:'center', gap: ['2rem','4rem']",
    "      child 1 (text)   — elementGroup flex: ['1 1 100%','0 0 42%'], column, gap:'1rem'",
    "      child 2 (visual) — elementGroup flex: ['1 1 100%','1 1 52%'], placeholder per placeholderImageProtocol",
    "    Reserve COLUMN for sections whose text genuinely spans full width above a " +
      "full-width visual — that's the exception, not the default. If you're reaching " +
      "for column out of uncertainty about the row recipe, that's a sign to re-derive " +
      "it from the reference's composition rather than fall back.",
    "  Card grid (pricing tiers, team grids, feature tiles) — equal repeating columns. " +
      "Use sectionColumn with columns:[1,N] rather than elementGroup+flexWrap.",
    "  Testimonial / quote block — elementGroup containing quote elementBody + author " +
      "elementBody + company elementBody, optionally with href.",
    "  Changelog / link-card list — elementGroup with href, containing heading + body + date.",
    "  Announcement pill / chip — small elementGroup with fill + borderRadius wrapping a " +
      "short elementLink or elementBody.",
    "  Section label with arrow ('1.0 Intake →' style) — elementLink with 'label', not elementBody.",
  ];
}

export function pageStructureRules(): string[] {
  return [
    "Set id on every section AND every element to match its key in sectionOrder/elementOrder exactly. The renderer prefers a stable author-set id for its React key; content-derived hashes collide when two blocks share content.",
    "presets array: call list_presets to see what's available and include only what the page actually references — pick presets because they fit THIS page's content, the same judgment call as any other generation task. Do NOT hardcode preset names that haven't been confirmed to exist.",
    "Title field: write an original title for the new page's actual subject — do not reuse or lightly edit the reference's <title> from pass1-layout.json.",
    "Add motionTiming.entrancePreset to hero elements (blurIn or slideUp). Stagger children with staggerChildren: 0.08 — this project's normal motion vocabulary, not a steal-specific add-on.",
    "Card grids (equal repeating columns): use sectionColumn with columns:[1,N] rather than elementGroup+flexWrap.",
    "Fonts: use this project's EXISTING font stack (apps/web/src/app/fonts/config.ts / host-config slot bindings). Do not load the reference's custom webfont — match its WEIGHT CONTRAST and SIZE RATIOS with fonts this project already has, per typeLanguageReferenceProtocol.",
  ];
}

export function mobileResponsiveness(): string[] {
  return [
    "SOURCE OF TRUTH: `responsiveDiff` (top-level field on this prompt object). It is a " +
      "COMPUTED, MEASURED comparison of pass1-desktop-layout.json (1440px) vs " +
      "pass1-mobile.json (375px) — built at prompt-generation time. Read it for the " +
      "KIND of proportional shift a well-designed page makes when it reflows, then " +
      "apply a comparable shift to YOUR section's own values:",
    "  responsiveDiff.guidance[]            — plain-English summary of every measured shift; read this first",
    "  responsiveDiff.viewportRatio         — e.g. '375/1440 (26%)' — roughly how much a desktop measurement should contract on mobile",
    "  responsiveDiff.sectionsMatchedByHeading — true: perSectionDiffs[] has a 1:1 entry per logical section. false: SPA/virtualized page — fall back to globalContainerDiff + typeSpecimenDiffs[]",
    "  responsiveDiff.perSectionDiffs[]     — when matched: { heading, changed{}, suggestedResponsiveArrays{}, childWidthShift }",
    "  responsiveDiff.globalContainerDiff   — the page's largest scroll wrapper, diffed at both viewports",
    "  responsiveDiff.typeSpecimenDiffs[]   — global <h1>/<h2>/<p>/<btn> measured at both viewports",
    "",
    "Read `suggestedResponsiveArrays` as a WORKED EXAMPLE of the shape and proportion of " +
      "a good responsive array — e.g. { flexDirection: ['column','row'], padding: " +
      "['40px 16px','96px 46px'], contentWidth: ['100%','1344px'] } — then write YOUR " +
      "OWN tuples with comparable proportions for your section's actual values. The " +
      "numbers are theirs; the proportional RELATIONSHIP between mobile and desktop is " +
      "the lesson worth carrying over.",
    "",
    "WORKS as responsive arrays (mobile first, desktop second):",
    "  flexDirection, alignItems, justifyContent, gap, padding, width, contentWidth, height, flex — on contentBlock and elementGroup",
    "  columns — on sectionColumn",
    "",
    "NEVER use responsive arrays for fontSize/lineHeight — use clamp() instead, anchored " +
      "so the floor stays comfortably above responsiveDiff.typeSpecimenDiffs[] mobile measurements.",
    "",
    "HARD RULE regardless of inspiration: contentWidth/width on the OUTERMOST " +
      "contentBlock of EVERY section MUST resolve to something that fits in " +
      "responsiveDiff.mobileViewportWidth (375px) — '100%' is always safe. Repeating a " +
      "hardcoded desktop pixel value in the mobile slot is exactly the bug that clips " +
      "content off-screen, independent of whether the page is original or cloned.",
    "",
    "If responsiveDiff shows the SAME value for a property at both viewports → emit a " +
      "plain string, not an array. Only emit responsive arrays for properties " +
      "responsiveDiff actually flagged as `changed`.",
  ];
}

export function perSectionWorkflow(stateDir: string): string[] {
  return [
    "For each feature section you're designing (i.e. not the page's own nav/footer, if any):",
    `  1. STUDY the reference's composition: Read ${stateDir}/section-N-<matching-slug>.png ` +
      "— this is reference material for HOW the section is composed, not content to reproduce.",
    "  2. IDENTIFY which side carries the text cluster (label/heading/body) and which " +
      "carries the visual, and at what rough proportions (40/60? 50/50?).",
    "  3. DECIDE your layout direction using the ROW-vs-COLUMN rule in " +
      "compositionPatternsToStudy — DEFAULT TO ROW when text sits beside a visual at " +
      "the same vertical level; COLUMN only when text genuinely spans full width above it.",
    "  4. WRITE original content for this section (see netNewContentProtocol) that fits " +
      "the SAME structural role the reference's section plays in its narrative arc — " +
      "e.g. if section 3 is 'how the product handles scale,' yours doesn't have to be " +
      "about scale, but it should carry comparable narrative weight at that position.",
    "  5. BUILD the section JSON:",
    "     - Layout: the recipe from compositionPatternsToStudy that matches your decision in step 3",
    "     - Typography: typeLanguageReferenceProtocol — this project's type system, tuned to the measured ratios",
    "     - Color: colorLanguageReferenceProtocol — this project's tokens, tuned to the measured relationships",
    "     - Visual: placeholderImageProtocol — sized from the matching pass2-visual-inventory.json entry",
    "  SKIP step 5 for any section where step 1 found no usable composition reference — " +
      "design it from the structural role alone in that case, and note the gap in your final report.",
  ];
}
