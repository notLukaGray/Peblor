import type { SpacerElementDevController } from "../useSpacerElementDevController";

export function SpacerContentControls({ controller }: { controller: SpacerElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Spacer dimensions that define the empty rhythm space on the page.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Height
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={typeof active.height === "string" ? active.height : ""}
          onChange={(e) => setVariantPatch(activeVariant, { height: e.target.value || undefined })}
          placeholder="e.g. 3rem"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Width
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={typeof active.width === "string" ? active.width : ""}
          onChange={(e) => setVariantPatch(activeVariant, { width: e.target.value || undefined })}
          placeholder="e.g. 100%"
        />
      </label>
    </>
  );
}
