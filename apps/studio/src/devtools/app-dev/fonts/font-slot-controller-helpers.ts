import type { FontWeightMap } from "@/app/fonts/config";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";

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

const WEIGHT_NAMES: (keyof FontWeightMap)[] = ["thin", "light", "regular", "book", "bold", "black"];

function clampWght(n: number, wghtMin: number, wghtMax: number): number {
  const lo = Math.min(wghtMin, wghtMax);
  const hi = Math.max(wghtMin, wghtMax);
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function snapWghtToCatalogSteps(n: number, steps: number[]): number {
  const sorted = [...new Set(steps)].sort((a, b) => a - b);
  if (sorted.length < 2) return n;
  let best = sorted[0]!;
  let bestDist = Math.abs(best - n);
  for (const s of sorted) {
    const d = Math.abs(s - n);
    if (d < bestDist || (d === bestDist && s > best)) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

function syncLocalFileWeightsForPicker(
  current: SlotState,
  mode: Extract<WeightPickerMode, { kind: "localFiles" }>
): SlotState | null {
  const nextWeights = { ...current.weights };
  const nextRoleFiles = { ...current.localRoleFiles };
  const knownFileNames = new Set(mode.files.map((f) => f.fileName));
  let changed = false;
  for (const name of WEIGHT_NAMES) {
    const nextWeight = nextWeights[name];
    if (nextWeight !== undefined) {
      const clamped = clampWght(nextWeight, 100, 900);
      if (clamped !== nextWeight) {
        nextWeights[name] = clamped;
        changed = true;
      }
    }
    const selectedFile = nextRoleFiles[name];
    if (selectedFile === undefined || knownFileNames.has(selectedFile)) continue;
    const fallback = mode.files[WEIGHT_NAMES.indexOf(name) % mode.files.length]!.fileName;
    nextRoleFiles[name] = fallback;
    changed = true;
  }
  return changed ? { ...current, weights: nextWeights, localRoleFiles: nextRoleFiles } : null;
}

function syncStaticWeightsForPicker(
  current: SlotState,
  mode: Extract<WeightPickerMode, { kind: "static" }>
): SlotState | null {
  if (mode.options.length === 0) return null;
  const allowed = new Set(mode.options);
  const nextWeights = { ...current.weights };
  let changed = false;
  for (const name of WEIGHT_NAMES) {
    const nextWeight = nextWeights[name];
    if (nextWeight === undefined || allowed.has(nextWeight)) continue;
    nextWeights[name] = undefined;
    changed = true;
  }
  return changed ? { ...current, weights: nextWeights } : null;
}

function syncVariableWeightsForPicker(
  current: SlotState,
  mode: Extract<WeightPickerMode, { kind: "variable" }>,
  snapSteps: number[] | null
): SlotState | null {
  const nextWeights = { ...current.weights };
  let changed = false;
  for (const name of WEIGHT_NAMES) {
    const nextWeight = nextWeights[name];
    if (nextWeight === undefined) continue;
    let clamped = clampWght(nextWeight, mode.wghtMin, mode.wghtMax);
    if (snapSteps && snapSteps.length >= 2) clamped = snapWghtToCatalogSteps(clamped, snapSteps);
    if (clamped === nextWeight) continue;
    nextWeights[name] = clamped;
    changed = true;
  }
  return changed ? { ...current, weights: nextWeights } : null;
}

export function syncSlotStateForPicker(
  current: SlotState,
  mode: WeightPickerMode,
  snapSteps: number[] | null
): SlotState | null {
  if (mode.kind === "localFiles") return syncLocalFileWeightsForPicker(current, mode);
  if (mode.kind === "static") return syncStaticWeightsForPicker(current, mode);
  return syncVariableWeightsForPicker(current, mode, snapSteps);
}

export function weightPickerIdentity(weightPicker: WeightPickerMode): string {
  if (weightPicker.kind === "static") return `s:${weightPicker.options.join(",")}`;
  if (weightPicker.kind === "localFiles")
    return `lf:${weightPicker.files
      .map((f) => f.fileName)
      .sort()
      .join("\0")}`;
  return `v:${weightPicker.wghtMin}-${weightPicker.wghtMax}`;
}

export function fontClampIdentity({
  previewMode,
  family,
  weightPicker,
  localLibrary,
}: {
  previewMode: "catalog" | "local";
  family: string;
  weightPicker: WeightPickerMode;
  localLibrary?: LocalPreviewRuntime;
}): string {
  const localFiles = localLibrary?.files
    .map((f) => f.fileName)
    .sort()
    .join("\0");
  return [previewMode, family, weightPickerIdentity(weightPicker), localFiles ?? ""].join("|");
}

export function variableWeightRange(
  weightPicker: WeightPickerMode
): { min: number; max: number } | undefined {
  if (weightPicker.kind !== "variable") return undefined;
  return { min: weightPicker.wghtMin, max: weightPicker.wghtMax };
}

export function nextSlotStateForSemanticWeightUpdate({
  state,
  weightPicker,
  catalogVariableSnapSteps,
  name,
  value,
}: {
  state: SlotState;
  weightPicker: WeightPickerMode;
  catalogVariableSnapSteps: number[] | null;
  name: keyof FontWeightMap;
  value: number | undefined;
}): SlotState {
  if (value === undefined) {
    const localRoleFiles = { ...state.localRoleFiles };
    delete localRoleFiles[name];
    return { ...state, weights: { ...state.weights, [name]: undefined }, localRoleFiles };
  }
  if (weightPicker.kind !== "variable")
    return { ...state, weights: { ...state.weights, [name]: value } };
  let clamped = clampWght(value, weightPicker.wghtMin, weightPicker.wghtMax);
  if (catalogVariableSnapSteps && catalogVariableSnapSteps.length >= 2) {
    clamped = snapWghtToCatalogSteps(clamped, catalogVariableSnapSteps);
  }
  return { ...state, weights: { ...state.weights, [name]: clamped } };
}

export function nextSlotStateForLocalRoleFile({
  state,
  localLibrary,
  name,
  fileName,
}: {
  state: SlotState;
  localLibrary: LocalPreviewRuntime;
  name: keyof FontWeightMap;
  fileName: string;
}): SlotState {
  const file = localLibrary.files.find((x) => x.fileName === fileName);
  const inferred = file?.fontWeight ?? 400;
  return {
    ...state,
    localRoleFiles: { ...state.localRoleFiles, [name]: fileName },
    weights: { ...state.weights, [name]: inferred },
  };
}

export function nextSlotStateForLocalRoleToggle({
  state,
  localLibrary,
  name,
}: {
  state: SlotState;
  localLibrary: LocalPreviewRuntime;
  name: keyof FontWeightMap;
}): SlotState {
  const idx = WEIGHT_NAMES.indexOf(name);
  const file = localLibrary.files[idx % localLibrary.files.length]!;
  return {
    ...state,
    weights: { ...state.weights, [name]: file.fontWeight },
    localRoleFiles: { ...state.localRoleFiles, [name]: file.fileName },
  };
}
