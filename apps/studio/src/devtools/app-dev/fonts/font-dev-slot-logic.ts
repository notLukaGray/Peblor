import type { FontWeightMap } from "@/app/fonts/config";
import type { TypeScaleConfig } from "@/app/fonts/type-scale";
import { TYPE_SCALE_VAR_PREFIXES } from "@/app/fonts/type-scale";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import type {
  LocalPreviewFileRuntime,
  LocalPreviewRuntime,
} from "@/app/dev/fonts/use-local-font-previews";
import type { SlotPreviewMode } from "./font-dev-persistence";
import { WEIGHT_NAMES } from "./font-dev-persistence";

export type WeightPickerMode =
  | { kind: "variable"; wghtMin: number; wghtMax: number }
  | { kind: "static"; options: number[] }
  | { kind: "localFiles"; files: LocalPreviewFileRuntime[] };

const VARIABLE_WGHT_FALLBACK_MIN = 100;
const VARIABLE_WGHT_FALLBACK_MAX = 900;
const SEMANTIC_IDEAL_WEIGHT: Record<keyof FontWeightMap, number> = {
  thin: 100,
  light: 300,
  book: 500,
  regular: 400,
  bold: 700,
  black: 900,
};

const SCALE_KEYS = Object.keys(TYPE_SCALE_VAR_PREFIXES) as (keyof TypeScaleConfig)[];

export function variableAxisFromMeta(meta: BunnyFontMeta | undefined): {
  wghtMin: number;
  wghtMax: number;
} {
  const weights = meta?.weights;
  if (!weights?.length) {
    return { wghtMin: VARIABLE_WGHT_FALLBACK_MIN, wghtMax: VARIABLE_WGHT_FALLBACK_MAX };
  }
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  if (min === max) {
    return { wghtMin: VARIABLE_WGHT_FALLBACK_MIN, wghtMax: VARIABLE_WGHT_FALLBACK_MAX };
  }
  return { wghtMin: min, wghtMax: max };
}

function variablePicker(meta: BunnyFontMeta | undefined): WeightPickerMode {
  const { wghtMin, wghtMax } = variableAxisFromMeta(meta);
  return { kind: "variable", wghtMin, wghtMax };
}

