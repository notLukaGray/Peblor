import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { VARIANT_LABELS } from "./constants";
import type { VectorElementDevController } from "./useVectorElementDevController";

function getVectorMissingHints(active: VectorElementDevController["active"]): string[] {
  const hints: string[] = [];
  if (typeof active.viewBox !== "string" || active.viewBox.trim().length === 0) {
    hints.push("Add a valid viewBox to render vector geometry.");
  }
  if (!Array.isArray(active.shapes) || active.shapes.length === 0) {
    hints.push("Paste Vector JSON or import SVG paths to add shapes.");
  }
  return hints;
}

export function VectorPreviewPanel({ controller }: { controller: VectorElementDevController }) {
  const { runtimePreview } = controller;
  const missingHints = useMemo(() => getVectorMissingHints(controller.active), [controller.active]);
  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementVector", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const guidedPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementVector", ...controller.active },
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
        previewBlock={previewBlock}
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
