import type { VideoTimeVariantDefaults } from "../types";
import type { VideoTimeElementDevController } from "../useVideoTimeElementDevController";

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

function levelToSelectValue(level: VideoTimeVariantDefaults["level"]): string {
  if (level === undefined || level === null) return "";
  if (Array.isArray(level)) return String(level[1]);
  return String(level);
}

export function VideoTimeContentControls({
  controller,
}: {
  controller: VideoTimeElementDevController;
}) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Time format and typography settings for the video time readout.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Format
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.format ?? ""}
          onChange={(e) => setVariantPatch(activeVariant, { format: e.target.value || undefined })}
          placeholder="Reserved for custom formatter"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Typography level
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={levelToSelectValue(active.level)}
          onChange={(e) => {
            const v = e.target.value;
            setVariantPatch(activeVariant, {
              level: v === "" ? undefined : (Number(v) as VideoTimeVariantDefaults["level"]),
            });
          }}
        >
          <option value="">Unset (theme default)</option>
          {LEVELS.map((lv) => (
            <option key={lv} value={lv}>
              Level {lv}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground sm:col-span-2">
        <input
          type="checkbox"
          checked={active.wordWrap === true}
          onChange={(e) => setVariantPatch(activeVariant, { wordWrap: e.target.checked })}
        />
        Word wrap
      </label>
    </>
  );
}
