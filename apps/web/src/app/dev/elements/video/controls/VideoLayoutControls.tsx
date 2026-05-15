import { SharedFoundationLayoutFields } from "@/app/dev/elements/_shared/dev-controls";
import { VIDEO_OBJECT_FIT_OPTIONS } from "../constants";
import type { VideoVariantDefaults } from "../types";
import type { VideoElementDevController } from "../useVideoElementDevController";

export function VideoLayoutControls({ controller }: { controller: VideoElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Object fit, aspect ratio, playback flags, and foundation layout fields.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Object fit
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={typeof active.objectFit === "string" ? active.objectFit : "cover"}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              objectFit: e.target.value as VideoVariantDefaults["objectFit"],
            })
          }
        >
          {VIDEO_OBJECT_FIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Aspect ratio
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
          value={typeof active.aspectRatio === "string" ? active.aspectRatio : ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              aspectRatio: e.target.value || undefined,
            })
          }
          placeholder="e.g. 16/9"
        />
      </label>

      <div className="sm:col-span-2 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Playback flags
        </p>
        <div className="flex flex-wrap gap-4">
          {(["showPlayButton", "autoplay", "loop", "muted"] as const).map((field) => (
            <label
              key={field}
              className="inline-flex items-center gap-2 text-[11px] text-foreground"
            >
              <input
                type="checkbox"
                checked={Boolean(active[field])}
                onChange={(e) => setVariantPatch(activeVariant, { [field]: e.target.checked })}
              />
              {field}
            </label>
          ))}
        </div>
      </div>

      <SharedFoundationLayoutFields<VideoVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
