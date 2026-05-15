import type { AnimationBehavior } from "@/app/dev/elements/_shared/motion-lab";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import {
  ANIMATION_EXIT_TRIGGER_OPTIONS,
  EXIT_PRESET_OPTIONS,
} from "@/app/dev/elements/image/constants";
import { ImageAnimationCustomOutPanel } from "@/app/dev/elements/image/controls/ImageAnimationCustomOutPanel";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";
import {
  HybridStackEditor,
  SelectPreset,
  patchSideBehavior,
} from "./pb-animation-lab-shared-controls";

function ExitViewportMarginField({ controller }: { controller: PbAnimationLabController }) {
  const animation = controller.active.animation;
  if (animation.exitTrigger !== "leaveViewport") return null;
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Exit viewport margin
      </span>
      <input
        type="text"
        className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
        placeholder='e.g. "-12% 0px"'
        value={animation.exitViewport?.margin ?? ""}
        onChange={(e) => {
          const margin = e.target.value.trim();
          controller.setAnimationPatch(controller.activeVariant, {
            exitViewport: margin ? { ...animation.exitViewport, margin } : undefined,
          });
        }}
      />
    </label>
  );
}

function ExitAnimateField({ controller }: { controller: PbAnimationLabController }) {
  const animation = controller.active.animation;
  const fineTune = animation.fineTune;
  if (fineTune.exitBehavior === "custom") {
    return (
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Animate
        </span>
        <select
          disabled
          className="w-full cursor-not-allowed rounded border border-border bg-muted/30 px-3 py-2 font-mono text-[11px]"
          value="__custom"
        >
          <option value="__custom">CUSTOM ({animation.exitPreset})</option>
        </select>
      </label>
    );
  }
  return (
    <SelectPreset
      controller={controller}
      field="exitPreset"
      label="Animate"
      options={EXIT_PRESET_OPTIONS}
    />
  );
}

function ExitPresetDurationField({ controller }: { controller: PbAnimationLabController }) {
  const animation = controller.active.animation;
  const fineTune = animation.fineTune;
  if (fineTune.exitBehavior !== "preset") return null;
  return (
    <label className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Duration (s)
      </span>
      <input
        type="number"
        min={0.05}
        step={0.01}
        placeholder="Engine default"
        className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
        value={animation.presetExitDuration ?? ""}
        onChange={(e) => {
          const next = e.target.value;
          controller.setAnimationPatch(controller.activeVariant, {
            presetExitDuration: next.trim() === "" ? undefined : Math.max(0.05, Number(next)),
          });
        }}
      />
    </label>
  );
}

function ExitHybridSection({ controller }: { controller: PbAnimationLabController }) {
  const fineTune = controller.active.animation.fineTune;
  if (fineTune.exitBehavior !== "hybrid") return null;
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
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
          value={fineTune.hybridExitDuration}
          onChange={(e) =>
            controller.setAnimationPatch(controller.activeVariant, {
              fineTune: {
                ...fineTune,
                hybridExitDuration: Math.max(0.05, Number(e.target.value) || 0.45),
              },
            })
          }
        />
      </label>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Hybrid layout
        </span>
        <p className="rounded border border-border/60 bg-background/50 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
          Ordered/Layered applies to entrance only
        </p>
      </label>
      <HybridStackEditor controller={controller} field="hybridStackOut" title="Hybrid stack" />
    </>
  );
}

function ExitCustomSection({ controller }: { controller: PbAnimationLabController }) {
  const fineTune = controller.active.animation.fineTune;
  if (fineTune.exitBehavior !== "custom") return null;
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
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
          value={fineTune.exit.duration}
          onChange={(e) =>
            controller.patchExitFineTune(controller.activeVariant, {
              duration: Math.max(0.05, Number(e.target.value) || 0.05),
            })
          }
        />
      </label>
      <div className="space-y-2 rounded border border-dashed border-border/70 bg-muted/10 p-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Tweens
        </p>
        <ImageAnimationCustomOutPanel controller={controller} />
      </div>
    </>
  );
}

export function PbAnimationExitControls({ controller }: { controller: PbAnimationLabController }) {
  const { activeVariant } = controller;
  const animation = controller.active.animation;
  const fineTune = animation.fineTune;
  return (
    <div className="min-w-0 w-full space-y-3 rounded-lg border border-border/70 bg-muted/5 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-foreground">Animation out</p>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Trigger
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={animation.exitTrigger}
          onChange={(e) =>
            controller.setAnimationPatch(activeVariant, {
              exitTrigger: e.target.value as PbImageAnimationDefaults["exitTrigger"],
            })
          }
        >
          {ANIMATION_EXIT_TRIGGER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "manual" ? "manual (parent / prop)" : opt}
            </option>
          ))}
        </select>
      </label>
      <ExitViewportMarginField controller={controller} />
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Behavior
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={fineTune.exitBehavior}
          onChange={(e) =>
            patchSideBehavior(controller, "exit", e.target.value as AnimationBehavior)
          }
        >
          <option value="preset">Preset</option>
          <option value="hybrid">Hybrid</option>
          <option value="custom">Complex</option>
        </select>
      </label>
      <ExitAnimateField controller={controller} />
      <ExitPresetDurationField controller={controller} />
      <ExitHybridSection controller={controller} />
      <ExitCustomSection controller={controller} />
    </div>
  );
}
