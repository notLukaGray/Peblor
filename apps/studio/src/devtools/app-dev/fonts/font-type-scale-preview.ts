import type { FontWeightMap } from "@/app/fonts/config";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";

export type SlotName = "primary" | "secondary" | "mono";

type SlotPreviewMode = "catalog" | "local";

type SlotState = {
  family: string;
  weights: FontWeightMap;
  italic: boolean;
  source: "local" | "webfont";
  localRoleFiles?: Partial<Record<keyof FontWeightMap, string>>;
};

type WeightPickerMode =
  | { kind: "variable"; wghtMin: number; wghtMax: number }
  | { kind: "static"; options: number[] }
  | { kind: "localFiles"; files: LocalPreviewRuntime["files"] };

function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function variableAxisFromMeta(meta: BunnyFontMeta | undefined): {
  wghtMin: number;
  wghtMax: number;
} {
  const w = meta?.weights;
  if (!w?.length) return { wghtMin: 100, wghtMax: 900 };
  const lo = Math.min(...w);
  const hi = Math.max(...w);
  if (lo === hi) return { wghtMin: 100, wghtMax: 900 };
  return { wghtMin: lo, wghtMax: hi };
}

function resolveWeightPickerMode(
  previewMode: SlotPreviewMode,
  bunnyMeta: BunnyFontMeta | undefined,
  localLibrary: LocalPreviewRuntime | undefined
): WeightPickerMode {
  const hasLocalFiles = previewMode === "local" && Boolean(localLibrary?.files.length);
  if (hasLocalFiles) return { kind: "localFiles", files: localLibrary!.files };
  if (!bunnyMeta || bunnyMeta.variable === true) {
    return { kind: "variable", ...variableAxisFromMeta(bunnyMeta) };
  }
  const options = sortedStaticWeightOptions(bunnyMeta);
  return options.length > 0
    ? { kind: "static", options }
    : { kind: "variable", ...variableAxisFromMeta(bunnyMeta) };
}

function sortedStaticWeightOptions(bunnyMeta: BunnyFontMeta): number[] {
  const weights = bunnyMeta.weights;
  if (!weights || weights.length === 0) return [];
  return [...new Set(weights)].sort((a, b) => a - b);
}

export type TypeScaleFontPreviewSlot = {
  family: string;
  weights: FontWeightMap;
  variableFace: boolean;
  localRoles: { headingRole: keyof FontWeightMap; bodyRole: keyof FontWeightMap } | null;
};

function localRolesForTypeScaleSlot(
  slot: SlotName,
  effectiveSlotPreviewMode: Record<SlotName, SlotPreviewMode>,
  configs: Record<SlotName, SlotState>,
  previewActive: (s: SlotName) => boolean
): TypeScaleFontPreviewSlot["localRoles"] {
  if (effectiveSlotPreviewMode[slot] !== "local" || !previewActive(slot)) return null;
  const w = configs[slot].weights;
  return {
    headingRole: w.bold !== undefined ? "bold" : w.black !== undefined ? "black" : "regular",
    bodyRole:
      w.regular !== undefined
        ? "regular"
        : w.book !== undefined
          ? "book"
          : w.light !== undefined
            ? "light"
            : "thin",
  };
}

export function buildTypeScaleFontPreview({
  configs,
  effectiveSlotPreviewMode,
  fontList,
  previews,
  previewActive,
  faceForSlot,
}: {
  configs: Record<SlotName, SlotState>;
  effectiveSlotPreviewMode: Record<SlotName, SlotPreviewMode>;
  fontList: Record<string, BunnyFontMeta>;
  previews: Partial<Record<SlotName, LocalPreviewRuntime>>;
  previewActive: (slot: SlotName) => boolean;
  faceForSlot: (slot: SlotName) => string;
}): Record<SlotName, TypeScaleFontPreviewSlot> {
  const out = {} as Record<SlotName, TypeScaleFontPreviewSlot>;
  for (const slot of ["primary", "secondary", "mono"] as SlotName[]) {
    out[slot] = {
      family: faceForSlot(slot),
      weights: configs[slot].weights,
      variableFace:
        resolveWeightPickerMode(
          effectiveSlotPreviewMode[slot],
          fontList[slugify(configs[slot].family)],
          previews[slot]
        ).kind === "variable",
      localRoles: localRolesForTypeScaleSlot(
        slot,
        effectiveSlotPreviewMode,
        configs,
        previewActive
      ),
    };
  }
  return out;
}
