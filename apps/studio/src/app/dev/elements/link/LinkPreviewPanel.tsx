import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import type { ElementBlock } from "@pb/contracts";
import { VARIANT_LABELS } from "./constants";
import type { LinkElementDevController } from "./useLinkElementDevController";

const EDGE_TEXT =
  "A link with a very long label that forces line-wrap across multiple lines of inline text";
const EMPTY_TEXT = "";
const STRESS_LINKS = [
  "View documentation",
  "Read the full specification",
  "See case study",
  "Download PDF",
  "Contact the team",
] as const;

export function LinkPreviewPanel({ controller }: { controller: LinkElementDevController }) {
  const { runtimePreview } = controller;

  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementLink", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const guidedPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementLink", ...controller.active },
        { mode: "guided" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const scenarioBlocks = useMemo(
    (): Partial<Record<"edge" | "empty" | "stress" | "mobile" | "light", ElementBlock>> => ({
      edge: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementLink", ...controller.active, text: EDGE_TEXT },
        { mode: "guided" }
      ),
      empty: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementLink", ...controller.active, text: EMPTY_TEXT },
        { mode: "guided" }
      ),
      stress: {
        type: "elementGroup",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        section: {
          elementOrder: STRESS_LINKS.map((_, i) => `link${i}`),
          definitions: Object.fromEntries(
            STRESS_LINKS.map((text, i) => [
              `link${i}`,
              buildResolvedTypographyWorkbenchBlock(
                controller.runtimeDraft,
                { type: "elementLink", ...controller.active, text },
                { mode: "guided" }
              ),
            ])
          ),
        },
      } as ElementBlock,
      mobile: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementLink", ...controller.active },
        { mode: "guided" }
      ),
      light: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementLink", ...controller.active },
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
