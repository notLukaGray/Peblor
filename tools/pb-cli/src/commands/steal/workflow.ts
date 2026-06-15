// Stolen-page generation workflow — pre-generation setup, write steps, validation loop,
// and validation gate. Extracted from steal-prompts-generate.ts.

export function preGenerationSetup(stateDir: string): Array<Record<string, unknown>> {
  return [
    {
      label: "read-all-data-files",
      note: `Read ALL FIVE data files before designing any section JSON:\n  1. Read ${stateDir}/pass1-layout.json — sections[], backgroundLayers[], allImages[], allHeadings[]\n  2. Read ${stateDir}/pass1-desktop-layout.json — per-section desktop flexDirection/gap/padding/children (the diff against mobile is ALREADY COMPUTED at responsiveDiff)\n  3. Read ${stateDir}/pass1-mobile.json — same structure at 375px (also already diffed into responsiveDiff)\n  4. Read ${stateDir}/pass2-visual-inventory.json — images[], logoBars[], icons[] — DESCRIPTIVE entries only, no downloaded files\n  5. Read ${stateDir}/pass3-typography.json — scale{}, textColors{}, primaryButton, ghostButton\n  Do this NOW before any generation work.`,
    },
    {
      label: "apply-responsive-diff",
      note: [
        "DO NOT re-derive the desktop-vs-mobile diff yourself — it has ALREADY BEEN COMPUTED and is",
        "sitting in this prompt object at `responsiveDiff` (top level, sibling of `preGenerationSetup`).",
        "It was built by actively comparing pass1-desktop-layout.json (1440px) against pass1-mobile.json",
        "(375px) at prompt-build time — every number in it is a MEASURED value from the live page.",
        "",
        "  responsiveDiff.guidance[]            — plain-English summary of every measured shift; read this first",
        "  responsiveDiff.viewportRatio         — e.g. '375/1440 (26%)' — roughly how much a desktop measurement should contract on mobile",
        "  responsiveDiff.sectionsMatchedByHeading — true: perSectionDiffs[] has a 1:1 entry per logical section. false: SPA/virtualized page — fall back to globalContainerDiff + typeSpecimenDiffs[]",
        "  responsiveDiff.perSectionDiffs[]     — when matched: { heading, changed{}, suggestedResponsiveArrays{}, childWidthShift }",
        "  responsiveDiff.globalContainerDiff   — the page's largest scroll wrapper, diffed at both viewports",
        "  responsiveDiff.typeSpecimenDiffs[]   — global <h1>/<h2>/<p>/<btn> measured at both viewports",
        "",
        "Read `suggestedResponsiveArrays` as a WORKED EXAMPLE of the shape and proportion of",
        "a good responsive array — e.g. { flexDirection: ['column','row'], padding:",
        "['40px 16px','96px 46px'], contentWidth: ['100%','1344px'] } — then write YOUR OWN",
        "tuples with comparable proportions for your section's actual values. The numbers",
        "are theirs; the proportional RELATIONSHIP between mobile and desktop is the",
        "lesson worth carrying over.",
        "",
        "Only emit a responsive array for a property responsiveDiff actually flagged as changed.",
      ].join("\n"),
    },
    {
      label: "study-visual-inventory",
      note: [
        `Read ${stateDir}/pass2-visual-inventory.json end to end. This is a DESCRIPTIVE`,
        "manifest — role, sectionSlug, aspectRatioHint, and a short description of WHAT KIND",
        "of image occupies each slot (e.g. 'wide product-UI screenshot, dashboard with charts'",
        "or 'square portrait in a circular crop'). There are NO files to look at — every",
        "entry here becomes a PLACEHOLDER in your output, sized and described from this",
        "data, per placeholderImageProtocol.",
        "",
        "For each entry, write down: which section it belongs to, its role (hero/content/",
        "icon/logo/decorative), its aspect ratio, and whether it sits beside text (narrower",
        "panel) or spans full width — that's what determines your row-vs-column layout call",
        "for that section, alongside the composition pattern from compositionPatternsToStudy.",
        "",
        "logoBars[] and icons[] entries describe RHYTHM (count, approx size, spacing) —",
        "build evenly-sized placeholder rectangles that communicate that rhythm, never",
        "anyone's actual mark.",
      ].join("\n"),
    },
    {
      label: "build-section-design-notes",
      note: [
        "For each feature section, write down BEFORE building its JSON:",
        "  • narrative role (what job does this section do in the page's arc — proof? feature? CTA?)",
        "  • layout direction (row/column) and rough text:visual proportion, from study-visual-inventory + compositionPatternsToStudy",
        "  • the ORIGINAL idea you'll write copy about for this section — see netNewContentProtocol",
        `This sets you up to move straight into perSectionWorkflow without re-reading ${stateDir} mid-build.`,
      ].join("\n"),
    },
  ];
}

