/**
 * When `[pb: fill=...]` overrides the section background, the runtime uses a single
 * `fill` and drops `layers`. Preserve the inferred Figma stack in `meta.figma.originalLayers`.
 */

export type SectionFillLayerRow = {
  fill?: string;
  blendMode?: string;
  opacity?: number;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isLayerRowArray(value: unknown): value is SectionFillLayerRow[] {
  return Array.isArray(value);
}

/**
 * Applies an annotation fill override and stashes previous `layers` into `meta.figma.originalLayers`
 * when not already set.
 */
export function applySectionFillAnnotationOverride(
  sectionBase: Record<string, unknown>,
  annotationFill: string
): void {
  const layersUnknown = sectionBase["layers"];
  const metaIn = sectionBase["meta"];
  const meta: Record<string, unknown> = isPlainRecord(metaIn) ? { ...metaIn } : {};
  const figmaIn = meta["figma"];
  const figma: Record<string, unknown> = isPlainRecord(figmaIn) ? { ...figmaIn } : {};

  const shouldStashOriginalLayers =
    isLayerRowArray(layersUnknown) &&
    layersUnknown.length > 0 &&
    figma["originalLayers"] === undefined;

  if (shouldStashOriginalLayers) {
    figma["originalLayers"] = layersUnknown.map((row) => ({ ...row }));
    meta["figma"] = figma;
    sectionBase["meta"] = meta;
  }

  sectionBase["fill"] = annotationFill;
  delete sectionBase["layers"];
}
