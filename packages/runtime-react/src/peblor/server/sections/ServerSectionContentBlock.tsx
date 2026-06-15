import type { CSSProperties } from "react";
import type { ElementBlock, SectionBlock } from "@pb/contracts/types";
import { generateElementKey } from "@pb/core/keys";
import {
  coalesceEmptyString,
  normalizeFlexAlignItemsValue,
  normalizeFlexJustifyContentValue,
  peblorJustifyContentForGap,
  resolveFrameColumnGapCss,
  resolveFrameGapCss,
  resolveFrameRowGapCss,
} from "@pb/core/layout";
import { getPbContentGuidelines } from "@pb/core/host";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import {
  buildSectionContentWrapperStyle,
  sectionHeightCanStretchContent,
} from "../../section/SectionContentBlock/section-content-block-content-wrapper-style";
import { resolveSectionContentBlockElements } from "../../section/SectionContentBlock/section-content-block-element-resolution";
import { ServerElementRenderer } from "../ServerElementRenderer";
import { buildServerSectionBaseStyle } from "./server-section-style";
import { globals } from "@pb/runtime-react/core/lib/globals";

type Props = Extract<SectionBlock, { type: "contentBlock" }> & { serverIsMobile?: boolean };

export function ServerSectionContentBlock({
  id,
  ariaLabel,
  elements: elementsProp = [],
  elementOrder,
  definitions: sectionDefinitions,
  flow,
  align,
  distribute,
  wrap,
  gap,
  rowGap,
  columnGap,
  contentWidth,
  contentHeight,
  scroll,
  colorScheme,
  serverIsMobile,
  ...section
}: Props & {
  elementOrder?: string[] | { base?: string[]; md?: string[] };
  definitions?: never;
}) {
  const isMobile = serverIsMobile ?? false;
  const elements = resolveSectionContentBlockElements({
    elementsProp,
    elementOrder: Array.isArray(elementOrder)
      ? elementOrder
      : (resolveResponsiveValue(elementOrder, isMobile) ?? []),
    sectionDefinitions,
  });
  const {
    style: sectionStyle,
    resolvedFill,
    resolvedHeight,
  } = buildServerSectionBaseStyle({ ...section, scroll, colorScheme }, serverIsMobile);
  const resolvedShellOverflow = resolveResponsiveValue(scroll, isMobile) ?? "hidden";
  const shellOverflowClass =
    resolvedShellOverflow === "visible"
      ? "overflow-visible"
      : resolvedShellOverflow === "auto"
        ? "overflow-auto"
        : resolvedShellOverflow === "scroll"
          ? "overflow-scroll"
          : "overflow-hidden";
  const resolvedAriaLabel =
    resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? globals.stringsAriaLabelContentBlock;
  const pbContentGuidelines = getPbContentGuidelines();
  const resolvedContentWidth = resolveResponsiveValue(contentWidth, isMobile);
  const resolvedContentHeight = resolveResponsiveValue(contentHeight, isMobile);
  const resolvedFlexDirection =
    (coalesceEmptyString(resolveResponsiveValue(flow, isMobile)) as
      | CSSProperties["flexDirection"]
      | undefined) ?? pbContentGuidelines.frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(resolveResponsiveValue(align, isMobile)) ??
      pbContentGuidelines.frameAlignItemsDefault
  );
  const resolvedFlexWrap =
    (coalesceEmptyString(resolveResponsiveValue(wrap, isMobile)) as
      | CSSProperties["flexWrap"]
      | undefined) ?? pbContentGuidelines.frameFlexWrapDefault;
  const rawGap = coalesceEmptyString(resolveResponsiveValue(gap, isMobile));
  const rawRowGap = coalesceEmptyString(resolveResponsiveValue(rowGap, isMobile));
  const rawColumnGap = coalesceEmptyString(resolveResponsiveValue(columnGap, isMobile));
  const resolvedJustifyContent = peblorJustifyContentForGap(
    normalizeFlexJustifyContentValue(
      coalesceEmptyString(resolveResponsiveValue(distribute, isMobile)) ??
        pbContentGuidelines.frameJustifyContentDefault
    ) as CSSProperties["justifyContent"] | undefined,
    rawGap
  );
  const contentWrapperStyle: CSSProperties = {
    ...buildSectionContentWrapperStyle({
      resolvedContentWidth,
      resolvedContentHeight,
      sectionHasExplicitHeight: sectionHeightCanStretchContent(resolvedHeight),
      elementCount: elements.length,
      contentBackground: section.layers?.length && resolvedFill ? resolvedFill : undefined,
    }),
    display: "flex",
    flexDirection: resolvedFlexDirection,
    alignItems: resolvedAlignItems,
    flexWrap: resolvedFlexWrap,
    ...(resolvedJustifyContent ? { justifyContent: resolvedJustifyContent } : {}),
    ...(resolveFrameGapCss(rawGap) != null ? { gap: resolveFrameGapCss(rawGap) } : {}),
    ...(resolveFrameRowGapCss(rawRowGap) != null
      ? { rowGap: resolveFrameRowGapCss(rawRowGap) }
      : {}),
    ...(resolveFrameColumnGapCss(rawColumnGap) != null
      ? { columnGap: resolveFrameColumnGapCss(rawColumnGap) }
      : {}),
  };

  return (
    <section
      id={id}
      className={`relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0 ${shellOverflowClass}`}
      style={sectionStyle}
      aria-label={resolvedAriaLabel}
      data-section-type="contentBlock"
      data-color-scheme={colorScheme ?? undefined}
      data-elements-count={elements.length}
    >
      <div className="relative z-[var(--pb-z-raised)] min-h-0" style={contentWrapperStyle}>
        {elements.map((element: ElementBlock, index) => (
          <ServerElementRenderer
            key={generateElementKey(element, index)}
            block={element}
            serverIsMobile={serverIsMobile}
          />
        ))}
      </div>
    </section>
  );
}
