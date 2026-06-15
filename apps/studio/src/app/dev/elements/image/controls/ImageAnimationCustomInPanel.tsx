import type {
  PbImageAnimationCurvePreset,
  PbImageAnimationDirection,
  PbImageEntranceFineTune,
} from "@/app/theme/pb-builder-defaults";
import { CURVE_PRESET_OPTIONS, DIRECTION_OPTIONS } from "../constants";
import { clampNumber } from "../utils";
import type { PbAnimationLabController } from "@/app/dev/elements/_shared/pb-animation-lab-controller";
import { BezierTimingPathPreview } from "@/app/dev/elements/_shared/BezierTimingPathPreview";

type NumericField = {
  key: keyof PbImageEntranceFineTune;
  label: string;
  min?: number;
  max?: number;
  step?: number;
};

const NUMERIC_FIELDS: NumericField[] = [
  { key: "distancePx", label: "Distance (px)", min: 0, step: 1 },
  { key: "fromOpacity", label: "From opacity", min: 0, max: 1, step: 0.01 },
  { key: "toOpacity", label: "To opacity", min: 0, max: 1, step: 0.01 },
  { key: "fromX", label: "From X (px)", step: 1 },
  { key: "toX", label: "To X (px)", step: 1 },
  { key: "fromY", label: "From Y (px)", step: 1 },
  { key: "toY", label: "To Y (px)", step: 1 },
  { key: "fromScale", label: "From scale", min: 0, step: 0.01 },
  { key: "toScale", label: "To scale", min: 0, step: 0.01 },
  { key: "fromRotate", label: "From rotate (deg)", step: 1 },
  { key: "toRotate", label: "To rotate (deg)", step: 1 },
  { key: "duration", label: "Duration (s)", min: 0, step: 0.01 },
  { key: "delay", label: "Delay (s)", min: 0, step: 0.01 },
];

export function ImageAnimationCustomInPanel({
  controller,
}: {
  controller: PbAnimationLabController;
}) {
  const entrance = controller.active.animation.fineTune.entrance;
  return (
    <div className="space-y-2 rounded border border-border/70 bg-background/60 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Animate In
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Direction
          </span>
          <select
            className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
            value={entrance.direction}
            onChange={(e) =>
              controller.patchEntranceFineTune(controller.activeVariant, {
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
              value={entrance[field.key] as number}
              onChange={(e) =>
                controller.patchEntranceFineTune(controller.activeVariant, {
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
            value={entrance.curve.preset}
            onChange={(e) =>
              controller.setEntranceCurvePreset(
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
        <BezierTimingPathPreview curve={entrance.curve} className="sm:col-span-2" />
        {entrance.curve.preset === "customBezier"
          ? entrance.curve.customBezier.map((value, index) => (
              <label key={`in-bezier-${index}`} className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{`p${index + 1}`}</span>
                <input
                  type="number"
                  step={0.01}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
                  value={value}
                  onChange={(e) =>
                    controller.setEntranceBezierValue(
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

const OPACITY_KEYS = new Set<keyof PbImageEntranceFineTune>(["fromOpacity", "toOpacity"]);
const SCALE_KEYS = new Set<keyof PbImageEntranceFineTune>(["fromScale", "toScale"]);

function normalizeWithinBounds(value: number, min?: number, max?: number): number {
  if (min === undefined && max === undefined) return value;
  const floor = min ?? value;
  const ceiling = max ?? value;
  return clampNumber(value, floor, ceiling);
}

function normalizeValue(
  key: keyof PbImageEntranceFineTune,
  value: number,
  min?: number,
  max?: number
) {
  if (OPACITY_KEYS.has(key)) return clampNumber(value, 0, 1);
  if (SCALE_KEYS.has(key)) return Math.max(0, value);
  if (min !== undefined || max !== undefined) return normalizeWithinBounds(value, min, max);
  return value;
}
