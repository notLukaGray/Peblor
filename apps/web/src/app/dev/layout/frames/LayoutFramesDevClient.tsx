"use client";

import { useEffect, useMemo, useState } from "react";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { LayoutAdvancedPanel } from "@/app/dev/layout/_shared/LayoutAdvancedPanel";
import {
  LayoutHandoffPanelToggle,
  useLayoutHandoffPanelVisibility,
} from "@/app/dev/layout/_shared/layout-handoff-panel";
import {
  coerceStyleToolPersisted,
  getDefaultStyleToolPersistedV3,
} from "@/app/dev/style/style-tool-persistence";
import {
  getWorkbenchSession,
  patchWorkbenchStyle,
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { parseFieldInput } from "@/devtools/app-dev/style/style-dev-config";
import { LayoutFramesPreviewPanel } from "./LayoutFramesPreviewPanel";
import { LayoutFramesTokenTable } from "./LayoutFramesTokenTable";
import {
  mergeLayoutFramesSlices,
  pickLayoutFramesSlices,
  type FrameGuidelineKey,
  type LayoutFramesSlices,
} from "./layout-frames-dev-state";

function readSlicesFromSession(): LayoutFramesSlices {
  const sessionStyle = coerceStyleToolPersisted(getWorkbenchSession().style);
  return pickLayoutFramesSlices(sessionStyle ?? getDefaultStyleToolPersistedV3());
}

function buildAllGuidelines(slices: LayoutFramesSlices): PbContentGuidelines {
  const defaults = getDefaultStyleToolPersistedV3();
  return {
    ...defaults.guidelines,
    ...slices.guidelines,
  };
}

export function LayoutFramesDevClient() {
  const [slices, setSlices] = useState<LayoutFramesSlices>(readSlicesFromSession);
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");
  const [copied, setCopied] = useState(false);
  const { handoffPanelVisible, toggleHandoffPanel } = useLayoutHandoffPanelVisibility();

  useEffect(() => {
    const sessionStyle = coerceStyleToolPersisted(getWorkbenchSession().style);
    if (!sessionStyle) return;
    patchWorkbenchStyle(mergeLayoutFramesSlices(sessionStyle, slices));
  }, [slices]);

  useEffect(() => {
    const syncFromSession = () => setSlices(readSlicesFromSession());
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

  const allGuidelines = useMemo(() => buildAllGuidelines(slices), [slices]);
  const handoffJson = useMemo(
    () => JSON.stringify(slices.guidelines, null, 2),
    [slices.guidelines]
  );

  const onFieldEdit = (key: FrameGuidelineKey, raw: string) =>
    setSlices((prev) => ({
      ...prev,
      guidelines: { ...prev.guidelines, [key]: parseFieldInput(key, raw) },
      locks: { ...prev.locks, [key]: true },
    }));

  const onLockToggle = (key: FrameGuidelineKey) =>
    setSlices((prev) => ({
      ...prev,
      locks: { ...prev.locks, [key]: !prev.locks[key] },
    }));

  const resetSection = () => {
    const defaults = getDefaultStyleToolPersistedV3();
    setSlices(pickLayoutFramesSlices(defaults));
    setCopied(false);
  };

  const copyHandoffJson = async () => {
    try {
      await navigator.clipboard.writeText(handoffJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={resetSection} onTotalReset={resetSection} />}
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Layout"
        title="Layout · Frames"
        showSessionBadge
        description="Tune content-block (frame) fallback flex defaults, padding tokens, and border-radius. These are the inner box defaults applied when a block doesn't specify its own overrides."
        affects="contentBlock inner box defaults — flex alignment, padding tokens, and border-radius across every layout block that doesn't override them"
        actions={
          <LayoutHandoffPanelToggle visible={handoffPanelVisible} onToggle={toggleHandoffPanel} />
        }
        meta={
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Phase 5 · Frame defaults
          </p>
        }
      />

      <div
        className={`grid grid-cols-1 gap-8 md:items-start ${
          handoffPanelVisible ? "md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)]" : ""
        }`}
      >
        <div className="space-y-6">
          <LayoutFramesTokenTable
            allGuidelines={allGuidelines}
            locks={slices.locks}
            onFieldEdit={onFieldEdit}
            onLockToggle={onLockToggle}
          />
          <LayoutFramesPreviewPanel
            guidelines={allGuidelines}
            previewBreakpoint={previewBreakpoint}
            setPreviewBreakpoint={setPreviewBreakpoint}
          />
          <LayoutAdvancedPanel
            meta={{
              routeName: "Layout · Frames",
              styleSlice: "frameDefaults (flex, padding, radius tokens)",
            }}
          />
        </div>

        {handoffPanelVisible ? (
          <div className="space-y-6 md:sticky md:top-8">
            <section className="rounded-lg border border-border bg-card/20 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Handoff notes
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                These fallback tokens apply when frame-style fields are omitted in section/content
                JSON. Lock rows you want to keep stable while iterating on seed-driven defaults
                elsewhere.
              </p>
              <pre className="mt-3 max-h-60 overflow-auto rounded border border-border/70 bg-background px-3 py-2 text-[10px] leading-relaxed text-foreground">
                {handoffJson}
              </pre>
              <button
                type="button"
                onClick={copyHandoffJson}
                className="mt-3 rounded border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {copied ? "Copied" : "Copy frame JSON"}
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </DevWorkbenchPageShell>
  );
}
