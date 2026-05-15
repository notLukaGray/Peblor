"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { FontWeightMap } from "@/app/fonts/config";
import { buildBunnyFontUrl } from "@/app/fonts/webfont";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import type {
  LocalPreviewFileRuntime,
  LocalPreviewRuntime,
} from "@/app/dev/fonts/use-local-font-previews";
import {
  SlotPanelActiveWeightPreview,
  SlotPanelHeader,
  SlotPanelUploads,
  SlotPanelWeightsEditor,
} from "./font-slot-panel-sections";
import {
  fontClampIdentity,
  nextSlotStateForLocalRoleFile,
  nextSlotStateForLocalRoleToggle,
  nextSlotStateForSemanticWeightUpdate,
  syncSlotStateForPicker,
  variableWeightRange,
  weightPickerIdentity,
} from "./font-slot-controller-helpers";
import type { SlotName, SlotPreviewMode, SlotState } from "./font-dev-persistence";

type WeightPickerMode =
  | { kind: "variable"; wghtMin: number; wghtMax: number }
  | { kind: "static"; options: number[] }
  | { kind: "localFiles"; files: LocalPreviewFileRuntime[] };

type Props = {
  slot: SlotName;
  state: SlotState;
  fontList: Record<string, BunnyFontMeta>;
  onUpdate: (s: SlotState) => void;
  previewFamily: string;
  previewMode: SlotPreviewMode;
  localLibrary?: LocalPreviewRuntime;
  onPreviewCatalog: (family: string) => void;
  onPreviewLocal: () => void;
  onLocalUploadFiles: (files: File[]) => void;
  onClearLocal: () => void;
  previewSampleText: string;
  slugify: (family: string) => string;
  injectFontLink: (url: string) => void;
  resolveWeightPickerMode: (
    previewMode: SlotPreviewMode,
    bunnyMeta: BunnyFontMeta | undefined,
    localLibrary: LocalPreviewRuntime | undefined
  ) => WeightPickerMode;
  catalogVariableSnapStepsFromMeta: (
    previewMode: SlotPreviewMode,
    bunnyMeta: BunnyFontMeta | undefined
  ) => number[] | null;
  staticOptionLabel: (
    weight: number,
    rowName: keyof FontWeightMap,
    allWeights: FontWeightMap
  ) => string;
  resolveDefaultOnCheck: (
    name: keyof FontWeightMap,
    allWeights: FontWeightMap,
    weightPicker: WeightPickerMode
  ) => number;
  variableAxisFromMeta: (meta: BunnyFontMeta | undefined) => { wghtMin: number; wghtMax: number };
};

export function FontSlotPanel({
  slot,
  state,
  fontList,
  onUpdate,
  previewFamily,
  previewMode,
  localLibrary,
  onPreviewCatalog,
  onPreviewLocal,
  onLocalUploadFiles,
  onClearLocal,
  previewSampleText,
  slugify,
  injectFontLink,
  resolveWeightPickerMode,
  catalogVariableSnapStepsFromMeta,
  staticOptionLabel,
  resolveDefaultOnCheck,
  variableAxisFromMeta,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const skipBunny = previewMode === "local" && (localLibrary?.files.length ?? 0) > 0;

  const bunnyMeta = fontList[slugify(state.family)];
  const catalogVariableSnapSteps = catalogVariableSnapStepsFromMeta(previewMode, bunnyMeta);
  const weightPicker = resolveWeightPickerMode(previewMode, bunnyMeta, localLibrary);
  const weightPickerKey = weightPickerIdentity(weightPicker);
  const variableWghtRange = variableWeightRange(weightPicker);

  useEffect(() => {
    if (skipBunny) return;
    const url = buildBunnyFontUrl(state.family, state.weights, state.italic, { variableWghtRange });
    injectFontLink(url);
  }, [
    skipBunny,
    state.family,
    state.weights,
    state.italic,
    weightPickerKey,
    weightPicker.kind,
    variableWghtRange,
    injectFontLink,
  ]);

  const fontClampKey = fontClampIdentity({
    previewMode,
    family: state.family,
    weightPicker,
    localLibrary,
  });
  const clampSnapSteps = catalogVariableSnapStepsFromMeta(previewMode, bunnyMeta);

  const stateRef = useRef(state);
  const onUpdateRef = useRef(onUpdate);
  useLayoutEffect(() => {
    stateRef.current = state;
    onUpdateRef.current = onUpdate;
  }, [state, onUpdate]);

  useEffect(() => {
    const nextState = syncSlotStateForPicker(stateRef.current, weightPicker, clampSnapSteps);
    if (nextState) onUpdateRef.current(nextState);
  }, [fontClampKey, weightPicker, clampSnapSteps]);

  function updateSemanticWeight(name: keyof FontWeightMap, value: number | undefined) {
    onUpdate(
      nextSlotStateForSemanticWeightUpdate({
        state,
        weightPicker,
        catalogVariableSnapSteps,
        name,
        value,
      })
    );
  }

  function setLocalRoleFile(name: keyof FontWeightMap, fileName: string) {
    if (weightPicker.kind !== "localFiles" || !localLibrary?.files.length) return;
    onUpdate(nextSlotStateForLocalRoleFile({ state, localLibrary, name, fileName }));
  }

  function toggleLocalRole(name: keyof FontWeightMap, enabled: boolean) {
    if (!enabled) {
      updateSemanticWeight(name, undefined);
      return;
    }
    if (weightPicker.kind !== "localFiles" || !localLibrary?.files.length) return;
    onUpdate(nextSlotStateForLocalRoleToggle({ state, localLibrary, name }));
  }

  const modeBadgeText =
    bunnyMeta && previewMode === "catalog"
      ? bunnyMeta.variable
        ? `Variable · ${variableAxisFromMeta(bunnyMeta).wghtMin}–${variableAxisFromMeta(bunnyMeta).wghtMax}`
        : "Static"
      : undefined;

  return (
    <div className="rounded-lg border border-border bg-card/20 p-5 space-y-4">
      <SlotPanelHeader
        slot={slot}
        state={state}
        fontList={fontList}
        previewMode={previewMode}
        localLibrary={localLibrary}
        onPreviewCatalog={onPreviewCatalog}
        onPreviewLocal={onPreviewLocal}
        onUpdate={onUpdate}
        previewSampleText={previewSampleText}
        modeBadgeText={modeBadgeText}
      />
      <SlotPanelUploads
        fileRef={fileRef}
        localLibrary={localLibrary}
        onLocalUploadFiles={onLocalUploadFiles}
        onClearLocal={onClearLocal}
      />
      <SlotPanelActiveWeightPreview
        slot={slot}
        state={state}
        weightPicker={weightPicker}
        previewFamily={previewFamily}
        previewSampleText={previewSampleText}
      />
      <SlotPanelWeightsEditor
        slot={slot}
        state={state}
        previewFamily={previewFamily}
        previewSampleText={previewSampleText}
        weightPicker={weightPicker}
        catalogVariableSnapSteps={catalogVariableSnapSteps}
        setLocalRoleFile={setLocalRoleFile}
        toggleLocalRole={toggleLocalRole}
        updateSemanticWeight={updateSemanticWeight}
        resolveDefaultOnCheck={resolveDefaultOnCheck}
        staticOptionLabel={staticOptionLabel}
      />
    </div>
  );
}
