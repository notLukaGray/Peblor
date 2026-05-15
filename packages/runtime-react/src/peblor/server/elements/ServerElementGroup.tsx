import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { getPbContentGuidelines } from "@pb/core/host";
import {
  coalesceEmptyString,
  getElementLayoutStyle,
  normalizeFlexAlignItemsValue,
  normalizeFlexJustifyContentValue,
  peblorJustifyContentForGap,
  peblorOverlapGapToCss,
  resolveFrameColumnGapCss,
  resolveFrameGapCss,
  resolveFrameRowGapCss,
} from "@pb/core/layout";
import {
  scaleRadiusForDensity,
  scaleSpaceShorthandForDensity,
} from "@pb/contracts/peblor/core/page-density";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { resolveThemeStyleObject } from "../../theme/theme-string";
import { ServerElementRenderer } from "../ServerElementRenderer";

type Props = Extract<ElementBlock, { type: "elementGroup" }>;

export function ServerElementGroup({
  section,
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  display = "flex",
  flexDirection,
  alignItems,
  justifyContent,
  gap,
  rowGap,
  columnGap,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  flexWrap,
  flex,
  overflow,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  align,
  figmaConstraints,
  borderRadius,
  wrapperStyle,
  layoutChildren,
  serverIsMobile = false,
}: Props & { layoutChildren?: boolean; overflow?: string; serverIsMobile?: boolean }) {
  const isMobile = serverIsMobile;
  const pbContentGuidelines = getPbContentGuidelines();
  const definitions = (section?.definitions ?? {}) as Record<string, unknown>;
  const order = reconcileElementOrderWithDefinitions(section?.elementOrder, definitions);
  const blocks = order
    .map((key): ElementBlock | null => {
      const child = definitions[key];
      return child && typeof child === "object" && "type" in child ? (child as ElementBlock) : null;
    })
    .filter((child): child is ElementBlock => child != null);
  const layoutStyle = getElementLayoutStyle(
    {
      width,
      height,
      borderRadius,
      constraints: {
        ...(minWidth != null ? { minWidth: String(minWidth) } : {}),
        ...(minHeight != null ? { minHeight: String(minHeight) } : {}),
        ...(maxWidth != null ? { maxWidth: String(maxWidth) } : {}),
        ...(maxHeight != null ? { maxHeight: String(maxHeight) } : {}),
      },
      align,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      figmaConstraints,
    },
    isMobile
  );
  const resolvedFlexDirection =
    (coalesceEmptyString(resolveResponsiveValue(flexDirection, isMobile)) as
      | CSSProperties["flexDirection"]
      | undefined) ?? pbContentGuidelines.frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(resolveResponsiveValue(alignItems, isMobile)) ??
      pbContentGuidelines.frameAlignItemsDefault
  );
  const resolvedGapValue = resolveResponsiveValue(gap, isMobile);
  const resolvedJustifyContent = peblorJustifyContentForGap(
    normalizeFlexJustifyContentValue(
      coalesceEmptyString(resolveResponsiveValue(justifyContent, isMobile)) ??
        pbContentGuidelines.frameJustifyContentDefault
    ) as CSSProperties["justifyContent"] | undefined,
    resolvedGapValue
  );
  const hasExplicitPadding =
    padding != null ||
    paddingTop != null ||
    paddingRight != null ||
    paddingBottom != null ||
    paddingLeft != null;
  const overlapGap = peblorOverlapGapToCss(resolvedGapValue);
  const groupStyle: CSSProperties = {
    ...layoutStyle,
    borderRadius:
      layoutStyle.borderRadius != null && String(layoutStyle.borderRadius).trim() !== ""
        ? layoutStyle.borderRadius
        : scaleRadiusForDensity(pbContentGuidelines.frameBorderRadiusDefault),
    display: display as CSSProperties["display"],
    flexDirection: resolvedFlexDirection,
    alignItems: resolvedAlignItems,
    ...(resolvedJustifyContent ? { justifyContent: resolvedJustifyContent } : {}),
    ...(resolveFrameGapCss(resolvedGapValue) != null
      ? { gap: resolveFrameGapCss(resolvedGapValue) }
      : {}),
    ...(resolveFrameRowGapCss(rowGap == null ? rowGap : String(rowGap)) != null
      ? { rowGap: resolveFrameRowGapCss(rowGap == null ? rowGap : String(rowGap)) }
      : {}),
    ...(resolveFrameColumnGapCss(columnGap == null ? columnGap : String(columnGap)) != null
      ? { columnGap: resolveFrameColumnGapCss(columnGap == null ? columnGap : String(columnGap)) }
      : {}),
    ...(resolveResponsiveValue(padding, isMobile) != null
      ? { padding: resolveResponsiveValue(padding, isMobile) }
      : {}),
    ...(paddingTop != null ? { paddingTop } : {}),
    ...(paddingRight != null ? { paddingRight } : {}),
    ...(paddingBottom != null ? { paddingBottom } : {}),
    ...(paddingLeft != null ? { paddingLeft } : {}),
    ...(!hasExplicitPadding
      ? { padding: scaleSpaceShorthandForDensity(pbContentGuidelines.framePaddingDefault) }
      : {}),
    flexWrap:
      (coalesceEmptyString(flexWrap) as CSSProperties["flexWrap"] | undefined) ??
      pbContentGuidelines.frameFlexWrapDefault,
    ...(resolveResponsiveValue(flex, isMobile)
      ? { flex: resolveResponsiveValue(flex, isMobile) }
      : {}),
    overflow: (overflow ?? (layoutChildren ? "visible" : "hidden")) as CSSProperties["overflow"],
    ...(resolveThemeStyleObject(wrapperStyle as Record<string, unknown> | undefined, "light") as
      | CSSProperties
      | undefined),
  };

  return (
    <div style={groupStyle} className={groupStyle.flex ? undefined : "shrink-0"}>
      {blocks.map((block, index) => (
        <div
          key={(block as ElementBlock & { id?: string }).id ?? index}
          style={overlapGap && index > 0 ? { marginLeft: overlapGap } : undefined}
        >
          <ServerElementRenderer block={block} serverIsMobile={serverIsMobile} />
        </div>
      ))}
    </div>
  );
}
