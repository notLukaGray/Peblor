"use client";

import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import type { FontWeightMap } from "@/app/fonts/config";
import { localRolePreviewFamily } from "@/app/dev/fonts/local-font-preview";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";
import type { WeightPickerMode } from "./font-dev-slot-logic";
import type { SlotName, SlotState } from "./font-dev-persistence";
import { FontPicker } from "./font-picker";
import {
  SLOT_UI_LABEL,
  weightPickerHelpText,
  WEIGHT_NAMES,
  wghtPreviewStyle,
} from "./font-slot-panel-sections-helpers";
import { WeightRow } from "./font-weight-row";

export { SlotPanelUploads } from "./font-slot-panel-uploads";

export function SlotPanelHeader({
  slot,
  state,
  fontList,
  previewMode,
  localLibrary,
  onPreviewCatalog,
  onPreviewLocal,
  onUpdate,
  previewSampleText,
  modeBadgeText,
}: {
  slot: SlotName;
  state: SlotState;
  fontList: Record<string, BunnyFontMeta>;
  previewMode: "catalog" | "local";
  localLibrary?: LocalPreviewRuntime;
  onPreviewCatalog: (family: string) => void;
  onPreviewLocal: () => void;
  onUpdate: (s: SlotState) => void;
  previewSampleText: string;
  modeBadgeText?: string;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide w-20 shrink-0">
        {SLOT_UI_LABEL[slot]}
      </span>
      <div className="flex-1 min-w-[200px]">
        <FontPicker
          slot={slot}
          value={state.family}
          fontList={fontList}
          previewMode={previewMode}
          localLibrary={localLibrary}
          onSelectCatalog={onPreviewCatalog}
          onSelectLocal={onPreviewLocal}
          previewSampleText={previewSampleText}
        />
      </div>
      <label className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px] cursor-pointer">
        <input
          type="checkbox"
          checked={state.italic}
          onChange={(e) => onUpdate({ ...state, italic: e.target.checked })}
        />
        italic
      </label>
      {modeBadgeText ? (
        <span className="font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
          {modeBadgeText}
        </span>
      ) : null}
    </div>
  );
}

export function SlotPanelActiveWeightPreview({
  slot,
  state,
  weightPicker,
  previewFamily,
  previewSampleText,
}: {
  slot: SlotName;
  state: SlotState;
  weightPicker: WeightPickerMode;
  previewFamily: string;
  previewSampleText: string;
}) {
  const visibleWeights = WEIGHT_NAMES.filter((name) => state.weights[name] !== undefined);
  if (visibleWeights.length === 0) {
    return (
      <div className="space-y-2.5 py-3 border-y border-border/40">
        <p className="text-sm text-muted-foreground py-1">
          Turn on weights below — each line shows that weight in the sample.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5 py-3 border-y border-border/40">
      {visibleWeights.map((name) => {
        const w = state.weights[name]!;
        const previewFace =
          weightPicker.kind === "localFiles" ? localRolePreviewFamily(slot, name) : previewFamily;
        const previewWeight = weightPicker.kind === "localFiles" ? 400 : w;
        return (
          <div
            key={name}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4 min-w-0"
          >
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide w-14 shrink-0 pt-0.5">
              {name}
            </span>
            <p
              className="text-lg md:text-2xl leading-snug text-foreground min-w-0 flex-1 break-words"
              style={wghtPreviewStyle(
                `'${previewFace}', sans-serif`,
                previewWeight,
                weightPicker.kind === "variable"
              )}
            >
              {previewSampleText}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function SlotPanelWeightsEditor({
  slot,
  state,
  previewFamily,
  previewSampleText,
  weightPicker,
  catalogVariableSnapSteps,
  setLocalRoleFile,
  toggleLocalRole,
  updateSemanticWeight,
  resolveDefaultOnCheck,
  staticOptionLabel,
}: {
  slot: SlotName;
  state: SlotState;
  previewFamily: string;
  previewSampleText: string;
  weightPicker: WeightPickerMode;
  catalogVariableSnapSteps: number[] | null;
  setLocalRoleFile: (name: keyof FontWeightMap, fileName: string) => void;
  toggleLocalRole: (name: keyof FontWeightMap, enabled: boolean) => void;
  updateSemanticWeight: (name: keyof FontWeightMap, value: number | undefined) => void;
  resolveDefaultOnCheck: (
    name: keyof FontWeightMap,
    allWeights: FontWeightMap,
    weightPicker: WeightPickerMode
  ) => number;
  staticOptionLabel: (w: number, rowName: keyof FontWeightMap, allWeights: FontWeightMap) => string;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">
        Weights
      </p>
      <p className="text-[10px] text-muted-foreground mb-2 leading-snug">
        {weightPickerHelpText(weightPicker, catalogVariableSnapSteps)}
      </p>
      {WEIGHT_NAMES.map((name) => (
        <WeightRow
          key={name}
          name={name}
          value={state.weights[name]}
          allWeights={state.weights}
          family={
            weightPicker.kind === "localFiles" ? localRolePreviewFamily(slot, name) : previewFamily
          }
          italic={state.italic}
          sampleText={previewSampleText}
          weightPicker={weightPicker}
          catalogVariableSnapSteps={catalogVariableSnapSteps}
          localRoleFileName={state.localRoleFiles?.[name]}
          onLocalRoleFileChange={
            weightPicker.kind === "localFiles" ? (fn) => setLocalRoleFile(name, fn) : undefined
          }
          onRoleToggle={
            weightPicker.kind === "localFiles" ? (en) => toggleLocalRole(name, en) : undefined
          }
          onChange={(v) => updateSemanticWeight(name, v)}
          defaultOnCheck={resolveDefaultOnCheck(name, state.weights, weightPicker)}
          staticOptionLabel={staticOptionLabel}
        />
      ))}
    </div>
  );
}
