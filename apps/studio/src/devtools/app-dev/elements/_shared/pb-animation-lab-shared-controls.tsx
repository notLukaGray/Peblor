import type { AnimationBehavior } from "@/app/dev/elements/_shared/motion-lab";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import { HYBRID_STACK_OPTIONS } from "@/app/dev/elements/image/constants";
import type { PbImageHybridStackPreset } from "@/app/theme/pb-builder-defaults";

export function SelectPreset({
  controller,
  field,
  label,
  options,
}: {
  controller: PbAnimationLabController;
  field: "entrancePreset" | "exitPreset";
  label: string;
  options: string[];
}) {
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={controller.active.animation[field]}
        onChange={(e) =>
          controller.setAnimationPatch(controller.activeVariant, { [field]: e.target.value })
        }
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function HybridStackEditor({
  controller,
  field,
  title,
}: {
  controller: PbAnimationLabController;
  field: "hybridStackIn" | "hybridStackOut";
  title: string;
}) {
  const list = controller.active.animation.fineTune[field];
  const setList = (next: PbImageHybridStackPreset[]) => {
    controller.setAnimationPatch(controller.activeVariant, {
      fineTune: {
        ...controller.active.animation.fineTune,
        [field]: next.length > 0 ? next : ["none"],
      },
    });
  };
  return (
    <div className="space-y-2 rounded border border-border/50 bg-muted/15 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <button
          type="button"
          onClick={() => setList([...list, "none"])}
          className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-foreground hover:bg-muted"
        >
          + Layer
        </button>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {list.map((value, index) => (
          <li key={`${field}-${index}`} className="flex items-center gap-2">
            <select
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
              value={value}
              onChange={(e) => {
                const next = [...list];
                next[index] = e.target.value as PbImageHybridStackPreset;
                setList(next);
              }}
            >
              {HYBRID_STACK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {list.length > 1 ? (
              <button
                type="button"
                aria-label={`Remove layer ${index + 1}`}
                onClick={() => setList(list.filter((_, i) => i !== index))}
                className="shrink-0 rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function patchSideBehavior(
  controller: PbAnimationLabController,
  side: "entrance" | "exit",
  next: AnimationBehavior
) {
  const fineTune = controller.active.animation.fineTune;
  const key = side === "entrance" ? "entranceBehavior" : "exitBehavior";
  const nextFineTune = { ...fineTune, [key]: next };
  controller.setAnimationPatch(controller.activeVariant, {
    fineTune: {
      ...nextFineTune,
      hybridStackIn: fineTune.hybridStackIn.length > 0 ? [...fineTune.hybridStackIn] : ["none"],
      hybridStackOut: fineTune.hybridStackOut.length > 0 ? [...fineTune.hybridStackOut] : ["none"],
      hybridEntranceDuration: Math.max(0.05, fineTune.hybridEntranceDuration ?? 0.45),
      hybridExitDuration: Math.max(0.05, fineTune.hybridExitDuration ?? 0.45),
    },
  });
}
