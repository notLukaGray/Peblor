"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PbImageVariantDefaults, PbImageVariantKey } from "@/app/theme/pb-builder-defaults";
import { getAnimationBehavior } from "@/app/dev/elements/_shared/motion-lab";
import {
  clearWorkbenchElement,
  patchWorkbenchElement,
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import { useTypographyMotionPreview } from "@/app/dev/elements/_shared/useTypographyMotionPreview";
import { BASE_DEFAULTS } from "@/app/dev/elements/image/constants";
import { readPersisted, toExportJson } from "@/app/dev/elements/image/normalization";
import {
  buildCustomElementSnippet,
  buildRuntimePreviewState,
  DEFAULT_IMAGE_RUNTIME_DRAFT,
} from "@/app/dev/elements/image/runtime-draft";
import type {
  ImageRuntimeDraft,
  SettingsCategoryKey,
  VisibleCategories,
} from "@/app/dev/elements/image/types";
import {
  resolveAnimationControlVisibility,
  resolveObjectFitControls,
  resolveShowAlignmentControls,
} from "./image-controller-derived-state";
import { useImageVariantActions } from "./use-image-variant-actions";
import { useImagePreviewUpload } from "./use-image-preview-upload";

const DEFAULT_VISIBLE_CATEGORIES: VisibleCategories = {
  content: false,
  layout: false,
  traits: false,
  animation: false,
  runtime: false,
};

function readInitialPersistedState() {
  if (typeof window === "undefined") return null;
  return readPersisted();
}

export function useImageElementDevController() {
  const hydrated = true;
  const [initialPersisted] = useState(readInitialPersistedState);
  const initialDefaultVariant = initialPersisted?.defaultVariant ?? BASE_DEFAULTS.defaultVariant;
  const initialVariants = initialPersisted?.variants ?? BASE_DEFAULTS.variants;

  const [defaultVariant, setDefaultVariant] = useState<PbImageVariantKey>(initialDefaultVariant);
  const [variants, setVariants] =
    useState<Record<PbImageVariantKey, PbImageVariantDefaults>>(initialVariants);
  const [activeVariant, setActiveVariant] = useState<PbImageVariantKey>(initialDefaultVariant);
  const [isCustomVariant, setIsCustomVariant] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<VisibleCategories>(
    DEFAULT_VISIBLE_CATEGORIES
  );
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [runtimeDraft, setRuntimeDraft] = useState<ImageRuntimeDraft>(DEFAULT_IMAGE_RUNTIME_DRAFT);

  const { previewUploadUrl, previewUploadName, clearPreviewUpload, setPreviewUploadFile } =
    useImagePreviewUpload();

  const {
    setVariantPatch,
    setVariantExact,
    setAnimationPatch,
    patchEntranceFineTune,
    patchExitFineTune,
    setEntranceCurvePreset,
    setExitCurvePreset,
    setEntranceBezierValue,
    setExitBezierValue,
  } = useImageVariantActions(setVariants);

  useEffect(() => {
    patchWorkbenchElement("image", { v: 3, defaultVariant, variants });
  }, [defaultVariant, variants]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromSession = () => {
      const saved = readPersisted();
      if (!saved) {
        setDefaultVariant(BASE_DEFAULTS.defaultVariant);
        setVariants(BASE_DEFAULTS.variants);
        setActiveVariant(BASE_DEFAULTS.defaultVariant);
        setIsCustomVariant(false);
        return;
      }
      setDefaultVariant(saved.defaultVariant);
      setVariants(saved.variants);
      setActiveVariant(saved.defaultVariant);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === WORKBENCH_SESSION_STORAGE_KEY) syncFromSession();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, syncFromSession);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, syncFromSession);
    };
  }, []);

  const toggleCategoryVisibility = useCallback((key: SettingsCategoryKey) => {
    setVisibleCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectVariant = useCallback((key: PbImageVariantKey) => {
    setActiveVariant(key);
    setIsCustomVariant(false);
  }, []);

  const selectCustomVariant = useCallback(() => {
    setIsCustomVariant(true);
  }, []);

  const setRuntimePatch = useCallback((patch: Partial<ImageRuntimeDraft>) => {
    setRuntimeDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const active = variants[activeVariant];
  const motionPreview = useTypographyMotionPreview(active as unknown as Record<string, unknown>);
  const { resetMotionPreview } = motionPreview;

  const resetImageDefaults = useCallback(() => {
    clearWorkbenchElement("image");
    setDefaultVariant(BASE_DEFAULTS.defaultVariant);
    setVariants(BASE_DEFAULTS.variants);
    setActiveVariant(BASE_DEFAULTS.defaultVariant);
    setIsCustomVariant(false);
    setVisibleCategories(DEFAULT_VISIBLE_CATEGORIES);
    setRuntimeDraft(DEFAULT_IMAGE_RUNTIME_DRAFT);
    resetMotionPreview();
    setPreviewDevice("desktop");
    setCopied(false);
    clearPreviewUpload();
  }, [clearPreviewUpload, resetMotionPreview]);

  const fineTune = active.animation.fineTune;
  const animationBehavior = getAnimationBehavior(fineTune);
  const { showHybridControls, showFineTuneControls, showPresetControls } =
    resolveAnimationControlVisibility(fineTune);
  const { showObjectPositionControl, showCropPanZoom } = resolveObjectFitControls(
    active,
    previewDevice
  );
  const showAlignmentControls = resolveShowAlignmentControls(active);

  const exportJson = useMemo(
    () => toExportJson({ v: 3, defaultVariant, variants }),
    [defaultVariant, variants]
  );
  const runtimePreview = useMemo(() => buildRuntimePreviewState(runtimeDraft), [runtimeDraft]);
  const customElementJson = useMemo(
    () => JSON.stringify(buildCustomElementSnippet(activeVariant, active, runtimeDraft), null, 2),
    [active, activeVariant, runtimeDraft]
  );

  const copyExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors.
    }
  }, [exportJson]);

  return {
    active,
    activeVariant,
    animationBehavior,
    copied,
    defaultVariant,
    exportJson,
    hydrated,
    isCustomVariant,
    customElementJson,
    previewDevice,
    previewUploadName,
    previewUploadUrl,
    runtimeDraft,
    runtimePreview,
    showAlignmentControls,
    showFineTuneControls,
    showHybridControls,
    showObjectPositionControl,
    showCropPanZoom,
    showPresetControls,
    variants,
    visibleCategories,
    clearPreviewUpload,
    copyExport,
    patchEntranceFineTune,
    patchExitFineTune,
    resetImageDefaults,
    selectCustomVariant,
    selectVariant,
    setActiveVariant,
    setAnimationPatch,
    setDefaultVariant,
    setEntranceBezierValue,
    setEntranceCurvePreset,
    setExitBezierValue,
    setExitCurvePreset,
    setPreviewUploadFile,
    setPreviewDevice,
    setRuntimePatch,
    setVariantPatch,
    setVariantExact,
    toggleCategoryVisibility,
    ...motionPreview,
  };
}

export type ImageElementDevController = ReturnType<typeof useImageElementDevController>;
