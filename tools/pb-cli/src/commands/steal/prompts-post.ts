// PASS 5 — POST prompt builder (design-quality self-check — reviews the generated
// page against the MEASURED QUALITY BAR from passes 1-3, confirms it's genuinely
// original rather than a clone, and patches any gaps), plus the prerequisite-gating
// helpers `runStealPage` uses to validate pass ordering before dispatching to any
// pass builder (see the PREREQUISITE GATING banner below).

import path from "path";

import { findRepoRoot } from "./paths.js";

export function buildPass5Post(args: {
  url: string;
  route: string;
  sitename: string;
}): Record<string, unknown> {
  const { url, route, sitename } = args;
  const repoRoot = findRepoRoot();
  const stateDir = path.join(repoRoot, "content/pages", route, "stealState");
  const pageDir = path.join(repoRoot, "content/pages", route);

  return {
    pass: 5,
    phase: "post",
    goal:
      "Self-review the GENERATED page against the measured QUALITY BAR from passes " +
      "1-3 — not against the reference site's pixels. Confirm it's genuinely " +
      "ORIGINAL (no leaked copy, colors, fonts, or assets from the reference), that " +
      "it exercises this project's real generation idioms (presets, tokens, " +
      "placeholders), and that it clears a comparable bar for rhythm, hierarchy, " +
      "contrast, and polish. Patch any gaps directly in the sidecar files.",
    route,
    repoRoot,
    steps: [
      {
        label: "screenshot-generated",
        tool: "mcp__chrome-devtools__navigate_page",
        params: { type: "url", url: `http://localhost:3000${route}` },
        note: `Navigate to the generated page preview. Wait for heading text to appear. Resize to 1440×900. Take fullPage screenshot → ${stateDir}/pass5-generated-fullpage.png`,
      },
      {
        label: "originality-self-audit",
        note: [
          "Grep the generated page JSON (index.json + every sidecar section file in",
          `${pageDir}/) for leaks from the reference. None of these should ever appear:`,
          "",
          `  1. Literal headlines/company-name/product-name strings from ${stateDir}/pass1-layout.json`,
          "     — read pass1-layout.json's allHeadings[]/sections[].text and confirm none of",
          "     those phrases (even lightly reworded) appear in your generated copy.",
          "  2. Literal color values from pass3 — grep the generated files for `rgb(` / `rgba(` /",
          "     `#` hex strings. Text and fill colors should be var(--pb-*) / color-mix(in oklab, ...)",
          "     tokens — NEVER copy-pasted swatches from pass3-typography.json's textColors/",
          "     sectionFills/primaryButton/ghostButton.",
          "  3. The reference's font family — grep for fontFamily strings and confirm every one",
          "     resolves to this project's existing font stack (apps/web/src/app/fonts/config.ts),",
          "     never pass3.scale.*.fontFamily.",
          `  4. Any path into a downloaded-asset directory — grep for "stolen/${sitename}" or`,
          "     any localPath value from pass2-visual-inventory.json. There should be ZERO",
          "     hits: this pipeline never downloads the reference's assets, so any such string",
          "     is either a leftover from an earlier draft or a placeholder gone wrong — fix it.",
          "",
          "If ANY of the above turns up a hit, that is a real defect — rewrite the offending",
          "string from the underlying idea/relationship outward, per referenceFraming's self-check.",
        ].join("\n"),
      },
      {
        label: "placeholder-and-token-check",
        note: [
          "Walk every visual slot in sectionOrder (hero, feature images, logo bar, icons):",
          "  • Confirm each one is an elementGroup placeholder per placeholderImageProtocol —",
          "    NOT an elementImage pointing at any URL (reference CDN or otherwise).",
          "  • Confirm each placeholder carries a short, practical production-note label",
          "    (e.g. 'Product dashboard — placeholder'), using a color-mix() token, not a",
          "    hardcoded color.",
          "  • Confirm each placeholder reserves the CORRECT proportions (aspectRatio/width)",
          "    matching its pass2-visual-inventory.json entry, and that hero-scale slots have",
          "    an explicit height/minHeight so they can't collapse to 0px.",
          "  • Confirm fills/borders/text colors throughout the page use var(--pb-*) and",
          "    color-mix(in oklab, ...) — the normal token vocabulary, not literal swatches.",
        ].join("\n"),
      },
      {
        label: "quality-bar-comparison",
        note: [
          "Compare the GENERATED page's actual computed type/spacing rhythm against the",
          "MEASURED ratios from pass3 and responsiveDiff — looking for a COMPARABLE bar,",
          "never identical values:",
          "",
          "  • Run: Array.from(document.querySelectorAll('h1,h2,p,a,button')).slice(0,8).map(el => ({",
          "      tag: el.tagName, size: getComputedStyle(el).fontSize,",
          "      weight: getComputedStyle(el).fontWeight, lh: getComputedStyle(el).lineHeight }))",
          "  • Compute YOUR page's display÷section÷body size ratios and weight contrast.",
          "  • Compare proportionally against pass3.scale's ratios (display.fontSize ÷",
          "    section.fontSize ÷ body.fontSize) — yours should feel like a peer system,",
          "    not a thin echo or a flat, undifferentiated scale.",
          "  • Section count / narrative arc: does your sectionOrder carry comparable",
          "    structural ambition to pass1-layout.json's sections[] — roughly matched in",
          "    count and density, not padded out or thinned down for convenience?",
          "",
          "If your page reads noticeably flatter/thinner than the measured bar, that's a",
          "real gap — strengthen the weight contrast, size ratios, or section depth before",
          "calling this pass complete.",
        ].join("\n"),
      },
      {
        label: "responsive-reflow-check",
        note: [
          "Resize to 375px and verify the page reflows the way responsiveDiff predicted",
          "a well-designed page should — proportionally, not pixel-for-pixel:",
          `  1. mcp__chrome-devtools__resize_page { width: 375, height: 812 }`,
          `  2. document.querySelector('.work-scroll').scrollTo(0, 0)`,
          `  3. Take screenshot → ${stateDir}/pass5-mobile-hero.png`,
          `  4. Scroll to a feature section (middle of page), screenshot → ${stateDir}/pass5-mobile-feature.png`,
          `  5. Scroll to footer, screenshot → ${stateDir}/pass5-mobile-footer.png`,
          `  6. Read all three and verify:`,
          `     • Feature rows that were side-by-side at 1440px now stack (column)`,
          `     • Text is readable and not clipped — nothing wider than 375px (responsiveDiff.mobileViewportWidth)`,
          `     • Placeholder visuals scale to full width and keep their reserved aspect ratio`,
          `     • Footer/nav columns stack vertically`,
          `  7. Restore: mcp__chrome-devtools__resize_page { width: 1440, height: 900 }`,
          "",
          "If a section doesn't reflow proportionally, edit the sidecar file directly and add",
          "a responsive array with a comparable mobile↔desktop relationship to the one",
          "responsiveDiff measured — see suggestedResponsiveArrays for the worked-example shape.",
        ].join("\n"),
      },
      {
        label: "patch-gaps",
        note: [
          "IMPORTANT: After steal-split, sections live in sidecar .json files, NOT in index.json.",
          "open_page_session will report all sectionOrder keys as missing — it only reads index.json.",
          "Do NOT use open_page_session / patch_page_session for post-split patches.",
          "",
          "Instead, patch sidecar files directly:",
          `  1. Read ${pageDir}/<section-key>.json`,
          "  2. Edit the specific field with the Edit tool",
          `  3. Reload the preview: navigate to http://localhost:3000${route}`,
          "  4. Take a new screenshot to verify the fix",
          "",
          "Common patches and where to apply them:",
          "  Collapsed placeholder      → edit <section-key>.json, add height:'clamp(300px,40vw,640px)' to the placeholder elementGroup",
          "  Wrong flex direction        → edit <section-key>.json, change flexDirection (or add a responsive array)",
          "  Literal color leaked in     → replace the rgb()/hex string with the matching var(--pb-*) / color-mix() token",
          "  Foreign font-family leaked  → replace with this project's font stack binding",
          "  Reference copy leaked in    → rewrite the string from the underlying idea, not the reference's phrasing",
          "  Button label invisible      → edit <section-key>.json, add linkDefault matching wrapperFill contrast token",
          "  Background feels flat/thin  → edit index.json definitions.bg.layers[] — build an original layered backgroundVariable per compositionLanguageReferenceProtocol",
        ].join("\n"),
      },
    ],
    validationGate: [
      {
        check: "No reference copy leaked into generated content",
        rule: `originality-self-audit found zero matches between generated text and ${stateDir}/pass1-layout.json headlines/copy`,
      },
      {
        check: "No literal reference colors",
        rule: "grep for rgb(/rgba(/# in generated section files returns no hits outside of this project's own token expressions",
      },
      {
        check: "No foreign font-family",
        rule: "every fontFamily in the generated page resolves to this project's existing font stack, never pass3.scale.*.fontFamily",
      },
      {
        check: "No downloaded-asset paths referenced",
        rule: `grep for "stolen/${sitename}" / pass2-visual-inventory.json localPath strings in generated files returns zero hits`,
      },
      {
        check: "Every visual slot is a placeholder",
        rule: "no elementImage anywhere in the generated page; every visual slot is an elementGroup placeholder per placeholderImageProtocol",
      },
      {
        check: "Placeholders carry production-note labels and reserved proportions",
        rule: "each placeholder elementGroup has a short note label (color-mix token) and width/aspectRatio/height matching its pass2-visual-inventory.json entry",
      },
      {
        check: "Hero placeholder has explicit height/minHeight",
        rule: "hero visual slot does not collapse — getBoundingClientRect().height > 10",
      },
      {
        check: "Type rhythm is comparable to the measured bar",
        rule: "generated display÷section÷body size ratios and weight contrast read as a peer system to pass3.scale, not flatter or thinner",
      },
      {
        check: "Section count/density is comparable to the measured bar",
        rule: "sectionOrder length and per-section depth are roughly matched to pass1-layout.json sections[] — not padded or thinned for convenience",
      },
      {
        check: "Mobile reflow is proportional",
        rule: "at 375px, feature rows stack to column, nothing overflows mobileViewportWidth, placeholders keep their aspect ratio",
      },
      {
        check: "Mobile screenshots taken",
        rule: `${stateDir}/pass5-mobile-hero.png, pass5-mobile-feature.png, and pass5-mobile-footer.png exist`,
      },
      {
        check: "Page is scrollable",
        rule: "document.querySelector('.work-scroll').scrollHeight > 900",
      },
    ],
    finalReport: {
      url,
      route,
      previewUrl: `http://localhost:3000${route}`,
      stateFiles: [
        `${stateDir}/pass1-layout.json`,
        `${stateDir}/pass1-desktop-layout.json`,
        `${stateDir}/pass1-mobile.json`,
        `${stateDir}/pass2-visual-inventory.json`,
        `${stateDir}/pass3-typography.json`,
        `${stateDir}/pass3-raw-typography.json`,
        `${stateDir}/pass5-generated-fullpage.png`,
        `${stateDir}/pass5-mobile-hero.png`,
        `${stateDir}/pass5-mobile-feature.png`,
        `${stateDir}/pass5-mobile-footer.png`,
      ],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREREQUISITE GATING — `runStealPage` defaults to pass 4 (the AI-generation pass).
// Calling it cold against a route with no prior state produces a workflow that
// instructs the agent to Read files that don't exist yet (pass1-layout.json etc.),
// which the agent either hallucinates around or fails on mid-generation. Check the
// expected outputs of pass N-1 before handing back pass N's workflow, and return a
// structured redirect instead — see audit-02-pipeline-orchestration.md §B.1.
// ═══════════════════════════════════════════════════════════════════════════════

export function passPrereqFiles(
  passNum: number,
  repoRoot: string,
  route: string,
  stateDir: string
): string[] {
  switch (passNum) {
    case 2:
      return [`${stateDir}/pass1-layout.json`];
    case 3:
      return [];
    case 4:
      return [
        `${stateDir}/pass1-layout.json`,
        `${stateDir}/pass1-desktop-layout.json`,
        `${stateDir}/pass1-mobile.json`,
        `${stateDir}/pass2-visual-inventory.json`,
        `${stateDir}/pass3-typography.json`,
      ];
    case 5:
      return [path.join(repoRoot, "content/pages", route, "index.json")];
    default:
      return [];
  }
}

export function suggestedPassFor(passNum: number): number {
  // Pass 4 depends on outputs from 1-3; the most likely missing one is the earliest.
  // Passes 2, 3, 5 each depend on exactly one prior pass.
  return passNum === 4 ? 1 : passNum - 1;
}
