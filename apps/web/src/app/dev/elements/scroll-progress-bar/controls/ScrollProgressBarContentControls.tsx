import type { ScrollProgressBarElementDevController } from "../useScrollProgressBarElementDevController";
import { themeStringToInputValue } from "@/app/dev/elements/_shared/theme-string";

function offsetStart(offset: [string, string] | undefined): string {
  return Array.isArray(offset) ? offset[0] : "";
}

function offsetEnd(offset: [string, string] | undefined): string {
  return Array.isArray(offset) ? offset[1] : "";
}

export function ScrollProgressBarContentControls({
  controller,
}: {
  controller: ScrollProgressBarElementDevController;
}) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Bar visuals and scroll offset tuple. Maps to <code>elementScrollProgressBar</code> content
          fields.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Height
        </label>
        <input
          type="text"
          value={active.height ?? ""}
          onChange={(e) => setVariantPatch(activeVariant, { height: e.target.value || undefined })}
          placeholder="e.g. 3px"
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Fill
        </label>
        <input
          type="text"
          value={themeStringToInputValue(active.fill)}
          onChange={(e) => setVariantPatch(activeVariant, { fill: e.target.value || undefined })}
          placeholder="e.g. rgba(255,255,255,0.9)"
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {themeStringToInputValue(active.fill) ? (
          <div
            className="mt-1 h-3 w-full rounded"
            style={{
              backgroundColor: themeStringToInputValue(active.fill),
              outline: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Track background
        </label>
        <input
          type="text"
          value={themeStringToInputValue(active.trackBackground)}
          onChange={(e) =>
            setVariantPatch(activeVariant, { trackBackground: e.target.value || undefined })
          }
          placeholder="e.g. rgba(255,255,255,0.15)"
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {themeStringToInputValue(active.trackBackground) &&
        themeStringToInputValue(active.trackBackground) !== "transparent" ? (
          <div
            className="mt-1 h-3 w-full rounded"
            style={{
              backgroundColor: themeStringToInputValue(active.trackBackground),
              outline: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Offset start
        </label>
        <input
          type="text"
          value={offsetStart(active.offset)}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              offset: [e.target.value || "start end", offsetEnd(active.offset) || "end start"],
            })
          }
          placeholder="start end"
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Offset end
        </label>
        <input
          type="text"
          value={offsetEnd(active.offset)}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              offset: [offsetStart(active.offset) || "start end", e.target.value || "end start"],
            })
          }
          placeholder="end start"
          className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </>
  );
}