function clampWght(n: number, wghtMin: number, wghtMax: number): number {
  const lo = Math.min(wghtMin, wghtMax);
  const hi = Math.max(wghtMin, wghtMax);
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function staticWeightOptionLabel(weight: number): string {
  const hints: Partial<Record<number, string>> = {
    100: "Thin",
    200: "Extra light",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semibold",
    700: "Bold",
    800: "Extra bold",
    900: "Black",
  };
  return hints[weight] ? `${weight} — ${hints[weight]}` : String(weight);
}

export function staticSelectOptionLabel(
  weight: number,
  rowName: keyof FontWeightMap,
  allWeights: FontWeightMap
): string {
  const base = staticWeightOptionLabel(weight);
  const other = WEIGHT_NAMES.find((name) => name !== rowName && allWeights[name] === weight);
  return other ? `${base} · ${other}` : base;
}

function sortedStaticWeightOptions(bunnyMeta: BunnyFontMeta): number[] {
  if (!bunnyMeta.weights || bunnyMeta.weights.length === 0) return [];
  return [...new Set(bunnyMeta.weights)].sort((a, b) => a - b);
}

export function resolveWeightPickerMode(
  previewMode: SlotPreviewMode,
  bunnyMeta: BunnyFontMeta | undefined,
  localLibrary: LocalPreviewRuntime | undefined
): WeightPickerMode {
  const hasLocalFiles = previewMode === "local" && Boolean(localLibrary?.files.length);
  if (hasLocalFiles) return { kind: "localFiles", files: localLibrary!.files };
  if (!bunnyMeta) return variablePicker(undefined);
  if (bunnyMeta.variable) return variablePicker(bunnyMeta);
  const options = sortedStaticWeightOptions(bunnyMeta);
  return options.length > 0 ? { kind: "static", options } : variablePicker(bunnyMeta);
}

export function catalogVariableSnapStepsFromMeta(
  previewMode: SlotPreviewMode,
  bunnyMeta: BunnyFontMeta | undefined
): number[] | null {
  if (previewMode !== "catalog" || bunnyMeta?.variable !== true || bunnyMeta.weights.length < 2) {
    return null;
  }
  return [...new Set(bunnyMeta.weights)].sort((a, b) => a - b);
}

export function slugify(family: string): string {
  return family.toLowerCase().replace(/\s+/g, "-");
}

function defaultWeightForSemanticSlot(name: keyof FontWeightMap, picker: WeightPickerMode): number {
  const ideal = SEMANTIC_IDEAL_WEIGHT[name];
  if (picker.kind === "variable") return clampWght(ideal, picker.wghtMin, picker.wghtMax);
  if (picker.kind === "localFiles")
    return picker.files[WEIGHT_NAMES.indexOf(name) % picker.files.length]!.fontWeight;
  if (picker.options.length === 0) return ideal;
  const first = picker.options[0]!;
  return picker.options.reduce(
    (best, option) => (Math.abs(option - ideal) < Math.abs(best - ideal) ? option : best),
    first
  );
}

function assignStaticDefaults(options: number[]): FontWeightMap {
  const sorted = [...new Set(options)].sort((a, b) => a - b);
  const out: FontWeightMap = {};
  if (sorted.length === 0) return out;
  const first = sorted[0]!;
  for (const name of WEIGHT_NAMES) {
    const ideal = SEMANTIC_IDEAL_WEIGHT[name];
    out[name] = sorted.reduce(
      (best, option) => (Math.abs(option - ideal) < Math.abs(best - ideal) ? option : best),
      first
    );
  }
  return out;
}

export function initialLocalSlotAssignments(files: LocalPreviewFileRuntime[]): {
  weights: FontWeightMap;
  localRoleFiles: Partial<Record<keyof FontWeightMap, string>>;
} {
  const weights: FontWeightMap = {};
  const localRoleFiles: Partial<Record<keyof FontWeightMap, string>> = {};
  for (let i = 0; i < WEIGHT_NAMES.length; i++) {
    const name = WEIGHT_NAMES[i]!;
    const file = files[i % files.length]!;
    weights[name] = file.fontWeight;
    localRoleFiles[name] = file.fileName;
  }
  return { weights, localRoleFiles };
}

function usedStaticMastersExcept(
  weights: FontWeightMap,
  exceptName: keyof FontWeightMap
): Set<number> {
  const used = new Set<number>();
  for (const name of WEIGHT_NAMES) {
    if (name === exceptName) continue;
    if (weights[name] !== undefined) used.add(weights[name]!);
  }
  return used;
}

function firstUnusedStaticMaster(options: number[], used: Set<number>, ideal: number): number {
  const free = options.filter((weight) => !used.has(weight));
  if (free.length === 0) return options[0] ?? ideal;
  return free.reduce(
    (best, option) => (Math.abs(option - ideal) < Math.abs(best - ideal) ? option : best),
    free[0]!
  );
}

function defaultWeightsMap(picker: WeightPickerMode): FontWeightMap {
  if (picker.kind === "variable") {
    const weights: FontWeightMap = {};
    for (const name of WEIGHT_NAMES) weights[name] = defaultWeightForSemanticSlot(name, picker);
    return weights;
  }
  if (picker.kind === "localFiles") return initialLocalSlotAssignments(picker.files).weights;
  return assignStaticDefaults(picker.options);
}

export function defaultWeightsForCatalogSelection(
  family: string,
  fontList: Record<string, BunnyFontMeta>
): FontWeightMap {
  return defaultWeightsMap(
    resolveWeightPickerMode("catalog", fontList[slugify(family)], undefined)
  );
}

export function resolveWeightRowDefaultOnCheck(
  name: keyof FontWeightMap,
  allWeights: FontWeightMap,
  weightPicker: WeightPickerMode
): number {
  if (weightPicker.kind !== "static") return defaultWeightForSemanticSlot(name, weightPicker);
  return firstUnusedStaticMaster(
    weightPicker.options,
    usedStaticMastersExcept(allWeights, name),
    SEMANTIC_IDEAL_WEIGHT[name]
  );
}

export function injectFontLink(url: string): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[data-font-preview="${url}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.dataset.fontPreview = url;
  document.head.appendChild(link);
}

export { SCALE_KEYS };
