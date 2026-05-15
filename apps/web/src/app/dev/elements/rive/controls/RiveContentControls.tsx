import { RIVE_FIT_OPTIONS } from "../constants";
import type { RiveElementDevController } from "../useRiveElementDevController";

export function RiveContentControls({ controller }: { controller: RiveElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Rive file source, artboard/state machine, playback, and accessibility fields.
        </p>
      </div>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Rive source
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.src ?? ""}
          onChange={(e) => setVariantPatch(activeVariant, { src: e.target.value })}
          placeholder="Path or URL to .riv file"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Artboard
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.artboard ?? ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, { artboard: e.target.value || undefined })
          }
          placeholder="optional"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          State machine
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.stateMachine ?? ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, { stateMachine: e.target.value || undefined })
          }
          placeholder="optional"
        />
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

      <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground">
        <input
          type="checkbox"
          checked={active.autoplay ?? false}
          onChange={(e) => setVariantPatch(activeVariant, { autoplay: e.target.checked })}
        />
        Autoplay
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Aria label
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.ariaLabel ?? ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, { ariaLabel: e.target.value || undefined })
          }
          placeholder="Rive animation"
        />
      </label>
    </>
  );
}
