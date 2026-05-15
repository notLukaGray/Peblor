import type { ImageElementDevController } from "@/app/dev/elements/image/useImageElementDevController";

export function ImagePreviewToolbar({ controller }: { controller: ImageElementDevController }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Preview
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={controller.animateInPreview}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Animate in
          </button>
          <button
            type="button"
            onClick={controller.animateOutPreview}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Animate out
          </button>
          <button
            type="button"
            onClick={controller.showPreview}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Show
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={controller.autoLoop}
            onChange={(event) => controller.setAutoLoop(event.target.checked)}
          />
          Auto loop
        </label>
      </div>
    </>
  );
}
