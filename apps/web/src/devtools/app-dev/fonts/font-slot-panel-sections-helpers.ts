"use client";

import type { CSSProperties } from "react";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";
import type { FontWeightMap } from "@/app/fonts/config";
import type { WeightPickerMode } from "./font-dev-slot-logic";
import type { SlotName } from "./font-dev-persistence";

export const SLOT_UI_LABEL: Record<SlotName, string> = {
  primary: "Primary",
  secondary: "Secondary",
  mono: "Mono",
};

export const WEIGHT_NAMES: (keyof FontWeightMap)[] = [
  "thin",
  "light",
  "regular",
  "book",
  "bold",
  "black",
];

export function wghtPreviewStyle(fontFamilyCss: string, weight: number, variableFace: boolean) {
  const style: CSSProperties = { fontFamily: fontFamilyCss, fontWeight: weight };
  if (variableFace) style.fontVariationSettings = `"wght" ${weight}`;
  return style;
}

export function localUploadSummaryText(localLibrary: LocalPreviewRuntime): string {
  if (localLibrary.files.length === 0) return "";
  const sample = localLibrary.files
    .slice(0, 2)
    .map((file) => file.fileName)
    .join(", ");
  const suffix = localLibrary.files.length > 2 ? "…" : "";
  return ` · ${sample}${suffix}`;
}

export function weightPickerHelpText(
  weightPicker: WeightPickerMode,
  catalogVariableSnapSteps: number[] | null
): string {
  if (weightPicker.kind === "localFiles") {
    return `${weightPicker.files.length} file${weightPicker.files.length === 1 ? "" : "s"}: choose which file each row uses. The number is the weight (100–900). Italic adds a second sample in faux italic if you don’t have an italic file.`;
  }
  if (weightPicker.kind === "variable") {
    if (catalogVariableSnapSteps) {
      return `This family loads separate files at: ${catalogVariableSnapSteps.join(", ")}. Typing a value in between rounds to the nearest so the preview matches what really loads (e.g. 150 → 200).`;
    }
    return `Variable weight range about ${weightPicker.wghtMin}–${weightPicker.wghtMax}. Enter a whole number in that range.`;
  }
  return `${weightPicker.options.length} weights available: ${weightPicker.options.join(", ")}. Turn on the rows you need; you can use the same weight on more than one row.`;
}
