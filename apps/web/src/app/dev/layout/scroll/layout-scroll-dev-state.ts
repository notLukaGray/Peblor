import { buildLayoutCardElements } from "@/app/dev/layout/_shared/layout-preview-fixtures";
import type { ElementBlock, SectionBlock } from "@pb/contracts";

export type LayoutScrollDraft = {
  align: "left" | "center" | "right" | "full";
  width: string;
  minHeight: string;
  scrollDirection: "horizontal" | "vertical";
  itemCount: number;
  itemWidth: string;
  itemHeight: string;
};

function clampItemCount(value: number): number {
  if (!Number.isFinite(value)) return 6;
  return Math.max(1, Math.min(24, Math.round(value)));
}

function buildSampleElements(draft: LayoutScrollDraft): ElementBlock[] {
  const count = clampItemCount(draft.itemCount);
  const horizontal = draft.scrollDirection === "horizontal";
  const width = horizontal ? (normalizeString(draft.itemWidth) ?? "18rem") : "100%";
  const minHeight = normalizeString(draft.itemHeight) ?? "15rem";
  return buildLayoutCardElements("scroll", {
    count,
    minHeight,
    height: minHeight,
    width,
    labelPrefix: "Scroll",
  }).map((el, index) => {
    const id = `scroll-item-${index + 1}`;
    if (el.type !== "elementBody") return el;
    return {
      ...el,
      id,
      width,
      wrapperStyle: {
        ...(el.wrapperStyle && typeof el.wrapperStyle === "object" ? el.wrapperStyle : {}),
        flexShrink: 0,
        cursor: "grab",
      },
    };
  });
}

function normalizeString(value: string): string | undefined {
  const next = value.trim();
  return next.length === 0 ? undefined : next;
}

export function getDefaultLayoutScrollDraft(): LayoutScrollDraft {
  return {
    align: "center",
    width: "100%",
    minHeight: "28rem",
    scrollDirection: "horizontal",
    itemCount: 10,
    itemWidth: "18rem",
    itemHeight: "15rem",
  };
}

export function buildLayoutScrollSection(
  draft: LayoutScrollDraft
): Extract<SectionBlock, { type: "scrollContainer" }> {
  const minHeight = normalizeString(draft.minHeight);
  // Vertical overflow lives on the inner scroller (`height: 100%` + `overflow-y: auto`). That only
  // works when this section has a **definite** block size; `minHeight` alone lets the box grow with
  // content, so the page scrolls instead of the preview panel.
  const height = draft.scrollDirection === "vertical" ? minHeight : undefined;

  return {
    type: "scrollContainer",
    id: "layout-scroll-dev-sample",
    align: draft.align,
    width: normalizeString(draft.width),
    minHeight,
    height,
    scrollDirection: draft.scrollDirection,
    elements: buildSampleElements(draft),
  };
}
