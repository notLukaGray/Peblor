"use client";
import type { Dispatch, SetStateAction } from "react";
import type { FontWeightMap } from "@/app/fonts/config";
import type { TypeScaleConfig } from "@/app/fonts/type-scale";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import { deriveLocalDisplayFamily } from "@/app/dev/fonts/local-font-preview";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { FontDevSampleTextPanel } from "./font-dev-sample-text-panel";
import { FontSnippetPanel } from "./font-snippet-panel";
import { FontSlotPanel } from "./font-slot-panel";
import { TypeScalePanel } from "./font-type-scale-panel";
import { buildTypeScaleFontPreview } from "./font-type-scale-preview";
import { TrioInUnisonPreview } from "./font-trio-preview";
import type { WeightPickerMode } from "./font-dev-slot-logic";
import type { SlotName, SlotPreviewMode, SlotState } from "./font-dev-persistence";

type Props = {
  resetFontDevTool: () => void;
  resetFontDevToolState: () => void;
  fontCount: number;
  previewSampleText: string;
  setPreviewSampleText: (value: string) => void;
  configs: Record<SlotName, SlotState>;
  setConfigs: Dispatch<SetStateAction<Record<SlotName, SlotState>>>;
  fontList: Record<string, BunnyFontMeta>;
  faceForSlot: (slot: SlotName) => string;
  effectiveSlotPreviewMode: Record<SlotName, SlotPreviewMode>;
  previews: Partial<Record<SlotName, LocalPreviewRuntime>>;
  setSlotPreviewMode: Dispatch<SetStateAction<Record<SlotName, SlotPreviewMode>>>;
  defaultWeightsForCatalogSelection: (
    family: string,
    fontList: Record<string, BunnyFontMeta>
  ) => FontWeightMap;
  initialLocalSlotAssignments: (files: LocalPreviewRuntime["files"]) => {
    weights: FontWeightMap;
    localRoleFiles: Partial<Record<keyof FontWeightMap, string>>;
  };
  replaceSlotFiles: (slot: SlotName, files: File[]) => Promise<void>;
  applyUploadFamily: (slot: SlotName, fileNames: string[]) => void;
  clearSlot: (slot: SlotName) => Promise<void>;
  initialConfigs: Record<SlotName, SlotState>;
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
  typeScale: TypeScaleConfig;
  scaleKeys: (keyof TypeScaleConfig)[];
  setTypeScale: Dispatch<SetStateAction<TypeScaleConfig>>;
  previewActive: (slot: SlotName) => boolean;
  fontSnippet: string;
  scaleSnippet: string;
  trioPreviewKey: number;
};

