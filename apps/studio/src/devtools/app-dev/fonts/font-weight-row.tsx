"use client";

import type { CSSProperties } from "react";
import type { FontWeightMap } from "@/app/fonts/config";
import { WeightRowValueControl, type WeightPickerMode } from "./font-weight-row-control";

function wghtPreviewStyle(
  fontFamilyCss: string,
  weight: number,
  variableFace: boolean
): CSSProperties {
  const style: CSSProperties = { fontFamily: fontFamilyCss, fontWeight: weight };
  if (variableFace) style.fontVariationSettings = `"wght" ${weight}`;
  return style;
}

export function WeightRow({
  name,
  value,
  allWeights,
  family,
  italic,
  sampleText,
  weightPicker,
  catalogVariableSnapSteps,
  localRoleFileName,
  onLocalRoleFileChange,
  onRoleToggle,
  onChange,
  defaultOnCheck,
  staticOptionLabel,
}: {
  name: keyof FontWeightMap;
  value: number | undefined;
  allWeights: FontWeightMap;
  family: string;
  italic: boolean;
  sampleText: string;
  weightPicker: WeightPickerMode;
  catalogVariableSnapSteps: number[] | null;
  localRoleFileName?: string;
  onLocalRoleFileChange?: (fileName: string) => void;
  onRoleToggle?: (enabled: boolean) => void;
  onChange: (v: number | undefined) => void;
  defaultOnCheck: number;
  staticOptionLabel: (w: number, rowName: keyof FontWeightMap, allWeights: FontWeightMap) => string;
}) {
  const defined = value !== undefined;
  const rowVariableFace = weightPicker.kind === "variable";
  const previewWeight = weightPicker.kind === "localFiles" ? 400 : (value ?? 400);

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0 flex-wrap">
      <label className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">{name}</label>
      <input
        type="checkbox"
        checked={defined}
        onChange={(event) =>
          onRoleToggle
            ? onRoleToggle(event.target.checked)
            : onChange(event.target.checked ? defaultOnCheck : undefined)
        }
        className="shrink-0"
      />
      <WeightRowValueControl
        name={name}
        value={value}
        defined={defined}
        allWeights={allWeights}
        weightPicker={weightPicker}
        catalogVariableSnapSteps={catalogVariableSnapSteps}
        localRoleFileName={localRoleFileName}
        onLocalRoleFileChange={onLocalRoleFileChange}
        onChange={onChange}
        staticOptionLabel={staticOptionLabel}
      />
      {defined ? (
        <>
          <p
            className="flex-1 min-w-0 truncate text-foreground text-sm"
            style={{
              ...wghtPreviewStyle(`'${family}', sans-serif`, previewWeight, rowVariableFace),
            }}
          >
            {sampleText}
          </p>
          {italic ? (
            <p
              className="hidden md:block flex-1 min-w-0 truncate text-muted-foreground text-sm italic"
              style={{
                ...wghtPreviewStyle(`'${family}', sans-serif`, previewWeight, rowVariableFace),
                fontStyle: "italic",
              }}
            >
              {sampleText}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
