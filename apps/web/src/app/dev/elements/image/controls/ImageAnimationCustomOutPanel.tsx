import type {
  PbImageAnimationCurvePreset,
  PbImageAnimationDirection,
  PbImageExitFineTune,
} from "@/app/theme/pb-builder-defaults";
import { CURVE_PRESET_OPTIONS, DIRECTION_OPTIONS } from "../constants";
import { clampNumber } from "../utils";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import { BezierTimingPathPreview } from "@/app/dev/elements/_shared/BezierTimingPathPreview";

type NumericField = {
  key: keyof PbImageExitFineTune;
  label: string;
  min?: number;
  max?: number;
  step?: number;
};

const NUMERIC_FIELDS: NumericField[] = [
  { key: "distancePx", label: "Distance (px)", min: 0, step: 1 },
  { key: "toOpacity", label: "To opacity", min: 0, max: 1, step: 0.01 },
  { key: "toX", label: "To X (px)", step: 1 },
  { key: "toY", label: "To Y (px)", step: 1 },
  { key: "toScale", label: "To scale", min: 0, step: 0.01 },
  { key: "toRotate", label: "To rotate (deg)", step: 1 },
  { key: "duration", label: "Duration (s)", min: 0, step: 0.01 },
  { key: "delay", label: "Delay (s)", min: 0, step: 0.01 },
];

export function ImageAnimationCustomOutPanel({
  controller,
}: {
  controller: PbAnimationLabController;
}) {
  const exit = controller.active.animation.fineTune.exit;
  return (
    <div className="space-y-2 rounded border border-border/70 bg-background/60 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Animate Out
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Direction
          </span>
          <select
            className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
            value={exit.direction}
            onChange={(e) =>
              controller.patchExitFineTune(controller.activeVariant, {
                direction: e.target.value as PbImageAnimationDirection,
              })
            }
          >
            {DIRECTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        {NUMERIC_FIELDS.map((field) => (
          <label key={field.key} className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {field.label}
            </span>
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
              value={exit[field.key] as number}
              onChange={(e) =>
                controller.patchExitFineTune(controller.activeVariant, {
                  [field.key]: normalizeValue(
                    field.key,
                    Number(e.target.value || 0),
                    field.min,
                    field.max
                  ),
                })
              }
            />
          </label>
        ))}
        <label className="space-y-1 sm:col-span-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Curve
          </span>
          <select
            className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
            value={exit.curve.preset}
            onChange={(e) =>
              controller.setExitCurvePreset(
                controller.activeVariant,
                e.target.value as PbImageAnimationCurvePreset
              )
            }
          >
            {CURVE_PRESET_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <BezierTimingPathPreview curve={exit.curve} className="sm:col-span-2" />
        {exit.curve.preset === "customBezier"
          ? exit.curve.customBezier.map((value, index) => (
              <label key={`out-bezier-${index}`} className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{`p${index + 1}`}</span>
                <input
                  type="number"
                  step={0.01}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
                  value={value}
                  onChange={(e) =>
                    controller.setExitBezierValue(
                      controller.activeVariant,
                      index,
                      Number(e.target.value || 0)
                    )
                  }
                />
              </label>
            ))
          : null}
      </div>
    </div>
  );
}

function normalizeValue(key: keyof PbImageExitFineTune, value: number, min?: number, max?: number) {
  if (key === "toOpacity") return clampNumber(value, 0, 1);
  if (key === "toScale") return Math.max(0, value);
  if (min !== undefined || max !== undefined) return clampNumber(value, min ?? value, max ?? value);
  return value;
}
