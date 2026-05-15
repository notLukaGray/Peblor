import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import type { ElementBlock } from "@pb/contracts";
import { VARIANT_LABELS } from "./constants";
import type { ButtonElementDevController } from "./useButtonElementDevController";

const EDGE_LABEL = "Button with a very long label that may wrap depending on wordWrap setting";
const EMPTY_LABEL = undefined;
const STRESS_BUTTON_LABELS = [
  "Primary Action",
  "Secondary",
  "Cancel",
  "Learn More About This Feature →",
] as const;

export function ButtonPreviewPanel({ controller }: { controller: ButtonElementDevController }) {
  const { runtimePreview } = controller;

  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementButton", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const guidedPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementButton", ...controller.active },
        { mode: "guided" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const scenarioBlocks = useMemo(
    (): Partial<Record<"edge" | "empty" | "stress" | "mobile" | "light", ElementBlock>> => ({
      edge: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementButton", ...controller.active, label: EDGE_LABEL },
        { mode: "guided" }
      ),
      empty: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementButton", ...controller.active, label: EMPTY_LABEL },
        { mode: "guided" }
      ),
      stress: {
        type: "elementGroup",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: "0.75rem",
        section: {
          elementOrder: STRESS_BUTTON_LABELS.map((_, i) => `btn${i}`),
          definitions: Object.fromEntries(
            STRESS_BUTTON_LABELS.map((label, i) => [
              `btn${i}`,
              buildResolvedTypographyWorkbenchBlock(
                controller.runtimeDraft,
                { type: "elementButton", ...controller.active, label },
                { mode: "guided" }
              ),
            ])
          ),
        },
      } as ElementBlock,
      mobile: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementButton", ...controller.active },
        { mode: "guided" }
      ),
      light: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementButton", ...controller.active },
        { mode: "guided" }
      ),
    }),
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
      scenarioBlocks={scenarioBlocks}
      onPreviewExitComplete={controller.onPreviewExitComplete}
      animationSource={controller.active.animation}
    />
  );
}
