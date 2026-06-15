import type {
  DurationKey,
  EasingKey,
  OpacityKey,
  StyleFoundationSlices,
  ZIndexKey,
} from "./style-foundation-slices-types";
import {
  DURATION_KEYS,
  EASING_KEYS,
  OPACITY_KEYS,
  Z_INDEX_KEYS,
} from "./style-foundation-slices-types";

type Props = {
  foundationSlices: Pick<StyleFoundationSlices, "motion" | "opacityScale" | "zIndexLayers">;
  onReduceMotionPolicyChange: (
    value: StyleFoundationSlices["motion"]["reduceMotionPolicy"]
  ) => void;
  onStaggerStepChange: (value: string) => void;
  onDurationChange: (key: DurationKey, value: string) => void;
  onEasingChange: (key: EasingKey, value: string) => void;
  onOpacityChange: (key: OpacityKey, value: string) => void;
  onZIndexChange: (key: ZIndexKey, value: string) => void;
};

export function StyleFoundationMotionSections({
  foundationSlices,
  onReduceMotionPolicyChange,
  onStaggerStepChange,
  onDurationChange,
  onEasingChange,
  onOpacityChange,
  onZIndexChange,
}: Props) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3 rounded border border-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Motion policy
          </p>
          <label className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Reduce motion
            </span>
            <select
              className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={foundationSlices.motion.reduceMotionPolicy}
              onChange={(e) =>
                onReduceMotionPolicyChange(
                  e.target.value as StyleFoundationSlices["motion"]["reduceMotionPolicy"]
                )
              }
            >
              <option value="honor-system">Honor system preference</option>
              <option value="disable-all">Disable all motion</option>
              <option value="replace-with-fade">Replace with fade</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Stagger step (ms)
            </span>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={foundationSlices.motion.staggerStep}
              onChange={(e) => onStaggerStepChange(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-3 rounded border border-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Motion durations and easings
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              {DURATION_KEYS.map((key) => (
                <label key={key} className="space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {key} (ms)
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={foundationSlices.motion.durations[key]}
                    onChange={(e) => onDurationChange(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="space-y-2">
              {EASING_KEYS.map((key) => (
                <label key={key} className="space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {key}
                  </span>
                  <input
                    type="text"
                    className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={foundationSlices.motion.easings[key]}
                    onChange={(e) => onEasingChange(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3 rounded border border-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Opacity scale
          </p>
          <div className="space-y-2">
            {OPACITY_KEYS.map((key) => (
              <label key={key} className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {key}
                </span>
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  max={1}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={foundationSlices.opacityScale[key]}
                  onChange={(e) => onOpacityChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded border border-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Z-index layers
          </p>
          <div className="space-y-2">
            {Z_INDEX_KEYS.map((key) => (
              <label key={key} className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {key}
                </span>
                <input
                  type="number"
                  step={1}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={foundationSlices.zIndexLayers[key]}
                  onChange={(e) => onZIndexChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
