// Responsive layout diff — actively compares pass1-desktop-layout.json (1440px) vs
// pass1-mobile.json (375px) and produces structured, per-section deltas the AI can
// translate directly into concrete [mobile, desktop] responsive-array values.
//
// Extracted from steal-prompts-generate.ts — pure data transformation, no prompt
// concerns. Testable independently: pass it two LayoutSnapshot objects and assert
// the diffs.

import fs from "fs";
import path from "path";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface SnapshotChild {
  widthPx?: number | null;
  widthPct?: number | null;
  flexBasis?: string | null;
  flexGrow?: string | null;
  alignSelf?: string | null;
}

interface SnapshotSection {
  heading?: string | null;
  viewportWidth?: number;
  display?: string | null;
  flexDirection?: string | null;
  flexWrap?: string | null;
  alignItems?: string | null;
  justifyContent?: string | null;
  gap?: string | null;
  rowGap?: string | null;
  columnGap?: string | null;
  padding?: string | null;
  gridCols?: number | null;
  heightPx?: number | null;
  childCount?: number | null;
  children?: SnapshotChild[] | null;
  headingFontSize?: string | null;
  headingLineHeight?: string | null;
}

interface TypeSpecimen {
  fontSize?: string | null;
  fontWeight?: string | null;
  lineHeight?: string | null;
  padding?: string | null;
}

interface LayoutSnapshot {
  viewportWidth?: number;
  sections?: SnapshotSection[];
  h1?: TypeSpecimen | null;
  h2?: TypeSpecimen | null;
  p?: TypeSpecimen | null;
  btn?: TypeSpecimen | null;
}

/** Fields on SnapshotSection worth comparing between viewports. */
const DIFFABLE_SECTION_FIELDS = [
  "flexDirection",
  "flexWrap",
  "alignItems",
  "justifyContent",
  "gap",
  "rowGap",
  "columnGap",
  "padding",
  "gridCols",
  "childCount",
  "headingFontSize",
  "headingLineHeight",
] as const;

export interface SectionDiffEntry {
  heading: string | null;
  changed: Record<string, { mobile: unknown; desktop: unknown }>;
  /** Ready-to-emit responsive-array suggestions, keyed by JSON field name. */
  suggestedResponsiveArrays: Record<string, [unknown, unknown]>;
  childWidthShift: string | null;
}

export interface TypeSpecimenDiffEntry {
  element: "h1" | "h2" | "p" | "btn";
  desktop: TypeSpecimen | null;
  mobile: TypeSpecimen | null;
  changed: Record<string, { mobile: unknown; desktop: unknown }>;
}

export interface ResponsiveDiffResult {
  available: boolean;
  reason?: string;
  desktopViewportWidth: number;
  mobileViewportWidth: number;
  viewportRatio: string;
  sectionsMatchedByHeading: boolean;
  perSectionDiffs: SectionDiffEntry[];
  typeSpecimenDiffs: TypeSpecimenDiffEntry[];
  globalContainerDiff: SectionDiffEntry | null;
  guidance: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function readJsonIfExists(filePath: string): unknown | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.warn("[pb-cli] Failed to read JSON file for responsive diff", filePath, err);
    return null;
  }
}

