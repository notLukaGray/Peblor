"use server";

import type { SectionBlock } from "@pb/contracts";
import { getPeblorPropsAsync } from "@pb/core/load";
import { expandPage } from "@pb/core/resolve";
import { assertDevRoute } from "@/core/lib/assert-dev";

export type ComposerResult =
  | { ok: true; sections: SectionBlock[]; bgJson: string | null }
  | { ok: false; error: string };

/**
 * Parses a raw page-document JSON string, runs it through the production
 * expandPage pipeline (sectionOrder → SectionBlock[], element defaults applied),
 * and returns the resolved sections.
 */
export async function expandPageDoc(json: string): Promise<ComposerResult> {
  assertDevRoute();
  try {
    const doc = JSON.parse(json);
    // expandPage: expands sectionOrder + definitions into SectionBlock[]
    // and applies workbench element defaults — same path as production.
    const result = expandPage(doc);
    return {
      ok: true,
      sections: result.sections,
      bgJson: result.bg ? JSON.stringify(result.bg, null, 2) : null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to expand page document",
    };
  }
}

/**
 * Loads a page by slug using the full production pipeline (load → expand →
 * asset injection → element defaults) and returns the resolved sections.
 */
export async function importPageBySlug(slug: string): Promise<ComposerResult> {
  assertDevRoute();
  try {
    const props = await getPeblorPropsAsync(slug);
    if (!props) {
      return { ok: false, error: `No page found for slug "${slug}"` };
    }
    return {
      ok: true,
      sections: props.resolvedSections,
      bgJson: props.resolvedBg ? JSON.stringify(props.resolvedBg, null, 2) : null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Import failed",
    };
  }
}
