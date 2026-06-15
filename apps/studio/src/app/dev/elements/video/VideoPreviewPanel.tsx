import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { PREVIEW_FALLBACK_POSTER_SRC, VARIANT_LABELS } from "./constants";
import type { VideoElementDevController } from "./useVideoElementDevController";

function getVideoMissingHints(active: VideoElementDevController["active"]): string[] {
  const hints: string[] = [];
  if (typeof active.src !== "string" || active.src.trim().length === 0) {
    hints.push("Add a video source (upload or URL) to enable playback in preview.");
  }
  if (typeof active.poster !== "string" || active.poster.trim().length === 0) {
    hints.push("Poster is optional, but adding one improves fallback rendering before playback.");
  }
  return hints;
}

export function VideoPreviewPanel({ controller }: { controller: VideoElementDevController }) {
  const { runtimePreview } = controller;
  const missingHints = useMemo(() => getVideoMissingHints(controller.active), [controller.active]);
  const rawPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          ...controller.active,
          type: "elementVideo",
          src: controller.active.src ?? "",
          poster: controller.active.poster ?? "",
        },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );
  const guidedPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          ...controller.active,
          type: "elementVideo",
          src: controller.active.src ?? "",
          poster: controller.active.poster?.trim()
            ? controller.active.poster
            : PREVIEW_FALLBACK_POSTER_SRC,
        },
        { mode: "guided" }
      ),
    [controller.active, controller.runtimeDraft]
  );
  const hiddenByVisibleWhen =
    controller.runtimeDraft.visibleWhenEnabled && !runtimePreview.visibleWhenMatches;
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];

  return (
    <div className="space-y-3">
      <TypographyLiveMotionPreview
        previewVisible={controller.previewVisible}
        previewKey={controller.previewKey}
        autoLoop={controller.autoLoop}
        setAutoLoop={controller.setAutoLoop}
        animateInPreview={controller.animateInPreview}
        animateOutPreview={controller.animateOutPreview}
        showPreview={controller.showPreview}
        variantLabel={variantLabel}
        hiddenByVisibleWhen={hiddenByVisibleWhen}
        runtimeDraft={controller.runtimeDraft}
        previewBlock={rawPreviewBlock}
        guidedPreviewBlock={guidedPreviewBlock}
        onPreviewExitComplete={controller.onPreviewExitComplete}
        animationSource={controller.active.animation}
      />
      {missingHints.length > 0 ? (
        <div className="rounded border border-border/60 bg-muted/10 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Missing Fields
          </p>
          <div className="mt-1 space-y-1">
            {missingHints.map((hint) => (
              <p key={hint} className="text-[10px] text-muted-foreground">
                {hint}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
