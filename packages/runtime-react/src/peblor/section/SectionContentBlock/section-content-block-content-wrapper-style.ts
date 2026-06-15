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

  // The `undefined` check is intentional, not `!style.minHeight`:
  // - `style.minHeight === undefined` means no explicit minHeight was set — default to min-content.
  // - `style.minHeight = 0` is a legitimate flex shrink value (when contentHeight is "full")
  //   that allows the content area to shrink below its natural height. Using `!style.minHeight`
  //   would falsely treat `minHeight: 0` as "not set" and overwrite it with `min-content`,
  //   which prevents nested scroll containers (e.g., InfiniteScroll) from scrolling because
  //   the content overflows its parent rather than triggering overflow.
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