export function writeSteps(
  pageDir: string,
  route: string,
  url: string
): Array<Record<string, unknown>> {
  return [
    {
      label: "create-page-dir",
      tool: "Bash",
      command: `mkdir -p ${pageDir}`,
    },
    {
      label: "write-page-json",
      tool: "Write",
      filePath: `${pageDir}/index.json`,
      note: "Write the validated Peblor page JSON — a net-new, original page grounded in the measured reference data, not a clone of it.",
    },
    {
      label: "write-steal-meta",
      tool: "Write",
      filePath: `${pageDir}/stealMeta.json`,
      note: `Write: { "sourceUrl": "${url}", "stolenAt": "<today ISO date>", "mode": "reference-grounded-original" }. Do NOT include fontsUsed/fontLinks — this page uses this project's own font stack, never the reference's webfont.`,
    },
    {
      label: "steal-split",
      tool: "Bash",
      command: `npx tsx tools/pb-cli/src/index.ts steal-split ${route} --json`,
      note: "Splits inline sections into sidecar files.",
    },
  ];
}

export function validateLoop(pageDir: string): string[] {
  return [
    `1. Write page JSON to ${pageDir}/index.json`,
    "2. Call mcp__peblor__validate_and_fix with { file: '<absolute path>', attempt: 1 } — it ALWAYS returns a structured fixes[] array plus a ready-to-use fixPrompt string.",
    "3. If valid → continue to steal-split",
    `4. If invalid: walk every entry in fixes[], applying its suggestion at its path. For a second opinion run: npx tsx tools/pb-cli/src/index.ts validate ${pageDir}/index.json — validating the file IN PLACE (never copy it to /tmp first).`,
    "5. Retry (max 7 attempts). Do NOT give up at 3.",
    "6. Common fixes:",
    "     - 'border' on a section failing validation → it's the wrong SHAPE: convert a CSS-shorthand string to { width, style, color } (sections), or vice versa for elements",
    "     - Change elementLink 'text' → 'label'",
    "     - Change elementButton 'text' → 'label'",
    "     - Change 'backdropBlur' (as a flat field) → 'backdropFilter'",
    "     - Remove nonexistent preset references",
    "     - Ensure all elementOrder keys exist in definitions",
    "     - Replace fontSize/lineHeight arrays with clamp() or single value",
  ];
}

export function validationGate(pageDir: string): Array<Record<string, unknown>> {
  return [
    {
      check: "Page is net-new and original",
      rule: "no headline/copy/company-name string from pass1-layout.json appears (even reworded) in the generated page — see netNewContentProtocol and the originality-self-audit in Pass 5",
    },
    {
      check: "Every visual slot is a placeholder",
      rule: "every image slot is an elementGroup placeholder per placeholderImageProtocol — no elementImage referencing the reference's CDN, a downloaded asset, or any URL belonging to the source site",
    },
    {
      check: "Colors expressed as this project's tokens",
      rule: "all text/fill/border colors use var(--pb-*) and color-mix(in oklab, ...) — no literal rgb()/rgba()/hex strings copied from pass3",
    },
    {
      check: "Typography uses this project's font stack",
      rule: "fontFamily values resolve to apps/web/src/app/fonts/config.ts slot bindings — never the reference's webfont name from pass3.scale.*.fontFamily",
    },
    { check: "validate_and_fix returned valid:true", rule: "attempts ≤ 7" },
    {
      check: "CLI validate exits 0",
      rule: `npx tsx tools/pb-cli/src/index.ts validate ${pageDir}/index.json`,
    },
    {
      check: "Background is an original backgroundVariable or fitting preset",
      rule: "built per compositionLanguageReferenceProtocol from this project's tokens/presets — chosen because it serves this page's content, not because it echoes the reference's literal layer recipe",
    },
    {
      check: "All feature sections have a placeholder visual",
      rule: "no feature section has an empty image slot",
    },
    {
      check: "Hero placeholder has minHeight or explicit height",
      rule: "hero section won't collapse to 0px",
    },
    { check: "stealMeta.json written", rule: "file exists, contains no fontsUsed/fontLinks" },
    { check: "steal-split produced sidecar files", rule: "one .json per section key" },
  ];
}

export function onValidationFailure(pageDir: string): string {
  return `If validate returns errors → fix and re-validate up to 7 times. validate_and_fix ALWAYS returns a structured fixes[] array — apply each suggestion at its path directly. For a second opinion, validate the file IN PLACE: npx tsx tools/pb-cli/src/index.ts validate ${pageDir}/index.json (never copy it to /tmp first). Never proceed to Pass 5 with invalid JSON.`;
}
