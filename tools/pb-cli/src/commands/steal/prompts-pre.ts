import path from "path";

import { findRepoRoot } from "./paths.js";
import {
  LAYOUT_EXTRACTION_SCRIPT,
  LAYOUT_SNAPSHOT_SCRIPT,
  LAZY_LOAD_SCROLL_SCRIPT,
  TYPOGRAPHY_EXTRACTION_SCRIPT,
} from "./extraction-scripts.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PER-PASS PROMPT BUILDERS
// Each returns a compact, structured result. Only Pass 4 requires AI reasoning.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildPass1Pre(args: {
  url: string;
  route: string;
  sitename: string;
}): Record<string, unknown> {
  const { url, route } = args;
  const repoRoot = findRepoRoot();
  const stateDir = path.join(repoRoot, "content/pages", route, "stealState");

  return {
    pass: 1,
    phase: "pre",
    goal: "Extract page layout and DOM structure. Zero reasoning — just run scripts and save output.",
    route,
    repoRoot,
    stateDir,
    steps: [
      {
        label: "create-state-dir",
        tool: "Bash",
        command: `rm -rf ${stateDir} && mkdir -p ${stateDir}`,
        note: "stealState/ is ephemeral working state, not a durable artifact — wipe it before a fresh run so debris from prior attempts (mismatched section counts, ad-hoc debug screenshots like 'current-*'/'fixed-*'/'logos-area.png') can't mix with this run's files. Re-stealing the same route always starts from a clean slate.",
      },
      {
        label: "navigate",
        tool: "mcp__chrome-devtools__navigate_page",
        params: { type: "url", url },
      },
      {
        label: "wait-for-page",
        tool: "mcp__chrome-devtools__wait_for",
        params: { text: [" "], timeout: 10000 },
        note: "Wait for any text to appear, then take a snapshot to find the main heading text. Re-wait with that specific text.",
      },
      {
        label: "resize",
        tool: "mcp__chrome-devtools__resize_page",
        params: { width: 1440, height: 900 },
      },
      {
        label: "fullpage-screenshot",
        tool: "mcp__chrome-devtools__take_screenshot",
        params: { fullPage: true, filePath: `${stateDir}/pass1-screenshot.png` },
        note: "Save as visual ground truth to the state directory. This is your reference for the entire page.",
      },
      {
        label: "lazy-load-scroll",
        tool: "mcp__chrome-devtools__evaluate_script",
        script: LAZY_LOAD_SCROLL_SCRIPT,
        note: "Scrolls 200px at a time, waits up to 6s per step for lazy images. Returns { action, pageHeight, steps, stuckSteps, totalImages }.",
      },
      {
        label: "extract-layout",
        tool: "mcp__chrome-devtools__evaluate_script",
        script: LAYOUT_EXTRACTION_SCRIPT,
        note: "Extracts full DOM structure. Save the returned JSON to pass1-layout.json via the save-layout step.",
      },
      {
        label: "save-layout",
        tool: "Write",
        filePath: `${stateDir}/pass1-layout.json`,
        note: "Parse the layout extraction JSON result and write it to this path. Directory already created by create-state-dir.",
      },
      {
        label: "per-section-screenshots",
        note: [
          `Using allHeadings[] from pass1-layout.json — for each heading where level <= 2 and y < (pageHeight - 600):`,
          ``,
          `WARNING — read this before capturing anything: Pass 4 pairs each section screenshot with a SEPARATE`,
          `live-rendered heading + body (the screenshot is meant to be ONLY the demo/illustration). If your`,
          `screenshot also contains the section's heading/body text baked into the pixels, that text will render`,
          `TWICE on the stolen page — once crisp as live copy, once illegibly smeared behind/around it as part of`,
          `the image. This exact bug shipped on the linear.app steal (see audit-05-post-fix-rerun.md, finding`,
          `NEW-3/NEW-4) because the capture grabbed the whole viewport at the heading's scroll position instead`,
          `of isolating the demo panel. Do NOT repeat it — isolate the visual container before shooting.`,
          ``,
          `1. Run this script, passing the heading's exact text as the argument, to locate AND isolate the`,
          `   section's visual/illustration container (the sibling of the text column that holds the product`,
          `   UI mockup — on most sites it's a cleanly separable element with zero heading text):`,
          `     async (headingText) => {`,
          `       const h = Array.from(document.querySelectorAll('h1,h2,h3')).find(x => x.textContent.trim() === headingText);`,
          `       if (!h) return { found: false, reason: 'heading not found' };`,
          `       const section = h.closest('section, [class*="section" i]') || h.parentElement.parentElement.parentElement;`,
          `       const prior = document.querySelector('[data-steal-isolated]');`,
          `       if (prior) prior.removeAttribute('style'), prior.removeAttribute('data-steal-isolated');`,
          `       let best = null, bestScore = 0;`,
          `       for (const el of section.querySelectorAll('div,figure,section,picture')) {`,
          `         if (el.querySelector('h1,h2,h3')) continue;`,
          `         const visualCount = el.querySelectorAll('img,svg,canvas,video').length;`,
          `         if (visualCount < 2) continue;`,
          `         const r = el.getBoundingClientRect();`,
          `         const area = r.width * r.height;`,
          `         if (area < 40000) continue;`,
          `         const textLen = (el.textContent || '').trim().length;`,
          `         const score = area / (1 + textLen);`,
          `         if (score > bestScore) { bestScore = score; best = el; }`,
          `       }`,
          `       if (!best) return { found: false, reason: 'no isolated visual container — text and demo are interleaved' };`,
          `       const bg = getComputedStyle(document.body).backgroundColor;`,
          `       best.setAttribute('data-steal-isolated', 'true');`,
          `       best.style.cssText = 'position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:999999!important;background:' + bg + '!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;';`,
          `       await new Promise(r => setTimeout(r, 500));`,
          `       return { found: true, textLen: (best.textContent || '').trim().length, w: Math.round(best.getBoundingClientRect().width), h: Math.round(best.getBoundingClientRect().height) };`,
          `     }`,
          ``,
          `2. If found:true — the element now fills the viewport in isolation. Take a normal viewport screenshot:`,
          `     mcp__chrome-devtools__take_screenshot → { filePath: '${stateDir}/section-<n>-<slug>.png' }`,
          `   where <slug> = heading.text.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,35)`,
          `   Then immediately restore it: document.querySelector('[data-steal-isolated]').removeAttribute('style');`,
          `   document.querySelector('[data-steal-isolated]').removeAttribute('data-steal-isolated');`,
          `   If textLen > 40, the "isolated" element still has meaningful copy baked in — treat as found:false.`,
          ``,
          `3. If found:false — no clean visual container exists (interleaved content). Fall back: scroll the`,
          `   heading into view (use the .work-scroll-aware scroll script from prior passes) and take a normal`,
          `   full-viewport screenshot, but record it in the manifest as fullSectionCapture:true — this tells`,
          `   Pass 4 to render it full-width as a STANDALONE visual with NO separate live heading/body pairing,`,
          `   so the baked-in text isn't duplicated.`,
          ``,
          `4. Repeat for up to 12 headings. After all: confirm no [data-steal-isolated] element remains (run`,
          `   document.querySelectorAll('[data-steal-isolated]').length === 0) and scroll back to top.`,
          ``,
          `CRITICAL: These screenshots are the ONLY visual record of SPA product UI content. Pass 2 copies them`,
          `to the public asset dir. Pass 4 uses them as elementImage.src for feature sections — paired with live`,
          `heading/body UNLESS marked fullSectionCapture:true.`,
        ].join("\n"),
      },
      // ── Desktop layout snapshot (still at 1440px) ──────────────
      {
        label: "desktop-layout-snapshot",
        tool: "mcp__chrome-devtools__evaluate_script",
        script: LAYOUT_SNAPSHOT_SCRIPT,
        note: "Captures per-section flexDirection, gap, padding, child widths, and grid columns at 1440px. Parse the returned JSON.",
      },
      {
        label: "save-desktop-layout",
        tool: "Write",
        filePath: `${stateDir}/pass1-desktop-layout.json`,
        note: "Write the parsed desktop layout snapshot to this path.",
      },
      // ── Mobile layout snapshot (375px) ─────────────────────────
      {
        label: "mobile-resize",
        tool: "mcp__chrome-devtools__resize_page",
        params: { width: 375, height: 812 },
        note: "Switch to mobile viewport.",
      },
      {
        label: "mobile-layout-snapshot",
        tool: "mcp__chrome-devtools__evaluate_script",
        script: LAYOUT_SNAPSHOT_SCRIPT,
        note: "Same script as desktop — run at 375px to capture how each section reflows. Parse the returned JSON.",
      },
      {
        label: "save-mobile-layout",
        tool: "Write",
        filePath: `${stateDir}/pass1-mobile.json`,
        note: "Write the parsed mobile layout snapshot to this path.",
      },
      {
        label: "restore-desktop",
        tool: "mcp__chrome-devtools__resize_page",
        params: { width: 1440, height: 900 },
        note: "Restore to desktop viewport before ending Pass 1.",
      },
    ],
    validationGate: [
      { check: "header extracted", rule: "header != null" },
      { check: "footer extracted", rule: "footer != null" },
      {
        check: "≥3 sections (or ≥5 images for SPA fallback)",
        rule: "sections.length >= 3 || allImages.length >= 5",
      },
      { check: "≥5 headings", rule: "allHeadings.length >= 5" },
      { check: "≥3 images", rule: "allImages.length >= 3" },
      { check: "bodyBg is a real color", rule: "bodyBg is not 'rgba(0,0,0,0)'" },
      {
        check: "per-section screenshots written",
        rule: "at least 3 section-N-*.png files in stealState/",
      },
      {
        check: "pass1-desktop-layout.json written",
        rule: "file exists and has viewportWidth: 1440",
      },
      { check: "pass1-mobile.json written", rule: "file exists and has viewportWidth: 375" },
    ],
    onValidationFailure:
      "If sections[] has <3 entries but allImages[] has 5+ images → SPA page — continue (section screenshots from the per-section-screenshots step are the fallback). If bodyBg or header/footer missing → stop and report.",
  };
}

