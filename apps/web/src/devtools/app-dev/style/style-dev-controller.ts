"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  pbContentGuidelinesConfigFileExport,
  type PbContentGuidelines,
} from "@/app/theme/pb-content-guidelines-config";
import {
  emptyLocks,
  mergeGuidelinesWithLocks,
  PB_GUIDELINE_KEYS,
  proposePbContentGuidelines,
  type StyleToolSeeds,
} from "@/app/theme/pb-style-suggest";
import { DEV_NEUTRAL_STYLE_SEEDS } from "@/app/dev/style/style-tool-baseline";
import {
  coerceStyleToolPersisted,
  getDefaultStyleToolPersistedV3,
} from "@/app/dev/style/style-tool-persistence";
import {
  clearWorkbenchStyle,
  getWorkbenchSession,
  patchWorkbenchStyle,
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import type { PageDensity } from "@pb/contracts";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import { buildStyleToolPersisted, pickFoundationSlices } from "./style-dev-foundation-state";
import {
  guidelinesToPreviewStyle,
  parseFieldInput,
  SCOPE_CONFIG,
  SECTIONS,
  type StyleDevScope,
} from "./style-dev-config";
import type { StyleFoundationSlices } from "./style-foundation-slices-types";

export function useStyleDevController(scope: StyleDevScope) {
  const view = SCOPE_CONFIG[scope];
  const [initialStyle] = useState(
    () => coerceStyleToolPersisted(getWorkbenchSession().style) ?? getDefaultStyleToolPersistedV3()
  );
  const [seeds, setSeeds] = useState<StyleToolSeeds>(
    () => initialStyle?.seeds ?? { ...DEV_NEUTRAL_STYLE_SEEDS }
  );
  const [locks, setLocks] = useState<Record<keyof PbContentGuidelines, boolean>>(
    () => initialStyle?.locks ?? emptyLocks()
  );
  const [guidelines, setGuidelines] = useState<PbContentGuidelines>(() =>
    mergeGuidelinesWithLocks(
      proposePbContentGuidelines(initialStyle.seeds),
      initialStyle.guidelines,
      initialStyle.locks
    )
  );
  const [foundationSlices, setFoundationSlices] = useState<StyleFoundationSlices>(() =>
    pickFoundationSlices(initialStyle)
  );
  const [previewDensity, setPreviewDensity] = useState<PageDensity>("balanced");
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");
  const [exportCopied, setExportCopied] = useState(false);

  useEffect(() => {
    const syncStyleFromSession = () => {
      const saved = coerceStyleToolPersisted(getWorkbenchSession().style);
      if (!saved) {
        const nextSeeds = { ...DEV_NEUTRAL_STYLE_SEEDS };
        setSeeds(nextSeeds);
        setLocks(emptyLocks());
        setGuidelines(proposePbContentGuidelines(nextSeeds));
        setFoundationSlices(pickFoundationSlices(getDefaultStyleToolPersistedV3()));
        return;
      }
      setSeeds(saved.seeds);
      setLocks(saved.locks);
      setGuidelines(
        mergeGuidelinesWithLocks(
          proposePbContentGuidelines(saved.seeds),
          saved.guidelines,
          saved.locks
        )
      );
      setFoundationSlices(pickFoundationSlices(saved));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === WORKBENCH_SESSION_STORAGE_KEY) syncStyleFromSession();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, syncStyleFromSession);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, syncStyleFromSession);
    };
  }, []);

  useEffect(() => {
    patchWorkbenchStyle(buildStyleToolPersisted({ seeds, locks, guidelines, foundationSlices }));
  }, [foundationSlices, guidelines, locks, seeds]);

  const onSeedsChange = useCallback(
    (patch: Partial<StyleToolSeeds>) => {
      setSeeds((prevSeeds) => {
        const nextSeeds = { ...prevSeeds, ...patch };
        setGuidelines((prevGuidelines) =>
          mergeGuidelinesWithLocks(proposePbContentGuidelines(nextSeeds), prevGuidelines, locks)
        );
        return nextSeeds;
      });
    },
    [locks]
  );
  const toggleLock = useCallback(
    (key: keyof PbContentGuidelines) => {
      setLocks((prevLocks) => {
        const nextLocks = { ...prevLocks, [key]: !prevLocks[key] };
        setGuidelines((prevGuidelines) =>
          mergeGuidelinesWithLocks(proposePbContentGuidelines(seeds), prevGuidelines, nextLocks)
        );
        return nextLocks;
      });
    },
    [seeds]
  );
  const onFieldEdit = useCallback((key: keyof PbContentGuidelines, raw: string) => {
    setLocks((prevLocks) => ({ ...prevLocks, [key]: true }));
    setGuidelines((prev) => ({ ...prev, [key]: parseFieldInput(key, raw) }));
  }, []);
  const onFoundationSlicesChange = useCallback((patch: Partial<StyleFoundationSlices>) => {
    setFoundationSlices((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetStyleTool = useCallback(() => {
    clearWorkbenchStyle();
    const defaults = getDefaultStyleToolPersistedV3();
    setSeeds({ ...defaults.seeds });
    setLocks(emptyLocks());
    setGuidelines(proposePbContentGuidelines(defaults.seeds));
    setFoundationSlices(pickFoundationSlices(defaults));
    setExportCopied(false);
  }, []);

  const visibleSections = useMemo(
    () => SECTIONS.filter((section) => view.sectionTitles.includes(section.title)),
    [view.sectionTitles]
  );
  const visibleKeys = useMemo(
    () => visibleSections.flatMap((section) => section.keys),
    [visibleSections]
  );
  const allUnlocked = visibleKeys.every((key) => !locks[key]);
  const previewVars = useMemo(() => guidelinesToPreviewStyle(guidelines), [guidelines]);
  const proposed = useMemo(() => proposePbContentGuidelines(seeds), [seeds]);
  const exportText = useMemo(() => pbContentGuidelinesConfigFileExport(guidelines), [guidelines]);

  const resetVisibleSection = useCallback(() => {
    const targetKeys = scope === "all" ? PB_GUIDELINE_KEYS : visibleKeys;
    const shouldResetSeeds = scope === "all" || view.showGlobalSeeds;
    const seedSource = shouldResetSeeds ? { ...DEV_NEUTRAL_STYLE_SEEDS } : seeds;
    if (shouldResetSeeds) setSeeds(seedSource);
    if (scope === "all" || scope === "foundations") {
      setFoundationSlices(pickFoundationSlices(getDefaultStyleToolPersistedV3()));
    }
    setLocks((prevLocks) => {
      const nextLocks = { ...prevLocks };
      for (const key of targetKeys) nextLocks[key] = false;
      setGuidelines((prevGuidelines) =>
        mergeGuidelinesWithLocks(proposePbContentGuidelines(seedSource), prevGuidelines, nextLocks)
      );
      return nextLocks;
    });
    setExportCopied(false);
  }, [scope, seeds, view.showGlobalSeeds, visibleKeys]);

  const copyExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    } catch {
      // Ignore clipboard failures.
    }
  }, [exportText]);

  return {
    allUnlocked,
    copyExport,
    exportCopied,
    exportText,
    foundationSlices,
    guidelines,
    locks,
    onFieldEdit,
    onFoundationSlicesChange,
    onSeedsChange,
    previewBreakpoint,
    previewDensity,
    previewVars,
    proposed,
    resetStyleTool,
    resetVisibleSection,
    seeds,
    setPreviewBreakpoint,
    setPreviewDensity,
    toggleLock,
    view,
    visibleKeys,
    visibleSections,
  };
}
