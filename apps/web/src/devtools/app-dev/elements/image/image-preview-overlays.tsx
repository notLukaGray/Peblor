import { curvePreviewLabel } from "@/app/dev/elements/image/utils";
import { VARIANT_LABELS } from "@/app/dev/elements/image/constants";
import type { PreviewResolvedVariant } from "@/app/dev/elements/image/preview-motion";
import type { ImageElementDevController } from "@/app/dev/elements/image/useImageElementDevController";

function VisibilityOverlay({ hidden }: { hidden: boolean }) {
  if (!hidden) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <p className="rounded bg-background/80 px-2 py-1 text-center font-mono text-[10px] text-foreground">
        Hidden by visibleWhen
      </p>
    </div>
  );
}

function MotionModeOverlay({ controller }: { controller: ImageElementDevController }) {
  if (controller.showFineTuneControls) {
    return (
      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-background/70 px-2 py-1 font-mono text-[10px] text-foreground">
        {curvePreviewLabel(controller.active.animation.fineTune.entrance.curve)}
      </div>
    );
  }
  if (controller.showHybridControls) {
    return (
      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-background/70 px-2 py-1 font-mono text-[10px] text-foreground">
        {controller.active.animation.fineTune.hybridStackIn.join("+") +
          " / " +
          controller.active.animation.fineTune.hybridStackOut.join("+") +
          " · " +
          controller.active.animation.fineTune.hybridEntranceDuration +
          "s / " +
          controller.active.animation.fineTune.hybridExitDuration +
          "s"}
      </div>
    );
  }
  return null;
}

export function ImagePreviewOverlays({
  controller,
  previewVariant,
  hiddenByVisibleWhenRuntime,
}: {
  controller: ImageElementDevController;
  previewVariant: PreviewResolvedVariant;
  hiddenByVisibleWhenRuntime: boolean;
}) {
  const animationSummary =
    controller.active.animation.trigger +
    " → out:" +
    controller.active.animation.exitTrigger +
    " · in: " +
    controller.active.animation.fineTune.entranceBehavior +
    " / out: " +
    controller.active.animation.fineTune.exitBehavior +
    (controller.showPresetControls
      ? " · " +
        controller.active.animation.entrancePreset +
        " / " +
        controller.active.animation.exitPreset
      : "");

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 max-w-[min(100%,14rem)] rounded bg-background/70 px-2 py-1 font-mono text-[10px] text-foreground">
        {(controller.isCustomVariant ? "Custom" : VARIANT_LABELS[controller.activeVariant]) +
          " · " +
          previewVariant.layoutMode +
          " · " +
          previewVariant.objectFit +
          " · " +
          controller.previewDevice +
          " · ElementRenderer"}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-background/70 px-2 py-1 font-mono text-[10px] text-foreground">
        {animationSummary}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 max-w-[min(100%,12rem)] text-right font-mono text-[10px] text-foreground">
        <span className="rounded bg-background/70 px-2 py-1">
          {(controller.runtimePreview.linkHref ? "link on" : "no link") +
            " · " +
            (hiddenByVisibleWhenRuntime ? "hidden (visibleWhen)" : "visible")}
        </span>
      </div>

      <VisibilityOverlay hidden={hiddenByVisibleWhenRuntime} />
      <MotionModeOverlay controller={controller} />
    </>
  );
}
