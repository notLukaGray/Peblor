import type { ConversionContext } from "./types/figma-plugin";

type PageRecord = {
  slug: string;
  sectionOrder: string[];
  definitions: Record<string, unknown>;
  bgKey?: string;
};

type PromotionArgs = {
  page: PageRecord;
  section: Record<string, unknown>;
  sectionId: string;
  frameName: string;
  ctx: ConversionContext;
};

type PromotionResult = {
  promoted: boolean;
  dropSection: boolean;
};

const SECTION_BEHAVIOR_KEYS = new Set([
  "onVisible",
  "onInvisible",
  "onProgress",
  "onViewportProgress",
  "visibleWhen",
  "keyboardTriggers",
  "timerTriggers",
  "cursorTriggers",
  "scrollDirectionTriggers",
  "idleTriggers",
]);

export function promotePageBackgroundFromSection(args: PromotionArgs): PromotionResult {
  const { page, section, sectionId, frameName, ctx } = args;
  if (typeof page.bgKey === "string" && page.bgKey.trim().length > 0) {
    return { promoted: false, dropSection: false };
  }
  if (page.sectionOrder.length > 0) return { promoted: false, dropSection: false };

  const candidate = getBackgroundCandidate(section);
  if (!candidate) return { promoted: false, dropSection: false };

  const bgKey = ensureUniqueBgKey(`${sectionId}-bg`, page.definitions);
  page.definitions[bgKey] = candidate.definition;
  page.bgKey = bgKey;

  const hasContent = hasSectionContent(section);
  const hasBehavior = hasSectionBehavior(section);
  clearSectionBackgroundFields(section);

  if (hasContent || hasBehavior) {
    ctx.warnings.push(
      `[info] "${frameName}" promoted section background (${candidate.reason}) to page bgKey "${bgKey}" and removed section-level fill fields.`
    );
    return { promoted: true, dropSection: false };
  }

  ctx.warnings.push(
    `[info] "${frameName}" promoted as page background (${candidate.reason}) with bgKey "${bgKey}" and skipped creating an empty section.`
  );
  return { promoted: true, dropSection: true };
}

function hasSectionContent(section: Record<string, unknown>): boolean {
  for (const key of ["elements", "collapsedElements", "revealedElements"] as const) {
    const value = section[key];
    if (Array.isArray(value) && value.length > 0) return true;
  }
  return false;
}

function hasSectionBehavior(section: Record<string, unknown>): boolean {
  return Object.keys(section).some((key) => SECTION_BEHAVIOR_KEYS.has(key));
}

function clearSectionBackgroundFields(section: Record<string, unknown>): void {
  delete section.fill;
  delete section.layers;
  delete section.bgImage;
}

function getBackgroundCandidate(
  section: Record<string, unknown>
): { reason: "bgImage" | "layers" | "fill"; definition: Record<string, unknown> } | null {
  const bgImage = section.bgImage;
  if (typeof bgImage === "string" && bgImage.trim().length > 0) {
    return { reason: "bgImage", definition: { type: "backgroundImage", image: bgImage } };
  }

  const layers = section.layers;
  if (Array.isArray(layers) && layers.length > 0) {
    return {
      reason: "layers",
      definition: { type: "backgroundVariable", layers: JSON.parse(JSON.stringify(layers)) },
    };
  }

  const fill = section.fill;
  if (typeof fill === "string" && fill.trim().length > 0) {
    return {
      reason: "fill",
      definition: { type: "backgroundVariable", layers: [{ fill }] },
    };
  }

  return null;
}

function ensureUniqueBgKey(baseKey: string, definitions: Record<string, unknown>): string {
  if (!(baseKey in definitions)) return baseKey;
  let i = 2;
  while (`${baseKey}-${i}` in definitions) i += 1;
  return `${baseKey}-${i}`;
}