export function buildPass2Pre(args: {
  url: string;
  route: string;
  sitename: string;
}): Record<string, unknown> {
  const { route, sitename } = args;
  const repoRoot = findRepoRoot();
  const stateDir = path.join(repoRoot, "content/pages", route, "stealState");

  return {
    pass: 2,
    phase: "pre",
    goal: [
      "Build a DESCRIPTIVE visual inventory — what role each image plays, its",
      "approximate proportions, and what kind of thing it depicts — WITHOUT",
      "downloading, copying, or otherwise reproducing a single source asset.",
      "",
      `This is deliberate: ${sitename}'s images, logos, and product screenshots are`,
      "their copyrighted property. Pass 4 generates a NET-NEW page inspired by the",
      "reference's measured design language, not a clone of it — every visual slot",
      "in the output is a placeholder (see placeholderImageProtocol). The inventory",
      "this pass produces is exactly the input that placeholder-building needs:",
      "role + proportions + a short content description, nothing more. No wget, no",
      "curl, no cp into apps/web/public — if you find yourself reaching for any of",
      "those, stop, you're solving a problem this pipeline intentionally doesn't have.",
    ].join("\n"),
    route,
    repoRoot,
    stateDir,
    reads: `${stateDir}/pass1-layout.json`,
    steps: [
      {
        label: "read-layout",
        tool: "Read",
        filePath: `${stateDir}/pass1-layout.json`,
        note: "Read the layout data — sections[].images[], header/footer images, and the allImages[] global fallback (critical for SPA pages where sections collapsed).",
      },
      {
        label: "describe-each-image-slot",
        note: [
          "For each meaningful image (skip data: URIs, tracking pixels [displayW=1 AND",
          "displayH=1], and role:'background' — those are handled by",
          "compositionLanguageReferenceProtocol, not as image slots), record FOUR things",
          "from what's already in pass1-layout.json plus a glance at the matching",
          `per-section reference screenshot in ${stateDir}/ (study material for`,
          "composition — see perSectionWorkflow — never a source to copy pixels from):",
          "",
          "  1. role         — 'hero' | 'content' | 'icon' | 'logo' | 'decorative'",
          "                    (carry over from pass1's role classification where present;",
          "                    infer from size/position/alt text where it's missing)",
          "  2. sectionSlug  — which section/heading this slot belongs to (match by",
          "                    position — the same y-coordinate matching pass1 already does",
          "                    for headings — or by alt-text keyword overlap)",
          "  3. aspectRatioHint — approximate ratio from displayW/displayH, expressed as",
          "                    a simple ratio string ('16:10', '4:3', '1:1', '3:4') — this",
          "                    is what lets the placeholder reserve the RIGHT proportions",
          "                    so the page reflows exactly as it would with a real image",
          "  4. description  — one short sentence on WHAT KIND of image this is, e.g.",
          "                    'wide product-UI dashboard screenshot with sidebar nav and",
          "                    charts' or 'square headshot in a circular crop' — enough",
          "                    for Pass 4 to write an accurate placeholder label and pick",
          "                    a sensible composition. Describe the SUBJECT MATTER and",
          "                    COMPOSITION, never identifying brand details (no company",
          "                    names, no product names, no logos-as-text).",
          "",
          "naturalW:0/complete:false entries are NOT gaps to fill by force-downloading —",
          "they're lazy-loaded images the browser hadn't decoded yet. pass1's",
          "lazy-load-scroll step already forced as many into view as it could; for any",
          "still incomplete, infer role/aspectRatio/description from alt text, layout",
          "position, and displayW/displayH (which are real even when natural* is 0).",
        ].join("\n"),
      },
      {
        label: "describe-logo-bars-and-icon-rows",
        note: [
          "For any isLogoBar section or row of small repeated marks: don't enumerate",
          "individual logos. Record ONE entry describing the RHYTHM — approxCount,",
          "approxSizePx, and a composition note ('evenly-spaced wordmark-style logos in",
          "a single row, muted/desaturated treatment'). That's all a placeholder row",
          "needs — see placeholderImageProtocol's logo-bar guidance.",
        ].join("\n"),
      },
      {
        label: "save-inventory",
        tool: "Write",
        filePath: `${stateDir}/pass2-visual-inventory.json`,
        note: [
          "Write the descriptive inventory. Format:",
          "{",
          `  "images": [`,
          `    { "sectionSlug": "hero", "role": "hero", "aspectRatioHint": "16:10",`,
          `      "description": "Wide product dashboard screenshot — dark UI, sidebar nav, line charts" },`,
          `    { "sectionSlug": "intake", "role": "content", "aspectRatioHint": "4:3",`,
          `      "description": "Kanban-style task board with avatar chips on cards" }`,
          "  ],",
          `  "logoBars": [`,
          `    { "sectionSlug": "customers-strip", "approxCount": 6, "approxSizePx": "120x32",`,
          `      "description": "Evenly-spaced monochrome wordmark logos in a single row" }`,
          "  ],",
          `  "icons": [`,
          `    { "sectionSlug": "footer", "approxSizePx": "24x24", "description": "Simple line-style social icons" }`,
          "  ]",
          "}",
          "",
          "Every entry is DESCRIPTIVE TEXT and MEASUREMENTS only — no localPath, no",
          "sourceUrl-as-a-destination, no filename you intend to write to disk. This",
          "file's entire job is to tell Pass 4 what SHAPE each placeholder should be",
          "and what NOTE to put inside it — never what file to point at.",
        ].join("\n"),
      },
    ],
    validationGate: [
      {
        check: "Inventory covers every section that had imagery in pass1-layout.json",
        rule: "cross-reference sectionSlug values against sections[] / allHeadings[]",
      },
      {
        check: "Every entry has role + aspectRatioHint + description",
        rule: "no entry is missing the fields a placeholder needs to be sized and labeled correctly",
      },
      {
        check: "Descriptions name SUBJECT MATTER and COMPOSITION, not brands",
        rule: "no company name, product name, or 'logo of X' phrasing in any description string",
      },
      {
        check: "No download artifacts produced by this pass",
        rule: `apps/web/public/stolen/${sitename}/ does not exist or is empty — this pass writes ONE json file to stealState/ and nothing else`,
      },
      {
        check: "No localPath/sourceUrl-as-destination fields in the inventory",
        rule: "grep the file for 'localPath' or '.webp\"' / '.png\"' as a value — if either appears, this pass downloaded something it shouldn't have",
      },
    ],
    onValidationFailure:
      "If you notice you've already run wget/curl/cp — delete whatever landed on disk (rm -rf the asset dir), remove any localPath fields from the inventory, and replace those entries with descriptions derived from pass1-layout.json + the reference screenshots instead. Re-run the validation gate before moving on.",
  };
}