function normalizeHeading(heading: string | null | undefined): string | null {
  if (!heading) return null;
  return heading.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

function diffTypeSpecimen(
  element: "h1" | "h2" | "p" | "btn",
  desktop: TypeSpecimen | null | undefined,
  mobile: TypeSpecimen | null | undefined
): TypeSpecimenDiffEntry {
  const changed: Record<string, { mobile: unknown; desktop: unknown }> = {};
  const keys: (keyof TypeSpecimen)[] = ["fontSize", "fontWeight", "lineHeight", "padding"];
  for (const key of keys) {
    const d = desktop?.[key] ?? null;
    const m = mobile?.[key] ?? null;
    if (d !== m) changed[key] = { mobile: m, desktop: d };
  }
  return { element, desktop: desktop ?? null, mobile: mobile ?? null, changed };
}

function diffSection(desktop: SnapshotSection, mobile: SnapshotSection): SectionDiffEntry {
  const changed: Record<string, { mobile: unknown; desktop: unknown }> = {};
  const suggestedResponsiveArrays: Record<string, [unknown, unknown]> = {};

  for (const field of DIFFABLE_SECTION_FIELDS) {
    const d = desktop[field] ?? null;
    const m = mobile[field] ?? null;
    if (d !== m) {
      changed[field] = { mobile: m, desktop: d };
      if (field !== "childCount" && field !== "headingFontSize" && field !== "headingLineHeight") {
        suggestedResponsiveArrays[field] = [m, d];
      }
    }
  }

  let childWidthShift: string | null = null;
  const dChildren = desktop.children ?? [];
  const mChildren = mobile.children ?? [];
  if (dChildren.length >= 2 && mChildren.length >= 1) {
    const dPcts = dChildren.map((c) => c.widthPct ?? null).filter((v): v is number => v !== null);
    const mPcts = mChildren.map((c) => c.widthPct ?? null).filter((v): v is number => v !== null);
    if (dPcts.length >= 2 && mPcts.length >= 1) {
      const dSummary = dPcts.join("/");
      const mSummary = mPcts.join("/");
      if (dSummary !== mSummary) {
        childWidthShift =
          `desktop children split ${dSummary}% of section width -> mobile children are ${mSummary}% ` +
          `=> emit child width as ['${mPcts.length === 1 ? "100%" : mPcts.map((p) => `${p}%`).join("/")}', ` +
          `'${dPcts.map((p) => `${p}%`).join("/")}'] (or the equivalent flex/contentWidth responsive array)`;
      }
    }
  }

  return {
    heading: desktop.heading ?? mobile.heading ?? null,
    changed,
    suggestedResponsiveArrays,
    childWidthShift,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════════

export function buildResponsiveDiff(stateDir: string): ResponsiveDiffResult {
  const desktopRaw = readJsonIfExists(path.join(stateDir, "pass1-desktop-layout.json"));
  const mobileRaw = readJsonIfExists(path.join(stateDir, "pass1-mobile.json"));

  if (!desktopRaw || !mobileRaw) {
    return {
      available: false,
      reason: "pass1-desktop-layout.json or pass1-mobile.json missing or unparseable on disk.",
      desktopViewportWidth: 1440,
      mobileViewportWidth: 375,
      viewportRatio: "375/1440 (26%)",
      sectionsMatchedByHeading: false,
      perSectionDiffs: [],
      typeSpecimenDiffs: [],
      globalContainerDiff: null,
      guidance: [
        "Snapshot files are missing — this should not happen if Pass 1 completed successfully.",
        "Re-run Pass 1's desktop/mobile layout snapshot steps before continuing.",
      ],
    };
  }

  const desktop = desktopRaw as LayoutSnapshot;
  const mobile = mobileRaw as LayoutSnapshot;
  const desktopViewportWidth = desktop.viewportWidth ?? 1440;
  const mobileViewportWidth = mobile.viewportWidth ?? 375;
  const viewportRatio = `${mobileViewportWidth}/${desktopViewportWidth} (${Math.round(
    (mobileViewportWidth / desktopViewportWidth) * 100
  )}%)`;

  const desktopSections = desktop.sections ?? [];
  const mobileSections = mobile.sections ?? [];

  const mobileByHeading = new Map<string, SnapshotSection>();
  for (const s of mobileSections) {
    const key = normalizeHeading(s.heading);
    if (key) mobileByHeading.set(key, s);
  }

  const perSectionDiffs: SectionDiffEntry[] = [];
  let matchedCount = 0;
  for (const dSection of desktopSections) {
    const key = normalizeHeading(dSection.heading);
    if (!key) continue;
    const mSection = mobileByHeading.get(key);
    if (!mSection) continue;
    matchedCount++;
    perSectionDiffs.push(diffSection(dSection, mSection));
  }

  const minSectionCount = Math.min(desktopSections.length, mobileSections.length);
  const sectionsMatchedByHeading = matchedCount >= 3 && matchedCount >= minSectionCount - 1;

  const typeSpecimenDiffs: TypeSpecimenDiffEntry[] = [
    diffTypeSpecimen("h1", desktop.h1, mobile.h1),
    diffTypeSpecimen("h2", desktop.h2, mobile.h2),
    diffTypeSpecimen("p", desktop.p, mobile.p),
    diffTypeSpecimen("btn", desktop.btn, mobile.btn),
  ];

  let globalContainerDiff: SectionDiffEntry | null = null;
  if (desktopSections.length && mobileSections.length) {
    const largestDesktop = desktopSections.reduce((a, b) =>
      (b.heightPx ?? 0) > (a.heightPx ?? 0) ? b : a
    );
    const largestMobile = mobileSections.reduce((a, b) =>
      (b.heightPx ?? 0) > (a.heightPx ?? 0) ? b : a
    );
    globalContainerDiff = diffSection(largestDesktop, largestMobile);
  }

  const guidance: string[] = [];
  guidance.push(
    `Viewport contracted from ${desktopViewportWidth}px (desktop) to ${mobileViewportWidth}px (mobile) — a ratio of ${viewportRatio}. ` +
      `ANY hardcoded desktop pixel width on a section/contentBlock (e.g. '1344px') MUST become a responsive array whose mobile slot is ` +
      `either a percentage ('100%') or a measured mobile pixel value — never the same '1344px' repeated.`
  );

  if (sectionsMatchedByHeading) {
    guidance.push(
      `${perSectionDiffs.length} section(s) matched by heading text across both snapshots — use perSectionDiffs[] directly: ` +
        `each entry's suggestedResponsiveArrays{} gives you the exact [mobile, desktop] tuple to write for that section's ` +
        `flexDirection/gap/padding/etc, measured from the live page at both viewports.`
    );
  } else {
    guidance.push(
      `Sections did NOT match 1:1 by heading across snapshots (matched ${matchedCount}/${desktopSections.length} desktop sections) — ` +
        `this is the SPA/virtualized-page case. perSectionDiffs[] will be sparse or empty. Use globalContainerDiff ` +
        `and typeSpecimenDiffs[] as the source-of-truth fallback — apply the SAME contraction ratio they show to ` +
        `every logical section you generate from pass1-layout.json's headings.`
    );
  }

  if (globalContainerDiff && Object.keys(globalContainerDiff.suggestedResponsiveArrays).length) {
    const arrays = Object.entries(globalContainerDiff.suggestedResponsiveArrays)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
    guidance.push(
      `Global container measured shift (largest section both sides): ${arrays}. ` +
        `Every section's padding should contract by roughly the same proportion.`
    );
  }

  for (const spec of typeSpecimenDiffs) {
    if (Object.keys(spec.changed).length === 0) continue;
    const deltas = Object.entries(spec.changed)
      .map(
        ([k, v]) =>
          `${k}: ${JSON.stringify(v.desktop)} (desktop) -> ${JSON.stringify(v.mobile)} (mobile)`
      )
      .join(", ");
    guidance.push(`Global <${spec.element}> specimen measured: ${deltas}.`);
  }

  guidance.push(
    "Font-size deltas above are informational ONLY — fontSize/lineHeight must use clamp(), never responsive arrays " +
      "(the runtime rejects array values for those two fields). The clamp() floor should land close to the measured " +
      "mobile value (e.g. h1 64px desktop / 38px mobile -> clamp(38px, 4.4vw, 64px))."
  );

  for (const diff of perSectionDiffs) {
    if (diff.childWidthShift) {
      guidance.push(`Section "${diff.heading}": ${diff.childWidthShift}`);
    }
  }

  return {
    available: true,
    desktopViewportWidth,
    mobileViewportWidth,
    viewportRatio,
    sectionsMatchedByHeading,
    perSectionDiffs,
    typeSpecimenDiffs,
    globalContainerDiff,
    guidance,
  };
}
