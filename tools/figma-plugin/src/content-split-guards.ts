/**
 * Validates page keys / section keys for mirrored `content/pages/{slug}/` ZIP output.
 */

import type { ExportResult } from "./types/figma-plugin";

export const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function unsafeSegmentLabel(kind: string, value: string): string {
  return `[export-split] Skipped ${kind} "${value}" — use only ASCII letters, digits, underscore, hyphen, and start with a letter or digit (matches Next.js content path segments). Merged JSON is still under pages/${value}.json.`;
}

/**
 * Warnings when ZIP `content/pages/...` split paths are skipped due to unsafe slugs.
 */
export function collectContentSplitWarnings(result: ExportResult): string[] {
  const out: string[] = [];

  function checkPageMap(pages: Record<string, unknown>, label: string): void {
    for (const key of Object.keys(pages)) {
      if (!SAFE_SEGMENT.test(key)) {
        out.push(unsafeSegmentLabel(`${label} page key`, key));
        continue;
      }
      const page = pages[key];
      if (page == null || typeof page !== "object" || Array.isArray(page)) continue;
      const sectionOrder = (page as Record<string, unknown>).sectionOrder;
      if (!Array.isArray(sectionOrder)) continue;
      for (const sk of sectionOrder) {
        if (typeof sk === "string" && sk.length > 0 && !SAFE_SEGMENT.test(sk)) {
          out.push(unsafeSegmentLabel(`sectionOrder key on page "${key}"`, sk));
        }
      }
    }
  }

  checkPageMap(result.pages as Record<string, unknown>, "pages");

  for (const key of Object.keys(result.presets as Record<string, unknown>)) {
    if (!SAFE_SEGMENT.test(key)) {
      out.push(unsafeSegmentLabel("preset key", key));
    }
  }

  return out;
}
