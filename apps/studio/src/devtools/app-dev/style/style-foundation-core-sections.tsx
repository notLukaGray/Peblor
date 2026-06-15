import type {
  BorderWidthKey,
  ContentWidthKey,
  ShadowLevelKey,
  StyleFoundationSlices,
} from "./style-foundation-slices-types";
import {
  BORDER_WIDTH_KEYS,
  CONTENT_WIDTH_KEYS,
  SHADOW_LEVEL_KEYS,
} from "./style-foundation-slices-types";

type Props = {
  foundationSlices: Pick<
    StyleFoundationSlices,
    "shadowScale" | "shadowScaleDark" | "borderWidthScale" | "contentWidths" | "breakpoints"
  >;
  breakpointWarning: boolean;
  onShadowChange: (theme: "light" | "dark", key: ShadowLevelKey, value: string) => void;
  onBorderWidthChange: (key: BorderWidthKey, value: string) => void;
  onContentWidthChange: (key: ContentWidthKey, value: string) => void;
  onBreakpointChange: (key: "mobile" | "desktop", value: string) => void;
};

export function StyleFoundationCoreSections({
  foundationSlices,
  breakpointWarning,
  onShadowChange,
  onBorderWidthChange,
  onContentWidthChange,
  onBreakpointChange,
}: Props) {
  return (
    <>
      <div className="space-y-3 rounded border border-border/70 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Shadows (light and dark)
        </p>
        <div className="overflow-x-auto rounded border border-border/80">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Level
                </th>
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Light token
                </th>
                <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                  Dark token
                </th>
              </tr>
            </thead>
            <tbody>
              {SHADOW_LEVEL_KEYS.map((key) => (
                <tr key={key} className="border-b border-border/80 last:border-b-0">
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{key}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={foundationSlices.shadowScale[key]}
                      onChange={(e) => onShadowChange("light", key, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={foundationSlices.shadowScaleDark[key]}
                      onChange={(e) => onShadowChange("dark", key, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3 rounded border border-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Border width scale
          </p>
          <div className="space-y-2">
            {BORDER_WIDTH_KEYS.map((key) => (
              <label key={key} className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {key}
                </span>
                <input
                  type="text"
                  className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={foundationSlices.borderWidthScale[key]}
                  onChange={(e) => onBorderWidthChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded border border-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Content width presets
          </p>
          <div className="space-y-2">
            {CONTENT_WIDTH_KEYS.map((key) => (
              <label key={key} className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {key}
                </span>
                <input
                  type="text"
                  className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={foundationSlices.contentWidths[key]}
                  onChange={(e) => onContentWidthChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded border border-border/70 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Breakpoints
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Mobile max (px)
            </span>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={foundationSlices.breakpoints.mobile}
              onChange={(e) => onBreakpointChange("mobile", e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Desktop min (px)
            </span>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={foundationSlices.breakpoints.desktop}
              onChange={(e) => onBreakpointChange("desktop", e.target.value)}
            />
          </label>
        </div>
        {breakpointWarning ? (
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            Mobile breakpoint is greater than or equal to desktop. Keep mobile &lt; desktop for
            deterministic expansion.
          </p>
        ) : null}
      </div>
    </>
  );
}
