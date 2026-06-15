import type { ImageElementDevController } from "../useImageElementDevController";

export function ImageContentControls({ controller }: { controller: ImageElementDevController }) {
  const { active, activeVariant, setVariantPatch, previewUploadName } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Image-specific behavior that affects authored content usage.
        </p>
      </div>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Preview source
        </span>
        <div className="rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground">
          {previewUploadName ? (
            <>
              Preview upload in use: <code>{previewUploadName}</code>
            </>
          ) : (
            <>Using variant defaults. Upload a temporary image in the preview toolbar.</>
          )}
        </div>
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout mode
        </span>
        <div className="rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground">
          <code>{active.layoutMode}</code>
        </div>
      </label>

      <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground sm:col-span-2">
        <input
          type="checkbox"
          checked={active.priority === true}
          onChange={(e) => setVariantPatch(activeVariant, { priority: e.target.checked })}
        />
        Priority load
      </label>
    </>
  );
}
