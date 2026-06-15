import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import type { ElementBlock } from "@pb/contracts";
import { VARIANT_LABELS } from "./constants";
import type { RichTextElementDevController } from "./useRichTextElementDevController";

const EDGE_CONTENT = `<h2>Long-form rich text</h2><p>This scenario validates how the rich text element handles extended content. Multiple paragraphs, headings, and inline elements are used to stress-test rhythm, spacing, and typographic hierarchy across the variant.</p><h3>Section sub-heading</h3><p>A second paragraph follows to confirm line-height and inter-paragraph spacing. The goal is readable, well-spaced body text that holds up over multiple blocks of content.</p><ul><li>List item one with normal length</li><li>List item two with a somewhat longer description to test wrap behavior</li><li>List item three</li></ul>`;
const EDGE_HTML_CONTENT = EDGE_CONTENT;
const EMPTY_CONTENT = "";
const STRESS_CONTENT = `<h2>Stress test — full article structure</h2><p>Opening paragraph establishes context and registers the first body-copy block at the element scale. Multiple sentences here to validate line length and break behavior at the widest readable measure.</p><h3>Section break with h3</h3><p>Second paragraph with <strong>bold text</strong>, <em>italic emphasis</em>, and an <a href="#">inline link</a> to test inline element spacing and color rendering within a prose block.</p><blockquote>Block-level quotation — tests left-border treatment, font-style, and left margin behavior for a pulled quote context.</blockquote><h3>Ordered and unordered lists</h3><ul><li>Unordered item one — confirms bullet glyph, padding, and list rhythm</li><li>Unordered item two with a much longer label to validate list item text wrapping at comfortable measure</li><li>Item three</li></ul><ol><li>Numbered item one</li><li>Numbered item two — confirms counter render and alignment</li></ol><p>Closing paragraph confirms inter-block spacing after a list element. Validates that paragraph margins are correctly reset following list context.</p>`;

export function RichTextPreviewPanel({ controller }: { controller: RichTextElementDevController }) {
  const { runtimePreview } = controller;

  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementRichText", ...controller.active },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const guidedPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementRichText", ...controller.active },
        { mode: "guided" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  const scenarioBlocks = useMemo(
    (): Partial<Record<"edge" | "empty" | "stress" | "mobile" | "light", ElementBlock>> => ({
      edge: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          type: "elementRichText",
          ...controller.active,
          content: EDGE_CONTENT,
          html: EDGE_HTML_CONTENT,
        },
        { mode: "guided" }
      ),
      empty: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          type: "elementRichText",
          ...controller.active,
          content: EMPTY_CONTENT,
          html: EMPTY_CONTENT,
        },
        { mode: "guided" }
      ),
      stress: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          type: "elementRichText",
          ...controller.active,
          content: STRESS_CONTENT,
          html: STRESS_CONTENT,
        },
        { mode: "guided" }
      ),
      mobile: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementRichText", ...controller.active },
        { mode: "guided" }
      ),
      light: buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        { type: "elementRichText", ...controller.active },
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
