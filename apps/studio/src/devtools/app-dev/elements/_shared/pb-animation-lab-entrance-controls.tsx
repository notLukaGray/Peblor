import type { AnimationBehavior } from "@/app/dev/elements/_shared/motion-lab";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import {
  ANIMATION_TRIGGER_OPTIONS,
  ENTRANCE_PRESET_OPTIONS,
} from "@/app/dev/elements/image/constants";
import { ImageAnimationCustomInPanel } from "@/app/dev/elements/image/controls/ImageAnimationCustomInPanel";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";
import { EntranceHybridSection } from "./pb-animation-lab-entrance-hybrid-controls";
import { SelectPreset, patchSideBehavior } from "./pb-animation-lab-shared-controls";

function EntranceAnimateField({ controller }: { controller: PbAnimationLabController }) {
  const animation = controller.active.animation;
  const fineTune = animation.fineTune;
  if (fineTune.entranceBehavior === "custom") {
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
          <option value="__custom">CUSTOM ({animation.entrancePreset})</option>
        </select>
      </label>
    );
  }
  return (
    <SelectPreset
      controller={controller}
      field="entrancePreset"
      label="Animate"
      options={ENTRANCE_PRESET_OPTIONS}
    />
  );
}

function EntrancePresetDurationField({ controller }: { controller: PbAnimationLabController }) {
  const animation = controller.active.animation;
  const fineTune = animation.fineTune;
  if (fineTune.entranceBehavior !== "preset") return null;
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
        value={animation.presetEntranceDuration ?? ""}
        onChange={(e) => {
          const next = e.target.value;
          controller.setAnimationPatch(controller.activeVariant, {
            presetEntranceDuration: next.trim() === "" ? undefined : Math.max(0.05, Number(next)),
          });
        }}
      />
    </label>
  );
}

function EntranceCustomSection({ controller }: { controller: PbAnimationLabController }) {
  const fineTune = controller.active.animation.fineTune;
  if (fineTune.entranceBehavior !== "custom") return null;
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
          value={fineTune.entrance.duration}
          onChange={(e) =>
            controller.patchEntranceFineTune(controller.activeVariant, {
              duration: Math.max(0.05, Number(e.target.value) || 0.05),
            })
          }
        />
      </label>
      <div className="space-y-2 rounded border border-dashed border-border/70 bg-muted/10 p-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Tweens
        </p>
        <ImageAnimationCustomInPanel controller={controller} />
      </div>
    </>
  );
}

export function PbAnimationEntranceControls({
  controller,
}: {
  controller: PbAnimationLabController;
}) {
  const { activeVariant } = controller;
  const animation = controller.active.animation;
  const fineTune = animation.fineTune;
  return (
    <div className="min-w-0 w-full space-y-3 rounded-lg border border-border/70 bg-muted/5 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-foreground">Animation in</p>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Trigger
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={animation.trigger}
          onChange={(e) =>
            controller.setAnimationPatch(activeVariant, {
              trigger: e.target.value as PbImageAnimationDefaults["trigger"],
            })
          }
        >
          {ANIMATION_TRIGGER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Behavior
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={fineTune.entranceBehavior}
          onChange={(e) =>
            patchSideBehavior(controller, "entrance", e.target.value as AnimationBehavior)
          }
        >
          <option value="preset">Preset</option>
          <option value="hybrid">Hybrid</option>
          <option value="custom">Complex</option>
        </select>
      </label>
      <EntranceAnimateField controller={controller} />
      <EntrancePresetDurationField controller={controller} />
      <EntranceHybridSection controller={controller} />
      <EntranceCustomSection controller={controller} />
    </div>
  );
}
