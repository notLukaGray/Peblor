import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import type { ElementBlock } from "@pb/contracts";
import { VARIANT_LABELS } from "./constants";
import type { ScrollProgressBarElementDevController } from "./useScrollProgressBarElementDevController";

export function ScrollProgressBarPreviewPanel({
  controller,
}: {
  controller: ScrollProgressBarElementDevController;
}) {
  const { runtimePreview } = controller;

  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementScrollProgressBar", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  // Guided: show bar above a content block so its placement context is visible
  const guidedPreviewBlock = useMemo(
    (): ElementBlock => ({
      type: "elementGroup",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
      section: {
        elementOrder: ["bar", "caption"],
        definitions: {
          bar: buildResolvedTypographyWorkbenchBlock(
            controller.runtimeDraft,
            { type: "elementScrollProgressBar", ...controller.active },
            { mode: "guided" }
          ),
          caption: {
            type: "elementBody",
            text: "Static fill shown at 60% to visualise track/fill contrast. Actual progress is driven by scroll position at runtime.",
            level: 6,
            opacity: 0.6,
          },
        },
      },
    }),
    [controller.active, controller.runtimeDraft]
  );

  // Stress: multiple bars stacked to validate fill/track contrast in a dense context
  const scenarioBlocks = useMemo(
    (): Partial<Record<"stress" | "mobile" | "light", ElementBlock>> => ({
      stress: {
        type: "elementGroup",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        section: {
          elementOrder: ["bar1", "label1", "bar2", "label2", "bar3", "label3"],
          definitions: {
            bar1: buildResolvedTypographyWorkbenchBlock(
              controller.runtimeDraft,
              { type: "elementScrollProgressBar", ...controller.active },
              { mode: "guided" }
            ),
            label1: {
              type: "elementBody",
              text: "First instance — simulates placement at top of section",
              level: 5,
              opacity: 0.55,
            },
            bar2: buildResolvedTypographyWorkbenchBlock(
              controller.runtimeDraft,
              { type: "elementScrollProgressBar", ...controller.active },
              { mode: "guided" }
            ),
            label2: {
              type: "elementBody",
              text: "Second instance — validates that repeated placement is coherent",
              level: 5,
              opacity: 0.55,
            },
            bar3: buildResolvedTypographyWorkbenchBlock(
              controller.runtimeDraft,
              { type: "elementScrollProgressBar", ...controller.active },
              { mode: "guided" }
            ),
            label3: {
              type: "elementBody",
              text: "Third instance — tests density and spacing between repeated bars",
              level: 5,
              opacity: 0.55,
            },
          },
        },
      } as ElementBlock,
      mobile: guidedPreviewBlock,
      light: guidedPreviewBlock,
    }),
    [controller.active, controller.runtimeDraft, guidedPreviewBlock]
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
      scenarioBlocks={scenarioBlocks}
      defaultFidelityMode="guided"
      onPreviewExitComplete={controller.onPreviewExitComplete}
      animationSource={controller.active.animation}
    />
  );
}
