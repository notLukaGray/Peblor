/**
 * Shared render helpers: badge/label maps, effective target resolution,
 * output path formatting, and pre-export summary updates.
 */

import type { ExportTarget, ExportTargetType } from "./types/figma-plugin";
import type { FramePreviewItem } from "./ui-state";
import { getTargetOverride } from "./ui-state";

// ---------------------------------------------------------------------------
// Badge / label maps
// ---------------------------------------------------------------------------

export const TARGET_BADGE_COLORS: Record<ExportTargetType, string> = {
  page: "badge-blue",
  preset: "badge-green",
  modal: "badge-purple",
  module: "badge-orange",
  "global-button": "badge-yellow",
  "global-background": "badge-gray",
  "global-element": "badge-gray",
  skip: "badge-red",
};

export const TARGET_LABELS: Record<ExportTargetType, string> = {
  page: "Page",
  preset: "Section",
  modal: "Modal",
  module: "Module",
  "global-button": "Button",
  "global-background": "Background",
  "global-element": "Global",
  skip: "Skip",
};

interface IssueTotals {
  errors: number;
  warnings: number;
  infos: number;
  categoryCounts: Record<string, number>;
}

function collectIssueTotals(currentFrames: FramePreviewItem[]): IssueTotals {
  const categoryCounts: Record<string, number> = {};
  let errors = 0;
  let warnings = 0;
  let infos = 0;

  for (const frame of currentFrames) {
    for (const issue of frame.issues) {
      categoryCounts[issue.category ?? "general"] =
        (categoryCounts[issue.category ?? "general"] ?? 0) + 1;
      if (issue.severity === "error") errors++;
      else if (issue.severity === "warn") warnings++;
      else infos++;
    }
  }

  return { errors, warnings, infos, categoryCounts };
}

// ---------------------------------------------------------------------------
// Effective target
// ---------------------------------------------------------------------------

export function effectiveTarget(frame: FramePreviewItem): ExportTarget {
  const override = getTargetOverride(frame.id);
  if (override && override !== "auto") {
    const typeMap: Record<string, ExportTargetType> = {
      page: "page",
      preset: "preset",
      modal: "modal",
      module: "module",
      button: "global-button",
      background: "global-background",
      global: "global-element",
      skip: "skip",
    };
    const resolvedType = typeMap[override] ?? frame.target.type;
    return { type: resolvedType, key: frame.target.key, label: frame.target.label };
  }
  return frame.target;
}

// ---------------------------------------------------------------------------
// Output path
// ---------------------------------------------------------------------------

export function getOutputPath(target: ExportTarget): string {
  switch (target.type) {
    case "page":
      return `pages/${target.key}.json`;
    case "preset":
      return `presets/${target.key}.json`;
    case "modal":
      return `modals/${target.key}.json`;
    case "module":
      return `modules/${target.key}.json`;
    case "global-button":
      return `globals.json → buttons.${target.key}`;
    case "global-background":
      return `globals.json → backgrounds.${target.key}`;
    case "global-element":
      return `globals.json → elements.${target.key}`;
    case "skip":
      return "(skipped)";
  }
}

// ---------------------------------------------------------------------------
// Pre-export summary
// ---------------------------------------------------------------------------

export function updatePreExportSummary(currentFrames: FramePreviewItem[]): void {
  const summaryLineEl = document.getElementById("pre-export-summary");
  if (!summaryLineEl) return;

  const {
    errors: totalErrors,
    warnings: totalWarnings,
    infos: totalInfos,
    categoryCounts,
  } = collectIssueTotals(currentFrames);
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3);
  const categorySummary = topCategories
    .map(([category, count]) => `${category}: ${count}`)
    .join(" · ");

  if (totalErrors > 0) {
    summaryLineEl.textContent =
      `⚠️ ${totalErrors} error${totalErrors !== 1 ? "s" : ""}` +
      (totalWarnings > 0 ? `, ${totalWarnings} warning${totalWarnings !== 1 ? "s" : ""}` : "") +
      (categorySummary ? ` · ${categorySummary}` : "");
    summaryLineEl.className = "pre-export-summary pre-export-summary--error";
  } else if (totalWarnings > 0) {
    summaryLineEl.textContent =
      `⚡ ${totalWarnings} warning${totalWarnings !== 1 ? "s" : ""}` +
      (totalInfos > 0 ? `, ${totalInfos} info note${totalInfos !== 1 ? "s" : ""}` : "") +
      (categorySummary ? ` · ${categorySummary}` : "");
    summaryLineEl.className = "pre-export-summary pre-export-summary--warn";
  } else if (currentFrames.length > 0) {
    summaryLineEl.textContent = `✓ Ready to export${categorySummary ? ` · ${categorySummary}` : ""}`;
    summaryLineEl.className = "pre-export-summary pre-export-summary--ok";
  } else {
    summaryLineEl.textContent = "";
    summaryLineEl.className = "pre-export-summary";
  }

  summaryLineEl.title = categorySummary ? `Issue categories: ${categorySummary}` : "";
}
