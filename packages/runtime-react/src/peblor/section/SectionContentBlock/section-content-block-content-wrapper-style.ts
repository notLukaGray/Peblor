export function buildSectionContentWrapperStyle(args: {
  resolvedContentWidth?: string;
  resolvedContentHeight?: string;
  sectionHasExplicitHeight?: boolean;
  elementCount: number;
  /** When section has layers + fill, use fill as the content area background (card) so track shows around it. */
  contentBackground?: string;
}) {
  const {
    resolvedContentWidth,
    resolvedContentHeight,
    sectionHasExplicitHeight,
    elementCount,
    contentBackground,
  } = args;
  const style: React.CSSProperties = {};

  if (contentBackground) {
    style.background = contentBackground;
    style.borderRadius = "inherit";
    style.margin = "0.75rem";
  }

  if (resolvedContentWidth === "hug") {
    style.width = "fit-content";
    style.marginLeft = "auto";
    style.marginRight = "auto";
  } else if (resolvedContentWidth && resolvedContentWidth !== "full") {
    style.width = resolvedContentWidth;
    style.marginLeft = "auto";
    style.marginRight = "auto";
  } else if (resolvedContentWidth === "full") {
    style.width = "100%";
  }

  if (resolvedContentHeight === "hug") {
    style.height = "fit-content";
  } else if (resolvedContentHeight && resolvedContentHeight !== "full") {
    style.height = resolvedContentHeight;
  } else if (resolvedContentHeight === "full") {
    style.flex = "1 1 0";
    style.minHeight = 0;
  } else if (!resolvedContentHeight && sectionHasExplicitHeight) {
    style.flex = "1 1 0";
    style.minHeight = 0;
  }

  // Use explicit `undefined` check — `minHeight: 0` is valid (flex shrink) but falsy, so
  // `!style.minHeight` would wrongly replace it with `min-content` and break nested scroll
  // (e.g. work index `contentHeight: "full"` + `elementInfiniteScroll` height 100%).
  if (elementCount > 0 && style.minHeight === undefined) {
    style.minHeight = "min-content";
  }

  return style;
}

export function sectionHeightCanStretchContent(height: string | undefined): boolean {
  if (!height) return false;
  const normalized = height.trim().toLowerCase();
  return !["auto", "fit-content", "hug", "max-content", "min-content"].includes(normalized);
}
