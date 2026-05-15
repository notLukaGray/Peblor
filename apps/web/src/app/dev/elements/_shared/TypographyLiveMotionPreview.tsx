"use client";

/* eslint-disable max-lines */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { parseLooseValue } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import { getVariable, setVariable, useVariableStore } from "@pb/runtime-react/dev-core";
import type { JsonValue } from "@pb/contracts";
import type { ElementBlock, MotionPropsFromJson, MotionTiming } from "@pb/contracts";
import { ElementRenderer } from "@pb/runtime-react/renderers";
import { ElementExitWrapper } from "@pb/runtime-react/motion";
import { blockNeedsExitPresence } from "@/app/dev/elements/_shared/block-needs-exit-presence";
import { buildPreviewMotion } from "@/app/dev/elements/image/preview-motion";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";
import { PreviewProvenanceBadge } from "@/app/dev/workbench/PreviewProvenanceBadge";
import { WorkbenchElementPreviewSurface } from "@/app/dev/workbench/workbench-element-preview-surface";
import { useWorkbenchPreviewContext } from "@/app/dev/workbench/workbench-preview-context";
import type { PreviewFidelityMode } from "@/app/dev/workbench/preview-fidelity";

export type PreviewScenarioId = "default" | "edge" | "empty" | "stress" | "mobile" | "light";

export const PREVIEW_SCENARIO_LABELS: Record<PreviewScenarioId, string> = {
  default: "Default",
  edge: "Edge",
  empty: "Empty",
  stress: "Stress",
  mobile: "Mobile",
  light: "Light",
};

type Props = {
  previewVisible: boolean;
  previewKey: number;
  autoLoop: boolean;
  setAutoLoop: (next: boolean) => void;
  animateInPreview: () => void;
  animateOutPreview: () => void;
  showPreview: () => void;
  variantLabel: string;
  hiddenByVisibleWhen: boolean;
  runtimeDraft: ImageRuntimeDraft;
  previewBlock: ElementBlock; // raw mode block (default scenario)
  guidedPreviewBlock?: ElementBlock; // guided mode block (default scenario)
  /** Per-scenario override blocks. Keys must be non-default scenario ids. */
  scenarioBlocks?: Partial<Record<Exclude<PreviewScenarioId, "default">, ElementBlock>>;
  defaultFidelityMode?: Extract<PreviewFidelityMode, "raw" | "guided">;
  defaultScenario?: PreviewScenarioId;
  showFidelityModeToggle?: boolean;
  onPreviewExitComplete: () => void;
  /** Variant animation defaults (dev-only on workbench); used when the block has no exit preset / exit motion. */
  animationSource: PbImageAnimationDefaults;
};

