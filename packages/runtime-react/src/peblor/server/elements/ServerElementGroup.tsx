import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { generateElementKey } from "@pb/core/keys";
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
  sectionEffectsToStyle,
  stripResponsiveLayoutKeys,
  SR_ONLY_STYLE,
} from "@pb/core/layout";
import {
  scaleRadiusForDensity,
  scaleSpaceShorthandForDensity,
} from "@pb/contracts/peblor/core/page-density";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { lowerThemeStyleObject } from "../../theme/theme-string";
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
  flow,
  align,
  distribute,
  gap,
  rowGap,
  columnGap,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  wrap,
  flex,
  scroll,
  hidden,
  visuallyHidden,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  margin,
  selfAlign,
  figmaConstraints,
  borderRadius,
  wrapperStyle,
  effects,
  layoutChildren,
  flexShrink,
  flexGrow,
  flexBasis,
  order: flexOrder,
  alignSelf,
  serverIsMobile = false,
  stateStyleClass,
  responsiveStyleClass,
  responsiveNeedsContainer,
  responsiveLayoutKeys,
}: Props & {
  layoutChildren?: boolean;
  serverIsMobile?: boolean;
  stateStyleClass?: string;
  responsiveStyleClass?: string;
  responsiveNeedsContainer?: boolean;
  responsiveLayoutKeys?: string[];
  minWidth?: unknown;
  minHeight?: unknown;
  maxWidth?: unknown;
  maxHeight?: unknown;
}) {
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
    stripResponsiveLayoutKeys(
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
        selfAlign,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        margin,
        figmaConstraints,
      },
      responsiveStyleClass ? responsiveLayoutKeys : undefined
    ),
    isMobile
  );
  const resolvedFlexDirection =
    (coalesceEmptyString(resolveResponsiveValue(flow, isMobile)) as
      | CSSProperties["flexDirection"]
      | undefined) ?? pbContentGuidelines.frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(resolveResponsiveValue(align, isMobile)) ??
      pbContentGuidelines.frameAlignItemsDefault
  );
  const resolvedGapValue = resolveResponsiveValue(gap, isMobile);
  const resolvedPaddingTop = resolveResponsiveValue(paddingTop, isMobile);
  const resolvedPaddingRight = resolveResponsiveValue(paddingRight, isMobile);
  const resolvedPaddingBottom = resolveResponsiveValue(paddingBottom, isMobile);
  const resolvedPaddingLeft = resolveResponsiveValue(paddingLeft, isMobile);
  const resolvedJustifyContent = peblorJustifyContentForGap(
    normalizeFlexJustifyContentValue(
      coalesceEmptyString(resolveResponsiveValue(distribute, isMobile)) ??
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
  const resolvedHidden = resolveResponsiveValue(hidden, isMobile);
  const groupStyle: CSSProperties = {
    ...layoutStyle,
    borderRadius:
      layoutStyle.borderRadius != null && String(layoutStyle.borderRadius).trim() !== ""
        ? layoutStyle.borderRadius
        : scaleRadiusForDensity(pbContentGuidelines.frameBorderRadiusDefault),
    display:
      resolvedHidden === true
        ? ("none" as const)
        : ((resolveResponsiveValue(display, isMobile) ?? "flex") as CSSProperties["display"]),
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
    ...(resolvedPaddingTop != null ? { paddingTop: resolvedPaddingTop } : {}),
    ...(resolvedPaddingRight != null ? { paddingRight: resolvedPaddingRight } : {}),
    ...(resolvedPaddingBottom != null ? { paddingBottom: resolvedPaddingBottom } : {}),
    ...(resolvedPaddingLeft != null ? { paddingLeft: resolvedPaddingLeft } : {}),
    ...(!hasExplicitPadding
      ? { padding: scaleSpaceShorthandForDensity(pbContentGuidelines.framePaddingDefault) }
      : {}),
    flexWrap:
      (coalesceEmptyString(wrap) as CSSProperties["flexWrap"] | undefined) ??
      pbContentGuidelines.frameFlexWrapDefault,
    ...(resolveResponsiveValue(flex, isMobile)
      ? { flex: resolveResponsiveValue(flex, isMobile) }
      : {}),
    ...(flexShrink != null ? { flexShrink } : {}),
    ...(flexGrow != null ? { flexGrow } : {}),
    ...(flexBasis != null ? { flexBasis: resolveResponsiveValue(flexBasis, isMobile) } : {}),
    ...(flexOrder != null ? { order: flexOrder } : {}),
    ...(alignSelf != null
      ? { alignSelf: resolveResponsiveValue(alignSelf, isMobile) as CSSProperties["alignSelf"] }
      : {}),
    overflow: (scroll ?? (layoutChildren ? "visible" : "hidden")) as CSSProperties["overflow"],
    ...sectionEffectsToStyle(effects as Parameters<typeof sectionEffectsToStyle>[0]),
    ...(lowerThemeStyleObject(wrapperStyle as Record<string, unknown> | undefined) as
      | CSSProperties
      | undefined),
  };

  const finalGroupStyle: CSSProperties = {
    ...(visuallyHidden ? { ...groupStyle, ...SR_ONLY_STYLE } : groupStyle),
    ...(responsiveNeedsContainer ? { containerType: "inline-size" as const } : {}),
  };
  return (
    <div
      style={finalGroupStyle}
      className={
        [finalGroupStyle.flex ? undefined : "shrink-0", stateStyleClass, responsiveStyleClass]
          .filter(Boolean)
          .join(" ") || undefined
      }
    >
      {blocks.map((block, index) => (
        <div
          key={generateElementKey(block, index)}
          style={overlapGap && index > 0 ? { marginLeft: overlapGap } : undefined}
        >
          <ServerElementRenderer block={block} serverIsMobile={serverIsMobile} />
        </div>
      ))}
    </div>
  );
}
