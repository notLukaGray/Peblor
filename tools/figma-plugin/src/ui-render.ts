/**
 * Preview panel rendering: assembles the detected-frames list from frame rows.
 * Re-exports shared render helpers consumed by ui.ts and ui-export.ts.
 */

import type { FramePreviewItem } from "./ui-state";
import { updatePreExportSummary } from "./ui-render-helpers";
import { renderFrameRow } from "./ui-render-frame-row";

export {
  TARGET_BADGE_COLORS,
  TARGET_LABELS,
  effectiveTarget,
  getOutputPath,
  updatePreExportSummary,
} from "./ui-render-helpers";

// ---------------------------------------------------------------------------
// Preview panel
// ---------------------------------------------------------------------------

export function renderPreview(
  previewEl: HTMLDivElement,
  items: FramePreviewItem[],
  currentFrames: FramePreviewItem[],
  onCopySection?: (frame: FramePreviewItem) => void
): void {
  previewEl.innerHTML = "";
  previewEl.style.display = "block";

  // Pre-export summary line
  const summaryLine = document.createElement("div");
  summaryLine.id = "pre-export-summary";
  summaryLine.className = "pre-export-summary";
  previewEl.appendChild(summaryLine);

  const heading = document.createElement("div");
  heading.className = "preview-heading";
  const pairCount = items.filter((i) => i.responsivePairKey).length;
  const singleCount = items.length - pairCount;
  const parts: string[] = [];
  if (singleCount > 0) parts.push(`${singleCount} frame${singleCount !== 1 ? "s" : ""}`);
  if (pairCount > 0) parts.push(`${pairCount} responsive pair${pairCount !== 1 ? "s" : ""}`);
  heading.textContent = `Detected ${parts.join(", ")}:`;
  previewEl.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "preview-list";

  for (const item of items) {
    list.appendChild(renderFrameRow(item, currentFrames, onCopySection));
  }

  previewEl.appendChild(list);
  updatePreExportSummary(currentFrames);
}
