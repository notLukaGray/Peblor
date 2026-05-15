import type { ExportResult, SectionExportArtifact } from "./types/figma-plugin";
import type { PreviewItem } from "./main-responsive-pairs";

export function buildSectionExportArtifact(
  result: ExportResult,
  item: PreviewItem | undefined
): SectionExportArtifact | null {
  if (!item) return null;

  const pageSection = extractSectionFromPageLike(result.pages[item.target.key]);
  if (pageSection) {
    return buildSectionArtifactPayload(item, pageSection.sectionId, pageSection.section, {
      slug: item.target.key,
      title: item.target.label,
      detectBackgroundCandidate: true,
    });
  }

  const modalSection = extractSectionFromPageLike(result.modals[item.target.key]);
  if (modalSection) {
    return buildSectionArtifactPayload(item, modalSection.sectionId, modalSection.section, {
      slug: item.target.key,
      title: item.target.label,
      detectBackgroundCandidate: false,
    });
  }

  const presetRaw = result.presets[item.target.key];
  if (!presetRaw || typeof presetRaw !== "object" || Array.isArray(presetRaw)) return null;
  const section = presetRaw as Record<string, unknown>;
  const sectionId = ensureSectionId(section, item.target.key);
  return buildSectionArtifactPayload(item, sectionId, section, {
    slug: item.target.key,
    title: item.target.label,
    detectBackgroundCandidate: false,
  });
}

export function inferSectionBackgroundCandidate(
  section: Record<string, unknown>,
  sectionId: string
): SectionExportArtifact["backgroundCandidate"] | undefined {
  const bgKey = `${sectionId}-bg`;
  const bgImage = section.bgImage;
  if (typeof bgImage === "string" && bgImage.trim().length > 0) {
    return {
      reason: "section-bgimage",
      bgKey,
      definition: { type: "backgroundImage", image: bgImage },
    };
  }

  const layers = section.layers;
  if (Array.isArray(layers) && layers.length > 0) {
    return {
      reason: "section-layers",
      bgKey,
      definition: { type: "backgroundVariable", layers: JSON.parse(JSON.stringify(layers)) },
    };
  }

  const fill = section.fill;
  if (typeof fill === "string" && fill.trim().length > 0) {
    return {
      reason: "section-fill",
      bgKey,
      definition: { type: "backgroundVariable", layers: [{ fill }] },
    };
  }
  return undefined;
}

function extractSectionFromPageLike(
  value: unknown
): { sectionId: string; section: Record<string, unknown> } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as { sectionOrder?: unknown[]; definitions?: Record<string, unknown> };
  const sectionOrder = Array.isArray(rec.sectionOrder)
    ? rec.sectionOrder.filter((entry): entry is string => typeof entry === "string")
    : [];
  const sectionId = sectionOrder[0];
  if (!sectionId) return null;
  const section = rec.definitions?.[sectionId];
  if (!section || typeof section !== "object" || Array.isArray(section)) return null;
  return { sectionId, section: section as Record<string, unknown> };
}

function ensureSectionId(section: Record<string, unknown>, fallback: string): string {
  const currentId = section.id;
  if (typeof currentId === "string" && currentId.trim().length > 0) return currentId.trim();
  section.id = fallback;
  return fallback;
}

function buildSectionArtifactPayload(
  item: PreviewItem,
  sectionId: string,
  section: Record<string, unknown>,
  options: { slug: string; title: string; detectBackgroundCandidate: boolean }
): SectionExportArtifact {
  const artifact: SectionExportArtifact = {
    version: 1,
    frame: { id: item.id, name: item.name },
    target: { type: item.target.type, key: item.target.key, label: item.target.label },
    sectionId,
    section,
    indexPatch: {
      slug: options.slug,
      title: options.title,
      sectionOrder: [sectionId],
      definitions: {},
    },
    paths: {
      index: `content/pages/${options.slug}/index.json`,
      section: `content/pages/${options.slug}/${sectionId}.json`,
    },
  };
  if (options.detectBackgroundCandidate) {
    const backgroundCandidate = inferSectionBackgroundCandidate(section, sectionId);
    if (backgroundCandidate) artifact.backgroundCandidate = backgroundCandidate;
  }
  return artifact;
}
