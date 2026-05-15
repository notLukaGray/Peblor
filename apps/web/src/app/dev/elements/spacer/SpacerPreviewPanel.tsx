import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import type { ElementBlock } from "@pb/contracts";
import { VARIANT_LABELS } from "./constants";
import type { SpacerElementDevController } from "./useSpacerElementDevController";

export function SpacerPreviewPanel({ controller }: { controller: SpacerElementDevController }) {
  const { runtimePreview } = controller;

  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementSpacer", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  // Guided: show spacer between two body elements so its rhythm effect is visible
  const guidedPreviewBlock = useMemo(
    (): ElementBlock => ({
      type: "elementGroup",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      section: {
        elementOrder: ["before-text", "spacer-guide", "after-text"],
        definitions: {
          "before-text": { type: "elementBody", text: "Content above the spacer." },
          "spacer-guide": buildResolvedTypographyWorkbenchBlock(
            controller.runtimeDraft,
            { type: "elementSpacer", ...controller.active },
            { mode: "guided" }
          ),
          "after-text": { type: "elementBody", text: "Content below the spacer." },
        },
      },
    }),
    [controller.active, controller.runtimeDraft]
  );

  // Stress: show multiple spacers of different sizes between content blocks
  const scenarioBlocks = useMemo(
    (): Partial<Record<"stress" | "mobile" | "light", ElementBlock>> => ({
      stress: {
        type: "elementGroup",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        section: {
          elementOrder: ["label1", "sp-sm", "label2", "sp-md", "label3", "sp-lg", "label4"],
          definitions: {
            label1: { type: "elementBody", text: "Content block A", level: 4, opacity: 0.6 },
            "sp-sm": buildResolvedTypographyWorkbenchBlock(
              controller.runtimeDraft,
              { type: "elementSpacer", ...controller.active, size: "sm" },
              { mode: "guided" }
            ),
            label2: {
              type: "elementBody",
              text: "Content block B (after sm spacer)",
              level: 4,
              opacity: 0.6,
            },
            "sp-md": buildResolvedTypographyWorkbenchBlock(
              controller.runtimeDraft,
              { type: "elementSpacer", ...controller.active, size: "md" },
              { mode: "guided" }
            ),
            label3: {
              type: "elementBody",
              text: "Content block C (after md spacer)",
              level: 4,
              opacity: 0.6,
            },
            "sp-lg": buildResolvedTypographyWorkbenchBlock(
              controller.runtimeDraft,
              { type: "elementSpacer", ...controller.active, size: "lg" },
              { mode: "guided" }
            ),
            label4: {
              type: "elementBody",
              text: "Content block D (after lg spacer)",
              level: 4,
              opacity: 0.6,
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
