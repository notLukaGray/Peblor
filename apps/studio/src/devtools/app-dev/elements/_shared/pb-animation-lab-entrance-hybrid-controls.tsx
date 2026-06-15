import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import { HybridStackEditor } from "./pb-animation-lab-shared-controls";

function orderedSegmentCount(controller: PbAnimationLabController): number {
  const fineTune = controller.active.animation.fineTune;
  const hybridLayerCount = fineTune.hybridStackIn.filter((preset) => preset !== "none").length;
  return Math.max(1, 1 + hybridLayerCount);
}

function updateHybridEntranceDuration(controller: PbAnimationLabController, value: number): void {
  const fineTune = controller.active.animation.fineTune;
  const nextDuration = Math.max(0.05, value || 0.45);
  const previous = fineTune.hybridEntranceDuration || 0.45;
  const scale = nextDuration / previous;
  const nextSteps =
    fineTune.hybridOrderedUseStepDurations &&
    fineTune.hybridOrderedStepDurations.length === orderedSegmentCount(controller)
      ? fineTune.hybridOrderedStepDurations.map((step) => Math.max(0.02, step * scale))
      : fineTune.hybridOrderedStepDurations;
  controller.setAnimationPatch(controller.activeVariant, {
    fineTune: {
      ...fineTune,
      hybridEntranceDuration: nextDuration,
      ...(fineTune.hybridOrderedUseStepDurations ? { hybridOrderedStepDurations: nextSteps } : {}),
    },
  });
}

function EntranceHybridLayerFields({ controller }: { controller: PbAnimationLabController }) {
  const fineTune = controller.active.animation.fineTune;
  if (fineTune.hybridCompositionIn !== "layered") return null;
  return (
    <>
      <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <input
          type="checkbox"
          checked={fineTune.hybridLayerStaggerEnabled}
          onChange={(e) =>
            controller.setAnimationPatch(controller.activeVariant, {
              fineTune: { ...fineTune, hybridLayerStaggerEnabled: e.target.checked },
            })
          }
          className="rounded border-border"
        />
        Stagger parallel layers
      </label>
      {fineTune.hybridLayerStaggerEnabled ? (
        <label className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Layer stagger (s)
          </span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
            value={fineTune.hybridLayerStaggerSec}
            onChange={(e) =>
              controller.setAnimationPatch(controller.activeVariant, {
                fineTune: {
                  ...fineTune,
                  hybridLayerStaggerSec: Math.max(0, Number(e.target.value) || 0),
                },
              })
            }
          />
        </label>
      ) : null}
    </>
  );
}

function EntranceHybridOrderedFields({ controller }: { controller: PbAnimationLabController }) {
  const fineTune = controller.active.animation.fineTune;
  const stepCount = orderedSegmentCount(controller);
  if (fineTune.hybridCompositionIn !== "ordered") return null;
  return (
    <div className="space-y-2 rounded border border-border/60 bg-background/40 p-2">
      <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <input
          type="checkbox"
          checked={fineTune.hybridOrderedUseStepDurations}
          onChange={(e) => {
            const enabled = e.target.checked;
            const nextSteps = enabled
              ? Array.from(
                  { length: stepCount },
                  () => fineTune.hybridEntranceDuration / Math.max(1, stepCount)
                )
              : [];
            controller.setAnimationPatch(controller.activeVariant, {
              fineTune: {
                ...fineTune,
                hybridOrderedUseStepDurations: enabled,
                hybridOrderedStepDurations: nextSteps,
              },
            });
          }}
          className="rounded border-border"
        />
        Custom timing per ordered step
      </label>
      {fineTune.hybridOrderedUseStepDurations ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: stepCount }, (_, index) => (
            <label key={`step-${index}`} className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Step {index + 1} (s)
              </span>
              <input
                type="number"
                min={0.02}
                step={0.02}
                className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
                value={fineTune.hybridOrderedStepDurations[index] ?? 0.2}
                onChange={(e) => {
                  const next = [...(fineTune.hybridOrderedStepDurations ?? [])];
                  while (next.length < stepCount) next.push(0.2);
                  next[index] = Math.max(0.02, Number(e.target.value) || 0.02);
                  const sum = next.reduce((acc, item) => acc + item, 0);
                  controller.setAnimationPatch(controller.activeVariant, {
                    fineTune: {
                      ...fineTune,
                      hybridOrderedStepDurations: next,
                      hybridEntranceDuration: Math.max(0.05, sum),
                    },
                  });
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EntranceHybridSection({ controller }: { controller: PbAnimationLabController }) {
  const fineTune = controller.active.animation.fineTune;
  const disableDuration =
    fineTune.hybridCompositionIn === "ordered" && fineTune.hybridOrderedUseStepDurations;
  if (fineTune.entranceBehavior !== "hybrid") return null;
  return (
    <>
      <label className="space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Duration (s)
        </span>
        <input
          type="number"
          min={0.05}
          step={0.01}
          disabled={disableDuration}
          title={
            disableDuration
              ? "Sum of per-step durations is used when custom step timing is enabled"
              : undefined
          }
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
          value={fineTune.hybridEntranceDuration}
          onChange={(e) => updateHybridEntranceDuration(controller, Number(e.target.value))}
        />
      </label>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Hybrid layout
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={fineTune.hybridCompositionIn}
          onChange={(e) =>
            controller.setAnimationPatch(controller.activeVariant, {
              fineTune: {
                ...fineTune,
                hybridCompositionIn: e.target.value as "ordered" | "layered",
              },
            })
          }
        >
          <option value="ordered">Ordered (series)</option>
          <option value="layered">Layered (parallel)</option>
        </select>
      </label>
      <EntranceHybridLayerFields controller={controller} />
      <EntranceHybridOrderedFields controller={controller} />
      <HybridStackEditor controller={controller} field="hybridStackIn" title="Hybrid stack" />
    </>
  );
}
