import { SharedFoundationLayoutFields } from "@/app/dev/elements/_shared/dev-controls";
import { RIVE_FIT_OPTIONS } from "../constants";
import type { RiveElementDevController } from "../useRiveElementDevController";

export function RiveLayoutControls({ controller }: { controller: RiveElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Playback config, layout sizing, and presentation. Wire the{" "}
          <code className="font-mono text-[10px]">src</code> field via Custom JSON or the handoff
          snippet.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Artboard
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
          value={active.artboard ?? ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              artboard: e.target.value === "" ? undefined : e.target.value,
            })
          }
          placeholder="optional — first artboard in file"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          State machine
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
          value={active.stateMachine ?? ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              stateMachine: e.target.value === "" ? undefined : e.target.value,
            })
          }
          placeholder="optional"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active.autoplay ?? false}
          onChange={(e) => setVariantPatch(activeVariant, { autoplay: e.target.checked })}
        />
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Autoplay
        </span>
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Fit
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.fit ?? "contain"}
          onChange={(e) =>
            setVariantPatch(activeVariant, { fit: e.target.value as typeof active.fit })
          }
        >
          {RIVE_FIT_OPTIONS.map((opt) => (
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
          value={active.aspectRatio ?? ""}
          onChange={(e) => setVariantPatch(activeVariant, { aspectRatio: e.target.value })}
          placeholder="e.g. 1/1"
        />
      </label>

      <SharedFoundationLayoutFields
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
