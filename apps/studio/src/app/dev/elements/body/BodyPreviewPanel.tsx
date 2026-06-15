import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import type { ElementBlock } from "@pb/contracts";
import { VARIANT_LABELS } from "./constants";
import type { BodyElementDevController } from "./useBodyElementDevController";

const EDGE_TEXT =
  "This paragraph has been written to be much longer than a typical sentence. It tests multi-line wrapping, line-height, and paragraph rhythm under real reading conditions. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
const EMPTY_TEXT = "";
const STRESS_PARAGRAPHS = [
  {
    level: 1 as const,
    text: "Lead paragraph at level one — the introduction to a longer article that sets context and tone. Rendered at the largest body scale.",
  },
  {
    level: 2 as const,
    text: "Standard body copy at level two. This is the workhorse: comfortable for extended reading, testing line length, tracking, and leading under realistic prose conditions. Multiple lines are intentional.",
  },
  {
    level: 3 as const,
    text: "Secondary copy at level three. Used for supporting detail, captions, or secondary explanations beneath the primary content block.",
  },
  {
    level: 4 as const,
    text: "Fine print at level four. Labels, footnotes, metadata. Validates legibility at the smallest body scale.",
  },
] as const;

export function BodyPreviewPanel({ controller }: { controller: BodyElementDevController }) {
  const { runtimePreview } = controller;

  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementBody", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const guidedPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementBody", ...controller.active },
        { mode: "guided" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const scenarioBlocks = useMemo(
    (): Partial<Record<"edge" | "empty" | "stress" | "mobile" | "light", ElementBlock>> => ({
      edge: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementBody", ...controller.active, text: EDGE_TEXT },
        { mode: "guided" }
      ),
      empty: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementBody", ...controller.active, text: EMPTY_TEXT },
        { mode: "guided" }
      ),
      stress: {
        type: "elementGroup",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        section: {
          elementOrder: STRESS_PARAGRAPHS.map((_, i) => `p${i}`),
          definitions: Object.fromEntries(
            STRESS_PARAGRAPHS.map(({ level, text }, i) => [
              `p${i}`,
              buildResolvedTypographyWorkbenchBlock(
                controller.runtimeDraft,
                { type: "elementBody", ...controller.active, level, text },
                { mode: "guided" }
              ),
            ])
          ),
        },
      } as ElementBlock,
      mobile: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementBody", ...controller.active },
        { mode: "guided" }
      ),
      light: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementBody", ...controller.active },
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