export function buildPass3Pre(args: {
  url: string;
  route: string;
  sitename: string;
}): Record<string, unknown> {
  const { route } = args;
  const repoRoot = findRepoRoot();
  const stateDir = path.join(repoRoot, "content/pages", route, "stealState");

  return {
    pass: 3,
    phase: "pre",
    goal: "Extract typography and colors. Zero reasoning — just run script and save output.",
    route,
    repoRoot,
    stateDir,
    steps: [
      {
        label: "create-state-dir",
        tool: "Bash",
        command: `mkdir -p ${stateDir}`,
        note: "Create the state directory if it doesn't exist yet.",
      },
      {
        label: "extract-typography",
        tool: "mcp__chrome-devtools__evaluate_script",
        script: TYPOGRAPHY_EXTRACTION_SCRIPT,
        note: "The page should still be open from Pass 1. If not, re-navigate first. Parse the JSON result and save it raw first.",
      },
      {
        label: "save-raw-typography",
        tool: "Write",
        filePath: `${stateDir}/pass3-raw-typography.json`,
        note: "Write the raw JSON result from the extraction script exactly as returned. This is the source of truth.",
      },
      {
        label: "identify-font",
        tool: "Read",
        filePath: "apps/web/src/app/fonts/config.ts",
        note: "Match the primary font family from elements.h1.fontFamilyPrimary against primaryFontConfig.webfont.family and secondaryFontConfig.webfont.family. If it matches → use that slot name. If no match → generate a Bunny Fonts VARIABLE font URL (not static weights):\n  https://fonts.bunny.net/css?family=<slug>:ital,wght@0,100..900;1,100..900&display=swap\n  CRITICAL: Use the variable font form (wght@0,100..900) not static weight list.",
      },
      {
        label: "analyze-typography-scale",
        note: "Analyze allHeadingProfiles[] from the raw extraction to identify the THREE distinct text scales:\n  • displayScale: the largest h1 (hero heading) — note fontSize, fontWeight, letterSpacing, lineHeight\n  • sectionScale: the most common h2 size (feature section headings) — note exact values\n  • labelScale: small elements with textTransform:uppercase or wide letterSpacing, or h3/h4 labels — PLUS sectionLabelProfiles[] (e.g. '1.0 Intake →' style feature-section labels), which are a DISTINCT class from the small uppercase chips and often sit at body-adjacent sizes (~14-18px) with a LIGHTER weight than headings (commonly regular/400, not medium/590) — sample sectionLabelProfiles[0] for this bucket whenever it's non-empty; do not assume label weight matches heading weight.\n  Also identify: primary text color (most common in distinctTextColors[]), secondary text color (second most common), and any accent/muted colors.\n  Cross-check allHeadingProfiles[].y to understand which headings appear in hero vs mid-page vs footer.\n  COPY VALUES VERBATIM — do not round, snap to a 'canonical' weight (400/500/510/590/600/650...), or invent a 'plausible' lineHeight ratio. allHeadingProfiles[] and sectionLabelProfiles[] already give you the EXACT getComputedStyle string for each field (fontWeight as captured, e.g. '510' or '400'; lineHeight as a PRECOMPUTED UNITLESS RATIO string, e.g. '1.0' or '1.6' — already (lineHeight px / fontSize px), no division needed). Use the sample whose fontSize/text matches the actual page element you're scaling for — not the first or most-frequent sample in the list, which may belong to an unrelated UI element.",
      },
      {
        label: "save-typography",
        tool: "Write",
        filePath: `${stateDir}/pass3-typography.json`,
        note: 'Write the processed typography spec. REQUIRED fields — every value below MUST be copied verbatim from the matching allHeadingProfiles[]/labelProfiles[]/sectionLabelProfiles[] sample (same fontSize/text as the real page element), never rounded or invented:\n{\n  "primaryFont": "<fontFamilyPrimary from elements.h1>",\n  "fontStack": "<full fontFamily from elements.h1>",\n  "fontSlot": "<slot name from config.ts, or null>",\n  "fontLinks": ["<variable font URL>"],\n  "bodyBg": "<bodyBg color>",\n  "sectionFills": { "<hex/rgb>": "<semantic name>" },\n  "scale": {\n    "display": { "fontSize": "<px, exact>", "fontWeight": "<exact getComputedStyle string, e.g. \'510\' — NOT snapped to a nearby canonical value>", "letterSpacing": "<em or px>", "lineHeight": "<exact unitless ratio string from the sample, e.g. \'1.0\' — this is lineHeightPx/fontSizePx already computed for you, do not substitute a generic heading ratio like 1.1-1.3>", "color": "<rgb>" },\n    "section": { "fontSize": "<px, exact>", "fontWeight": "<exact getComputedStyle string — sample the h2 entry whose fontSize matches the page\'s actual section heading, NOT an h3/h4 sample from an embedded widget>", "letterSpacing": "<em or px>", "lineHeight": "<exact unitless ratio string — copy verbatim, do not invent>", "color": "<rgb>" },\n    "label": { "fontSize": "<px, exact>", "fontWeight": "<exact getComputedStyle string — prefer sectionLabelProfiles[0] for feature-section labels like \'1.0 Intake →\'; these are commonly LIGHTER (regular/400) than heading weight, do not assume they match>", "letterSpacing": "<em or px>", "textTransform": "<value or null>", "color": "<rgb>" },\n    "body": { "fontSize": "<px, exact>", "fontWeight": "<exact getComputedStyle string>", "lineHeight": "<exact unitless ratio string — copy verbatim>", "color": "<rgb>" }\n  },\n  "textColors": { "primary": "<rgb>", "secondary": "<rgb>", "muted": "<rgb or null>" },\n  "primaryButton": { ... exact values from extraction ... },\n  "ghostButton": { ... exact values from extraction ... }\n}',
      },
    ],
    validationGate: [
      {
        check: "pass3-raw-typography.json written",
        rule: "file exists with allHeadingProfiles array",
      },
      { check: "primaryFont identified", rule: "not empty" },
      {
        check: "fontLinks uses variable font URL",
        rule: "URL contains 100..900 not static weights",
      },
      {
        check: "scale.display has fontWeight, fontSize, letterSpacing, lineHeight",
        rule: "all four present",
      },
      { check: "scale.section has fontWeight, fontSize", rule: "both present" },
      { check: "scale.body has fontSize, lineHeight", rule: "both present" },
      {
        check:
          "scale.*.fontWeight and scale.*.lineHeight values trace to a specific allHeadingProfiles[]/labelProfiles[]/sectionLabelProfiles[] sample",
        rule: "every weight is one of the EXACT getComputedStyle strings present in pass3-raw-typography.json (no rounding/snapping to a nearby canonical value), and every lineHeight is the sample's own precomputed unitless ratio (no generic 1.1-1.3 heading-ratio guesses)",
      },
      { check: "textColors.primary is concrete color", rule: "not rgba(0,0,0,0), not color-mix()" },
      { check: "bodyBg is concrete color", rule: "not rgba(0,0,0,0)" },
      { check: "sectionFills covers distinct bg colors", rule: "at least 1 entry" },
      { check: "primaryButton found", rule: "null only if no button exists on page" },
      {
        check: "backgroundLayers extracted in pass1",
        rule: "pass1-layout.json has backgroundLayers array. Even if empty, it must exist.",
      },
    ],
    onValidationFailure: "If primaryFont is missing or fontLinks is empty → stop and report.",
  };
}
