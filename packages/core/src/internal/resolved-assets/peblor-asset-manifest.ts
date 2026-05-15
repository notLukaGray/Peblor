import type { bgBlock, SectionBlock } from "@pb/contracts";
import { walkPeblorAssetTree } from "./peblor-asset-tree-walk";

export type AssetManifestEntry = {
  key: string;
  elementPath: string;
  resolvedUrl: string | null;
  exists: boolean | null;
};

export type AssetManifestOptions = {
  concurrency?: number;
  timeoutMs?: number;
};

type Collector = {
  entries: { key: string; value: string; path: string }[];
};

function buildPath(sectionIndex: number, elementIndex: number | null, keyName: string): string {
  if (elementIndex == null) return `sections[${sectionIndex}].${keyName}`;
  return `sections[${sectionIndex}].elements[${elementIndex}].${keyName}`;
}

export function buildAssetManifest(
  bg: bgBlock | null,
  sections: SectionBlock[],
  urlByRef: Map<string, string | null>,
  _options?: AssetManifestOptions
): AssetManifestEntry[] {
  const collector: Collector = { entries: [] };

  // Walk the bg block.
  if (bg) {
    const bgRec = bg as Record<string, unknown>;
    walkPeblorAssetTree(bg, [], (_key, value) => {
      if (typeof value === "string" && value) {
        collector.entries.push({ key: "bg.unknown", value, path: "bg" });
      }
    });
    // Better: walk bg directly
    for (const [key, val] of Object.entries(bgRec)) {
      if (typeof val === "string" && val) {
        collector.entries.push({ key, value: val, path: `bg.${key}` });
      }
    }
  }

  // Walk each section.
  for (let si = 0; si < sections.length; si += 1) {
    const section = sections[si];
    if (!section || typeof section !== "object") continue;

    const sectionRec = section as SectionBlock & Record<string, unknown>;

    // Section-level asset keys.
    const sectionKeys = ["poster", "src", "url", "image", "video"];
    for (const key of sectionKeys) {
      const val = sectionRec[key];
      if (typeof val === "string" && val) {
        collector.entries.push({
          key,
          value: val,
          path: buildPath(si, null, key),
        });
      }
    }

    // Elements.
    const elements = (sectionRec as { elements?: Array<Record<string, unknown>> }).elements;
    if (Array.isArray(elements)) {
      for (let ei = 0; ei < elements.length; ei += 1) {
        const el = elements[ei];
        if (!el || typeof el !== "object") continue;
        for (const key of sectionKeys) {
          const val = el[key];
          if (typeof val === "string" && val) {
            collector.entries.push({
              key,
              value: val,
              path: buildPath(si, ei, key),
            });
          }
        }
        // Recurse into sources array.
        if (Array.isArray(el.sources)) {
          for (let si2 = 0; si2 < (el.sources as Array<Record<string, unknown>>).length; si2 += 1) {
            const src = (el.sources as Array<Record<string, unknown>>)[si2];
            if (!src || typeof src !== "object") continue;
            for (const key of sectionKeys) {
              const val = src[key];
              if (typeof val === "string" && val) {
                collector.entries.push({
                  key,
                  value: val,
                  path: buildPath(si, ei, `sources[${si2}].${key}`),
                });
              }
            }
          }
        }
        // Module config slots.
        if (el.moduleConfig && typeof el.moduleConfig === "object") {
          const mc = el.moduleConfig as Record<string, unknown>;
          const slots = mc.slots as
            | Record<string, { section?: { definitions?: Record<string, unknown> } }>
            | undefined;
          if (slots && typeof slots === "object") {
            for (const [slotKey, slot] of Object.entries(slots)) {
              const slotSection = slot?.section;
              if (slotSection?.definitions && typeof slotSection.definitions === "object") {
                for (const [defKey, def] of Object.entries(slotSection.definitions)) {
                  if (!def || typeof def !== "object") continue;
                  const defRec = def as Record<string, unknown>;
                  for (const key of sectionKeys) {
                    const val = defRec[key];
                    if (typeof val === "string" && val) {
                      collector.entries.push({
                        key,
                        value: val,
                        path: buildPath(si, ei, `moduleConfig.slots.${slotKey}.${defKey}.${key}`),
                      });
                    }
                  }
                }
              }
            }
          }
        }
        // Nested group/infinite scroll definitions.
        const nestedSection = (el as { section?: { definitions?: Record<string, unknown> } })
          .section;
        if (nestedSection?.definitions && typeof nestedSection.definitions === "object") {
          for (const [defKey, def] of Object.entries(nestedSection.definitions)) {
            if (!def || typeof def !== "object") continue;
            const defRec = def as Record<string, unknown>;
            for (const key of sectionKeys) {
              const val = defRec[key];
              if (typeof val === "string" && val) {
                collector.entries.push({
                  key,
                  value: val,
                  path: buildPath(si, ei, `section.${defKey}.${key}`),
                });
              }
            }
          }
        }
        // 3D model subtree: walk materials, textures, models, scene.
        if (el.type === "elementModel3D") {
          walkModel3DManifest(el, buildPath(si, ei, ""), sectionKeys, collector);
        }
      }
    }

    // Reveal section branches.
    const rev = sectionRec as {
      collapsedElements?: Array<Record<string, unknown>>;
      revealedElements?: Array<Record<string, unknown>>;
    };
    const revealBranches = [
      { key: "collapsedElements", arr: rev.collapsedElements },
      { key: "revealedElements", arr: rev.revealedElements },
    ];
    for (const branch of revealBranches) {
      if (!Array.isArray(branch.arr)) continue;
      for (let ei = 0; ei < branch.arr.length; ei += 1) {
        const el = branch.arr[ei];
        if (!el || typeof el !== "object") continue;
        for (const key of sectionKeys) {
          const val = el[key];
          if (typeof val === "string" && val) {
            collector.entries.push({
              key,
              value: val,
              path: buildPath(si, ei, `${branch.key}[${ei}].${key}`),
            });
          }
        }
      }
    }
  }

  const manifest: AssetManifestEntry[] = [];
  const seen = new Set<string>();

  for (const entry of collector.entries) {
    if (
      entry.value.startsWith("http://") ||
      entry.value.startsWith("https://") ||
      entry.value.startsWith("/api/media/") ||
      entry.value.startsWith("data:")
    )
      continue;
    if (seen.has(entry.value)) continue;
    seen.add(entry.value);

    const resolvedUrl = urlByRef.get(entry.value) ?? null;
    manifest.push({
      key: entry.value,
      elementPath: entry.path,
      resolvedUrl,
      exists: resolvedUrl !== null,
    });
  }

  return manifest;
}

function walkModel3DManifest(
  node: Record<string, unknown>,
  basePath: string,
  assetKeys: string[],
  collector: Collector
): void {
  for (const key of assetKeys) {
    const val = node[key];
    if (typeof val === "string" && val) {
      collector.entries.push({
        key,
        value: val,
        path: `${basePath}.${key}`,
      });
    }
  }
  const modelKeys = ["textures", "materials", "models", "scene", "environment", "contents"];
  for (const subKey of modelKeys) {
    const sub = node[subKey];
    if (sub && typeof sub === "object" && !Array.isArray(sub)) {
      const subRec = sub as Record<string, unknown>;
      for (const [innerKey, innerVal] of Object.entries(subRec)) {
        if (innerVal && typeof innerVal === "object" && !Array.isArray(innerVal)) {
          walkModel3DManifest(
            innerVal as Record<string, unknown>,
            `${basePath}.${subKey}.${innerKey}`,
            assetKeys,
            collector
          );
        }
      }
    }
  }
}
