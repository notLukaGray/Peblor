import { SharedFoundationLayoutFields } from "@/app/dev/elements/_shared/dev-controls";
import type { Model3dElementDevController } from "../useModel3dElementDevController";

export function Model3dLayoutControls({ controller }: { controller: Model3dElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Aspect ratio, border radius, and margins. Deep scene/model/camera config belongs in Custom
          JSON.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Aspect ratio
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
          value={typeof active.aspectRatio === "string" ? active.aspectRatio : ""}
          onChange={(e) => setVariantPatch(activeVariant, { aspectRatio: e.target.value })}
          placeholder="e.g. 16/9"
        />
      </label>

      <SharedFoundationLayoutFields
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
