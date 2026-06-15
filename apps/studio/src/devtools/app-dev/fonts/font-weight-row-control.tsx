"use client";

import { useState } from "react";
import type { FontWeightMap } from "@/app/fonts/config";
import type { LocalPreviewFileRuntime } from "@/app/dev/fonts/use-local-font-previews";

export type WeightPickerMode =
  | { kind: "variable"; wghtMin: number; wghtMax: number }
  | { kind: "static"; options: number[] }
  | { kind: "localFiles"; files: LocalPreviewFileRuntime[] };

function clampWght(value: number, wghtMin: number, wghtMax: number): number {
  const lo = Math.min(wghtMin, wghtMax);
  const hi = Math.max(wghtMin, wghtMax);
  return Math.min(hi, Math.max(lo, Math.round(value)));
}

function snapWghtToCatalogSteps(value: number, steps: number[]): number {
  const sorted = [...new Set(steps)].sort((a, b) => a - b);
  if (sorted.length < 2) return value;
  let best = sorted[0]!;
  let bestDist = Math.abs(best - value);
  for (const step of sorted) {
    const dist = Math.abs(step - value);
    if (dist < bestDist || (dist === bestDist && step > best)) {
      best = step;
      bestDist = dist;
    }
  }
  return best;
}

function VariableWeightInput({
  weight,
  wghtMin,
  wghtMax,
  catalogSnapSteps,
  onCommit,
  className,
}: {
  weight: number;
  wghtMin: number;
  wghtMax: number;
  catalogSnapSteps: number[] | null;
  onCommit: (value: number) => void;
  className: string;
}) {
  const [text, setText] = useState(String(weight));
  const commitFromText = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") return void setText(String(weight));
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return void setText(String(weight));
    let next = clampWght(parsed, wghtMin, wghtMax);
    if (catalogSnapSteps && catalogSnapSteps.length >= 2) {
      next = snapWghtToCatalogSteps(next, catalogSnapSteps);
    }
    onCommit(next);
    setText(String(next));
  };
  const snapHint =
    catalogSnapSteps && catalogSnapSteps.length >= 2
      ? ` This family only ships these weights: ${catalogSnapSteps.join(", ")}. Numbers in between round to the closest (e.g. 150 → 200).`
      : "";
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      title={`Weight range: ${wghtMin}–${wghtMax}.${snapHint} Tab or Enter to apply.`}
      value={text}
      onFocus={() => setText(String(weight))}
      onBlur={() => commitFromText(text)}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
      onChange={(event) => {
        const value = event.target.value;
        if (value === "" || /^\d+$/.test(value)) setText(value);
      }}
      className={className}
    />
  );
}

function localFileOptionLabel(file: LocalPreviewFileRuntime): string {
  return `${file.fileName}  ·  ${file.fontWeight} ${file.fontStyle}`;
}

type WeightRowValueControlProps = {
  name: keyof FontWeightMap;
  value: number | undefined;
  defined: boolean;
  allWeights: FontWeightMap;
  weightPicker: WeightPickerMode;
  catalogVariableSnapSteps: number[] | null;
  localRoleFileName?: string;
  onLocalRoleFileChange?: (fileName: string) => void;
  onChange: (value: number | undefined) => void;
  staticOptionLabel: (w: number, rowName: keyof FontWeightMap, allWeights: FontWeightMap) => string;
};

export function WeightRowValueControl({
  name,
  value,
  defined,
  allWeights,
  weightPicker,
  catalogVariableSnapSteps,
  localRoleFileName,
  onLocalRoleFileChange,
  onChange,
  staticOptionLabel,
}: WeightRowValueControlProps) {
  if (!defined || value === undefined) return null;
  if (weightPicker.kind === "localFiles") {
    return (
      <>
        {onLocalRoleFileChange ? (
          <select
            value={localRoleFileName ?? weightPicker.files[0]!.fileName}
            onChange={(event) => onLocalRoleFileChange(event.target.value)}
            title="Which file this row uses. The number is the weight (100–900)."
            className="min-w-0 max-w-[min(100%,14rem)] shrink rounded border border-border bg-background px-2 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {weightPicker.files.map((file) => (
              <option key={file.fileName} value={file.fileName}>
                {localFileOptionLabel(file)}
              </option>
            ))}
          </select>
        ) : null}
        <VariableWeightInput
          weight={value}
          wghtMin={100}
          wghtMax={900}
          catalogSnapSteps={null}
          onCommit={(next) => onChange(next)}
          className="w-[4.5rem] rounded border border-border bg-background px-2 py-0.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </>
    );
  }
  if (weightPicker.kind === "variable") {
    return (
      <VariableWeightInput
        key={`${weightPicker.wghtMin}-${weightPicker.wghtMax}-${value}`}
        weight={value}
        wghtMin={weightPicker.wghtMin}
        wghtMax={weightPicker.wghtMax}
        catalogSnapSteps={catalogVariableSnapSteps}
        onCommit={(next) => onChange(next)}
        className="w-[4.5rem] rounded border border-border bg-background px-2 py-0.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }
  return (
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      title="Pick a weight from this family. You can use the same weight on more than one row."
      className="min-w-[8.5rem] max-w-[14rem] rounded border border-border bg-background px-2 py-0.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {weightPicker.options.map((weight) => (
        <option key={weight} value={weight}>
          {staticOptionLabel(weight, name, allWeights)}
        </option>
      ))}
    </select>
  );
}
