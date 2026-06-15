import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { VARIANT_LABELS } from "./constants";
import type { VideoTimeElementDevController } from "./useVideoTimeElementDevController";

export function VideoTimePreviewPanel({
  controller,
}: {
  controller: VideoTimeElementDevController;
}) {
  const { runtimePreview } = controller;
  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementVideoTime", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const guidedPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementVideoTime", ...controller.active },
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
      previewBlock={previewBlock}
      guidedPreviewBlock={guidedPreviewBlock}
      onPreviewExitComplete={controller.onPreviewExitComplete}
      animationSource={controller.active.animation}
    />
  );
}
