import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { DEFAULT_MARKUP, VARIANT_LABELS } from "./constants";
import type { SvgElementDevController } from "./useSvgElementDevController";

export function SvgPreviewPanel({ controller }: { controller: SvgElementDevController }) {
  const { runtimePreview } = controller;
  const hasMarkup =
    typeof controller.active.markup === "string" && controller.active.markup.trim().length > 0;
  const rawPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          type: "elementSVG",
          ...controller.active,
          markup: controller.active.markup ?? "",
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
          type: "elementSVG",
          ...controller.active,
          markup: controller.active.markup ?? DEFAULT_MARKUP,
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
      {!hasMarkup ? (
        <div className="rounded border border-border/60 bg-muted/10 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Missing Fields
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Markup is empty, so preview falls back to starter SVG content.
          </p>
        </div>
      ) : null}
    </div>
  );
}
