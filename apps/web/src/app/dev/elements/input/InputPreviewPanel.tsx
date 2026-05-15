import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import type { ElementBlock } from "@pb/contracts";
import { VARIANT_LABELS } from "./constants";
import type { InputElementDevController } from "./useInputElementDevController";

export function InputPreviewPanel({ controller }: { controller: InputElementDevController }) {
  const { runtimePreview } = controller;

  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementInput", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const guidedPreviewBlock = useMemo(
    (): ElementBlock => ({
      type: "elementGroup",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      section: {
        elementOrder: ["input-label", "input-control", "input-hint"],
        definitions: {
          "input-label": {
            type: "elementBody",
            text: "Email address",
            level: 6,
            opacity: 0.75,
          },
          "input-control": buildResolvedTypographyWorkbenchBlock(
            controller.runtimeDraft,
            { type: "elementInput", ...controller.active },
            { mode: "guided" }
          ),
          "input-hint": {
            type: "elementBody",
            text: "Used for login and account notifications.",
            level: 6,
            opacity: 0.55,
          },
        },
      },
    }),
    [controller.active, controller.runtimeDraft]
  );

  const scenarioBlocks = useMemo(
    (): Partial<Record<"edge" | "empty" | "stress" | "mobile" | "light", ElementBlock>> => ({
      edge: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          type: "elementInput",
          ...controller.active,
          placeholder:
            "A very long placeholder text to test overflow and truncation behavior in the input field",
        },
        { mode: "guided" }
      ),
      empty: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementInput", ...controller.active, placeholder: undefined },
        { mode: "guided" }
      ),
      // Stress: simulate a form with multiple labelled input fields
      stress: {
        type: "elementGroup",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        section: {
          elementOrder: ["field1", "field2", "field3"],
          definitions: {
            field1: {
              type: "elementGroup",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              section: {
                elementOrder: ["lbl1", "inp1"],
                definitions: {
                  lbl1: { type: "elementBody", text: "Full name", level: 6, opacity: 0.75 },
                  inp1: buildResolvedTypographyWorkbenchBlock(
                    controller.runtimeDraft,
                    { type: "elementInput", ...controller.active, placeholder: "Jane Smith" },
                    { mode: "guided" }
                  ),
                },
              },
            } as ElementBlock,
            field2: {
              type: "elementGroup",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              section: {
                elementOrder: ["lbl2", "inp2"],
                definitions: {
                  lbl2: { type: "elementBody", text: "Email address", level: 6, opacity: 0.75 },
                  inp2: buildResolvedTypographyWorkbenchBlock(
                    controller.runtimeDraft,
                    { type: "elementInput", ...controller.active, placeholder: "jane@example.com" },
                    { mode: "guided" }
                  ),
                },
              },
            } as ElementBlock,
            field3: {
              type: "elementGroup",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              section: {
                elementOrder: ["lbl3", "inp3", "hint3"],
                definitions: {
                  lbl3: { type: "elementBody", text: "Message", level: 6, opacity: 0.75 },
                  inp3: buildResolvedTypographyWorkbenchBlock(
                    controller.runtimeDraft,
                    {
                      type: "elementInput",
                      ...controller.active,
                      placeholder: "Your message here",
                    },
                    { mode: "guided" }
                  ),
                  hint3: {
                    type: "elementBody",
                    text: "Maximum 500 characters.",
                    level: 6,
                    opacity: 0.45,
                  },
                },
              },
            } as ElementBlock,
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
      onPreviewExitComplete={controller.onPreviewExitComplete}
      animationSource={controller.active.animation}
    />
  );
}
