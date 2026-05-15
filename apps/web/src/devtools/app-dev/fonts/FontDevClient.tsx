"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { TypeScaleConfig } from "@/app/fonts/type-scale";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import {
  applyLocalRolePreviewFontFaces,
  clearLocalRolePreviewFontFaces,
  deriveLocalDisplayFamily,
  previewCssFamily,
} from "@/app/dev/fonts/local-font-preview";
import { useLocalFontPreviews } from "@/app/dev/fonts/use-local-font-previews";
import {
  clearWorkbenchFonts,
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import { buildLocalRoleFaceRuleMap } from "./font-preview-face-rules";
import { generateAllFontsSnippet, generateScaleSnippet } from "./font-dev-snippets";
import { FontDevWorkspace } from "./font-dev-workspace";
import {
  SCALE_KEYS,
  catalogVariableSnapStepsFromMeta,
  defaultWeightsForCatalogSelection,
  initialLocalSlotAssignments,
  injectFontLink,
  resolveWeightPickerMode,
  resolveWeightRowDefaultOnCheck,
  slugify,
  staticSelectOptionLabel,
  variableAxisFromMeta,
} from "./font-dev-slot-logic";
import { initialLocalFromFileNames } from "./font-local-upload-defaults";
import {
  DEFAULT_PREVIEW_PHRASE,
  readFontDevPrefs,
  syncSlotPreviewModeWithWebfontSource,
  writeFontDevPrefs,
  type FontDevPrefsV2,
  type SlotName,
  type SlotPreviewMode,
  type SlotState,
} from "./font-dev-persistence";

type Props = {
  fontList: Record<string, BunnyFontMeta>;
  initialConfigs: Record<SlotName, SlotState>;
  initialTypeScale: TypeScaleConfig;
};

// ─── Main component ───────────────────────────────────────────────────────────

export function FontDevClient({ fontList, initialConfigs, initialTypeScale }: Props) {
  const [initialHydratedPrefs] = useState<Omit<FontDevPrefsV2, "v"> | null>(() =>
    readFontDevPrefs(initialConfigs, initialTypeScale)
  );
  const [configs, setConfigs] = useState<Record<SlotName, SlotState>>(
    () => initialHydratedPrefs?.configs ?? initialConfigs
  );
  const [typeScale, setTypeScale] = useState<TypeScaleConfig>(
    () => initialHydratedPrefs?.typeScale ?? initialTypeScale
  );
  const [previewSampleText, setPreviewSampleText] = useState(
    () => initialHydratedPrefs?.previewSampleText ?? DEFAULT_PREVIEW_PHRASE
  );
  const [trioPreviewKey, setTrioPreviewKey] = useState(0);
  const [slotPreviewMode, setSlotPreviewMode] = useState<Record<SlotName, SlotPreviewMode>>(
    () =>
      initialHydratedPrefs?.slotPreviewMode ?? {
        primary: "catalog",
        secondary: "catalog",
        mono: "catalog",
      }
  );
  const { ready, previews, replaceSlotFiles, clearSlot, previewActive } = useLocalFontPreviews();
  const hydratedLocalIDB = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFontsFromSession = () => {
      const restored = readFontDevPrefs(initialConfigs, initialTypeScale);
      if (restored) {
        setConfigs(restored.configs);
        setSlotPreviewMode(restored.slotPreviewMode);
        setTypeScale(restored.typeScale);
        setPreviewSampleText(restored.previewSampleText);
      } else {
        setConfigs(initialConfigs);
        setSlotPreviewMode({ primary: "catalog", secondary: "catalog", mono: "catalog" });
        setTypeScale(initialTypeScale);
        setPreviewSampleText(DEFAULT_PREVIEW_PHRASE);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== WORKBENCH_SESSION_STORAGE_KEY) return;
      syncFontsFromSession();
    };
    const onWorkbenchCustom = () => syncFontsFromSession();
    window.addEventListener("storage", onStorage);
    window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, onWorkbenchCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, onWorkbenchCustom);
    };
  }, [initialConfigs, initialTypeScale]);

  const effectiveSlotPreviewMode = useMemo(
    () => syncSlotPreviewModeWithWebfontSource(configs, slotPreviewMode),
    [configs, slotPreviewMode]
  );

  useEffect(() => {
    writeFontDevPrefs({
      configs,
      slotPreviewMode: effectiveSlotPreviewMode,
      typeScale,
      previewSampleText,
    });
  }, [configs, effectiveSlotPreviewMode, typeScale, previewSampleText]);

  useEffect(() => {
    if (!ready || hydratedLocalIDB.current) return;
    hydratedLocalIDB.current = true;

    const c = configs;
    const takeover: SlotName[] = [];
    for (const slot of ["primary", "secondary", "mono"] as SlotName[]) {
      const lib = previews[slot];
      if (!lib?.files.length) continue;
      if (c[slot].source !== "local") continue;
      takeover.push(slot);
    }
    if (takeover.length === 0) return;

    startTransition(() => {
      setSlotPreviewMode((p) => {
        const next = { ...p };
        for (const slot of takeover) next[slot] = "local";
        return next;
      });
      setConfigs((prev) => {
        const next = { ...prev };
        for (const slot of takeover) {
          const lib = previews[slot]!;
          const name = deriveLocalDisplayFamily(lib.files.map((f) => f.fileName));
          const { weights, localRoleFiles } = initialLocalSlotAssignments(lib.files);
          next[slot] = { ...next[slot], family: name, source: "local", weights, localRoleFiles };
        }
        return next;
      });
    });
  }, [ready, previews, configs]);

  useEffect(() => {
    const bySlot = buildLocalRoleFaceRuleMap({ configs, previews, effectiveSlotPreviewMode });
    applyLocalRolePreviewFontFaces(bySlot);
    return () => clearLocalRolePreviewFontFaces();
  }, [configs, previews, effectiveSlotPreviewMode]);

  const faceForSlot = (slot: SlotName) =>
    effectiveSlotPreviewMode[slot] === "local" && previewActive(slot)
      ? previewCssFamily(slot)
      : configs[slot].family;

  const applyUploadFamily = (slot: SlotName, fileNames: string[]) => {
    const name = deriveLocalDisplayFamily(fileNames);
    const { weights, localRoleFiles } = initialLocalFromFileNames(fileNames);
    setConfigs((c) => ({
      ...c,
      [slot]: { ...c[slot], family: name, source: "local", weights, localRoleFiles },
    }));
    setSlotPreviewMode((p) => ({ ...p, [slot]: "local" }));
  };

  const resetFontDevToolState = useCallback(() => {
    try {
      clearWorkbenchFonts();
    } catch {
      /* quota / private mode */
    }
    setConfigs(initialConfigs);
    setTypeScale(initialTypeScale);
    setSlotPreviewMode({ primary: "catalog", secondary: "catalog", mono: "catalog" });
    setPreviewSampleText(DEFAULT_PREVIEW_PHRASE);
    for (const slot of ["primary", "secondary", "mono"] as SlotName[]) {
      void clearSlot(slot);
    }
    setTrioPreviewKey((n) => n + 1);
  }, [clearSlot, initialConfigs, initialTypeScale]);

  const resetFontDevTool = useCallback(() => {
    resetFontDevToolState();
  }, [resetFontDevToolState]);

  const fontCount = Object.keys(fontList).length;
  const fontSnippet = generateAllFontsSnippet(configs, fontList, previewActive);
  const scaleSnippet = generateScaleSnippet(typeScale);

  return (
    <FontDevWorkspace
      resetFontDevTool={resetFontDevTool}
      resetFontDevToolState={resetFontDevToolState}
      fontCount={fontCount}
      previewSampleText={previewSampleText}
      setPreviewSampleText={setPreviewSampleText}
      configs={configs}
      setConfigs={setConfigs}
      fontList={fontList}
      faceForSlot={faceForSlot}
      effectiveSlotPreviewMode={effectiveSlotPreviewMode}
      previews={previews}
      setSlotPreviewMode={setSlotPreviewMode}
      defaultWeightsForCatalogSelection={defaultWeightsForCatalogSelection}
      initialLocalSlotAssignments={initialLocalSlotAssignments}
      replaceSlotFiles={replaceSlotFiles}
      applyUploadFamily={applyUploadFamily}
      clearSlot={clearSlot}
      initialConfigs={initialConfigs}
      slugify={slugify}
      injectFontLink={injectFontLink}
      resolveWeightPickerMode={resolveWeightPickerMode}
      catalogVariableSnapStepsFromMeta={catalogVariableSnapStepsFromMeta}
      staticOptionLabel={staticSelectOptionLabel}
      resolveDefaultOnCheck={resolveWeightRowDefaultOnCheck}
      variableAxisFromMeta={variableAxisFromMeta}
      typeScale={typeScale}
      scaleKeys={SCALE_KEYS}
      setTypeScale={setTypeScale}
      previewActive={previewActive}
      fontSnippet={fontSnippet}
      scaleSnippet={scaleSnippet}
      trioPreviewKey={trioPreviewKey}
    />
  );
}