export function FontDevWorkspace({
  resetFontDevTool,
  resetFontDevToolState,
  fontCount,
  previewSampleText,
  setPreviewSampleText,
  configs,
  setConfigs,
  fontList,
  faceForSlot,
  effectiveSlotPreviewMode,
  previews,
  setSlotPreviewMode,
  defaultWeightsForCatalogSelection,
  initialLocalSlotAssignments,
  replaceSlotFiles,
  applyUploadFamily,
  clearSlot,
  initialConfigs,
  slugify,
  injectFontLink,
  resolveWeightPickerMode,
  catalogVariableSnapStepsFromMeta,
  staticOptionLabel,
  resolveDefaultOnCheck,
  variableAxisFromMeta,
  typeScale,
  scaleKeys,
  setTypeScale,
  previewActive,
  fontSnippet,
  scaleSnippet,
  trioPreviewKey,
}: Props) {
  return (
    <DevWorkbenchPageShell
      nav={
        <DevWorkbenchNav onResetSection={resetFontDevTool} onTotalReset={resetFontDevToolState} />
      }
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Foundations"
        title="Fonts & type scale"
        description={
          <>
            Choose fonts from the library, set weights, adjust the type scale, then copy the code on
            the right into <code>src/app/fonts/</code> when you’re ready to ship it. You can also
            upload font files for a quick try-out — those previews stay in this browser and are not
            uploaded anywhere.
            {fontCount > 0 ? (
              <span className="text-muted-foreground/80">
                {" "}
                Library: {fontCount.toLocaleString()} families.
              </span>
            ) : null}
          </>
        }
        meta={
          <>
            <span className="font-medium text-foreground/90">Note:</span>{" "}
            <code>typography-heading-*</code> and <code>typography-body-*</code> use{" "}
            <code>--font-weight-*</code> and <code>--type-*-fw</code> from the{" "}
            <strong>primary</strong> font slot only. Secondary and mono do not change those CSS
            variables.
          </>
        }
      />

      <FontDevSampleTextPanel
        previewSampleText={previewSampleText}
        setPreviewSampleText={setPreviewSampleText}
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)] md:items-start">
        <div className="space-y-6">
          {(["primary", "secondary", "mono"] as SlotName[]).map((slot) => (
            <FontSlotPanel
              key={slot}
              slot={slot}
              state={configs[slot]}
              fontList={fontList}
              onUpdate={(slotState) => setConfigs((prev) => ({ ...prev, [slot]: slotState }))}
              previewFamily={faceForSlot(slot)}
              previewMode={effectiveSlotPreviewMode[slot]}
              localLibrary={previews[slot]}
              onPreviewCatalog={(family) => {
                setSlotPreviewMode((prev) => ({ ...prev, [slot]: "catalog" }));
                const weights = defaultWeightsForCatalogSelection(family, fontList);
                setConfigs((prev) => ({
                  ...prev,
                  [slot]: {
                    ...prev[slot],
                    family,
                    source: "webfont",
                    weights,
                    localRoleFiles: undefined,
                  },
                }));
              }}
              onPreviewLocal={() => {
                setSlotPreviewMode((prev) => ({ ...prev, [slot]: "local" }));
                const lib = previews[slot];
                if (!lib?.files.length) return;
                const name = deriveLocalDisplayFamily(lib.files.map((file) => file.fileName));
                const { weights, localRoleFiles } = initialLocalSlotAssignments(lib.files);
                setConfigs((prev) => ({
                  ...prev,
                  [slot]: { ...prev[slot], family: name, source: "local", weights, localRoleFiles },
                }));
              }}
              onLocalUploadFiles={async (files) => {
                await replaceSlotFiles(slot, files);
                applyUploadFamily(
                  slot,
                  files.map((file) => file.name)
                );
              }}
              onClearLocal={() => {
                void clearSlot(slot);
                setSlotPreviewMode((prev) => ({ ...prev, [slot]: "catalog" }));
                setConfigs((prev) => ({
                  ...prev,
                  [slot]: {
                    ...prev[slot],
                    family: initialConfigs[slot].family,
                    source: "webfont",
                    weights: initialConfigs[slot].weights,
                    localRoleFiles: undefined,
                  },
                }));
              }}
              previewSampleText={previewSampleText}
              slugify={slugify}
              injectFontLink={injectFontLink}
              resolveWeightPickerMode={resolveWeightPickerMode}
              catalogVariableSnapStepsFromMeta={catalogVariableSnapStepsFromMeta}
              staticOptionLabel={staticOptionLabel}
              resolveDefaultOnCheck={resolveDefaultOnCheck}
              variableAxisFromMeta={variableAxisFromMeta}
            />
          ))}

          <TypeScalePanel
            scale={typeScale}
            scaleKeys={scaleKeys}
            fontPreviewBySlot={buildTypeScaleFontPreview({
              configs,
              effectiveSlotPreviewMode,
              fontList,
              previews,
              previewActive,
              faceForSlot,
            })}
            onUpdate={setTypeScale}
            bodySampleText={previewSampleText}
          />
        </div>

        <div className="md:sticky md:top-8">
          <FontSnippetPanel fontSnippet={fontSnippet} scaleSnippet={scaleSnippet} />
        </div>
      </div>

      <TrioInUnisonPreview
        key={trioPreviewKey}
        configs={configs}
        effectiveSlotPreviewMode={effectiveSlotPreviewMode}
        previews={previews}
        fontList={fontList}
        typeScale={typeScale}
        bodyPhrase={previewSampleText}
      />
    </DevWorkbenchPageShell>
  );
}