// eslint-disable-next-line complexity
export function TypographyLiveMotionPreview({
  previewVisible,
  previewKey,
  autoLoop,
  setAutoLoop,
  animateInPreview,
  animateOutPreview,
  showPreview,
  variantLabel,
  hiddenByVisibleWhen,
  runtimeDraft,
  previewBlock,
  guidedPreviewBlock,
  scenarioBlocks,
  defaultFidelityMode = "raw",
  defaultScenario = "default",
  showFidelityModeToggle = false,
  onPreviewExitComplete,
  animationSource,
}: Props) {
  const { breakpoint } = useWorkbenchPreviewContext();
  const slotRef = useRef<HTMLDivElement>(null);
  const [reservedMinHeight, setReservedMinHeight] = useState<number | undefined>(undefined);
  const [activeScenario, setActiveScenario] = useState<PreviewScenarioId>(defaultScenario);
  const [fidelityMode, setFidelityMode] =
    useState<Extract<PreviewFidelityMode, "raw" | "guided">>(defaultFidelityMode);

  const availableScenarios: PreviewScenarioId[] = useMemo(() => {
    const extras = (
      Object.keys(scenarioBlocks ?? {}) as Exclude<PreviewScenarioId, "default">[]
    ).filter((k) => scenarioBlocks?.[k] != null);
    return extras.length > 0 ? ["default", ...extras] : [];
  }, [scenarioBlocks]);

  // Resolve the active raw/guided block based on current scenario
  const resolvedPreviewBlock: ElementBlock = useMemo(() => {
    if (activeScenario !== "default" && scenarioBlocks?.[activeScenario]) {
      return scenarioBlocks[activeScenario]!;
    }
    return previewBlock;
  }, [activeScenario, previewBlock, scenarioBlocks]);

  const resolvedGuidedBlock: ElementBlock | undefined = useMemo(() => {
    if (activeScenario !== "default" && scenarioBlocks?.[activeScenario]) {
      return scenarioBlocks[activeScenario];
    }
    return guidedPreviewBlock;
  }, [activeScenario, guidedPreviewBlock, scenarioBlocks]);

  const activeMode: Extract<PreviewFidelityMode, "raw" | "guided"> =
    fidelityMode === "guided" && resolvedGuidedBlock ? "guided" : "raw";
  const activeBlock =
    activeMode === "guided" && resolvedGuidedBlock ? resolvedGuidedBlock : resolvedPreviewBlock;

  // Mobile scenario forces a constrained canvas width to simulate a narrow viewport.
  const scenarioCanvasStyle: CSSProperties | undefined =
    activeScenario === "mobile" ? { maxWidth: "375px", margin: "0 auto" } : undefined;

  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const update = () => {
      if (!previewVisible) return;
      const h = el.getBoundingClientRect().height;
      if (h > 0) setReservedMinHeight(Math.ceil(h));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [previewVisible, previewKey, activeBlock]);

  useEffect(() => {
    const key = runtimeDraft.visibleWhenVariable.trim();
    if (!runtimeDraft.visibleWhenEnabled || !key) return;
    const previous = getVariable(key);
    const next = parseLooseValue(runtimeDraft.visibleWhenPreviewValue) as JsonValue;
    setVariable(key, next);
    return () => {
      if (previous !== undefined) {
        setVariable(key, previous);
      } else {
        useVariableStore.setState((s) => {
          const vars = { ...s.variables };
          delete vars[key];
          return { variables: vars };
        });
      }
    };
  }, [
    runtimeDraft.visibleWhenEnabled,
    runtimeDraft.visibleWhenVariable,
    runtimeDraft.visibleWhenPreviewValue,
  ]);

  const ext = activeBlock as ElementBlock & {
    motion?: MotionPropsFromJson;
    motionTiming?: MotionTiming;
    exitPreset?: string;
  };

  const rendererRemountKey = useMemo(() => {
    return JSON.stringify([ext.motionTiming, ext.motion, ext.exitPreset]);
  }, [ext.motion, ext.motionTiming, ext.exitPreset]);

  const needsExitPresence = blockNeedsExitPresence(activeBlock);
  const fallbackPreviewMotion = useMemo(
    () => buildPreviewMotion(animationSource),
    [animationSource]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Preview
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={animateInPreview}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Animate in
          </button>
          <button
            type="button"
            onClick={animateOutPreview}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Animate out
          </button>
          <button
            type="button"
            onClick={showPreview}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Show
          </button>
          <label className="inline-flex items-center gap-2 border-l border-border/60 pl-3 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={autoLoop}
              onChange={(e) => setAutoLoop(e.target.checked)}
            />
            Auto loop
          </label>
          {availableScenarios.length > 0 ? (
            <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
              <label className="text-[10px] font-mono text-muted-foreground">Scenario</label>
              <select
                value={activeScenario}
                onChange={(e) => setActiveScenario(e.target.value as PreviewScenarioId)}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {availableScenarios.map((scenario) => (
                  <option key={scenario} value={scenario}>
                    {PREVIEW_SCENARIO_LABELS[scenario]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {showFidelityModeToggle && resolvedGuidedBlock ? (
            <div className="inline-flex items-center gap-1 border-l border-border/60 pl-3">
              {(["raw", "guided"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFidelityMode(mode)}
                  className={`rounded border px-2 py-1 text-[10px] font-mono transition-colors ${
                    activeMode === mode
                      ? "border-foreground/60 bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          ) : null}
          <PreviewProvenanceBadge mode={activeMode} className="border-l border-l-border/60 pl-2" />
        </div>
      </div>

      {/* Dev chrome frame; inner surface scopes `/dev/colors` + session fonts to ElementRenderer only. */}
      <div
        className={`rounded-md border border-border/60 ${hiddenByVisibleWhen ? "opacity-[0.35]" : ""}`}
      >
        <WorkbenchElementPreviewSurface
          foundationTheme={activeScenario === "light" ? "light" : "dark"}
          className="min-h-[8rem] p-6"
        >
          <div
            ref={slotRef}
            className="w-full"
            style={{
              ...(reservedMinHeight != null ? { minHeight: `${reservedMinHeight}px` } : undefined),
              ...scenarioCanvasStyle,
            }}
          >
            {needsExitPresence ? (
              <ElementRenderer
                key={`${previewKey}-${rendererRemountKey}`}
                block={activeBlock}
                exitPresenceShow={previewVisible}
                exitPresenceKey={`typography-preview-${previewKey}`}
                exitPresenceMode="wait"
                onExitComplete={onPreviewExitComplete}
                forceEntranceAnimation
              />
            ) : (
              <ElementExitWrapper
                show={previewVisible}
                motion={fallbackPreviewMotion}
                motionTiming={ext.motionTiming}
                exitKey={`typography-preview-fallback-${previewKey}`}
                presenceMode="wait"
                onExitComplete={onPreviewExitComplete}
                className="block w-full"
              >
                <ElementRenderer
                  key={`${previewKey}-${rendererRemountKey}`}
                  block={activeBlock}
                  forceEntranceAnimation
                />
              </ElementExitWrapper>
            )}
          </div>
        </WorkbenchElementPreviewSurface>
        <p className="border-t border-border/50 px-6 py-3 text-[10px] text-muted-foreground">
          Variant: {variantLabel} · Viewport: {breakpoint} · Provenance: {activeMode}
          {activeScenario !== "default"
            ? ` · Scenario: ${PREVIEW_SCENARIO_LABELS[activeScenario]}`
            : ""}
          . Renders through <code className="font-mono">ElementRenderer</code>.
        </p>
      </div>
    </div>
  );
}
