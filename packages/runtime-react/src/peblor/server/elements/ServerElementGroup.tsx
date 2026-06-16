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
} from "@pb/core/layout";
import {
  scaleRadiusForDensity,
  scaleSpaceShorthandForDensity,
} from "@pb/contracts/peblor/core/page-density";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { lowerThemeStyleObject, lowerThemeValueDeep } from "../../theme/theme-string";
import { coerceSectionEffects } from "../../elements/ElementModule/element-module-style-utils";
import type { SectionEffect } from "@pb/contracts/peblor/core/peblor-schemas";
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
  display,
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
  overflow,
  scroll,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  selfAlign,
  fixed,
  figmaConstraints,
  borderRadius,
  wrapperStyle,
  effects,
  layoutChildren,
  layer,
  hidden,
  visuallyHidden,
  flexShrink,
  flexGrow,
  flexBasis,
  order: flexOrder,
  alignSelf,
  serverIsMobile = false,
  stateStyleClass,
  responsiveStyleClass,
  responsiveNeedsContainer,
}: Props & {
  layoutChildren?: boolean;
  serverIsMobile?: boolean;
  stateStyleClass?: string;
  responsiveStyleClass?: string;
  responsiveNeedsContainer?: boolean;
  overflow?: string;
  scroll?: string;
  fixed?: unknown;
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

  // ── layoutStyle (aligned with ElementModuleGroup) ──────────────────────
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
      selfAlign,
      fixed,
      layer,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      figmaConstraints,
      hidden,
      visuallyHidden,
      flexShrink,
      flexGrow,
      flexBasis,
      order: flexOrder,
      alignSelf,
    },
    isMobile
  );

  // ── Resolved values (aligned with ElementModuleGroup) ──────────────────
  const resolvedFlexDirectionValue = resolveResponsiveValue(flow, isMobile);
  const resolvedAlignItemsValue = resolveResponsiveValue(align, isMobile);
  const resolvedJustifyContentValue = resolveResponsiveValue(distribute, isMobile);
  const resolvedGapValue = resolveResponsiveValue(gap, isMobile);
  const resolvedPaddingValue = resolveResponsiveValue(padding, isMobile);
  const resolvedPaddingTop = resolveResponsiveValue(paddingTop, isMobile);
  const resolvedPaddingRight = resolveResponsiveValue(paddingRight, isMobile);
  const resolvedPaddingBottom = resolveResponsiveValue(paddingBottom, isMobile);
  const resolvedPaddingLeft = resolveResponsiveValue(paddingLeft, isMobile);
  const resolvedFlexValue = resolveResponsiveValue(flex, isMobile);

  const resolvedFlexDirection =
    (coalesceEmptyString(resolvedFlexDirectionValue) as
      | CSSProperties["flexDirection"]
      | undefined) ?? pbContentGuidelines.frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(resolvedAlignItemsValue) ?? pbContentGuidelines.frameAlignItemsDefault
  );
  const resolvedFlexWrap =
    (coalesceEmptyString(wrap) as CSSProperties["flexWrap"] | undefined) ??
    pbContentGuidelines.frameFlexWrapDefault;

  const layoutRadius = layoutStyle.borderRadius;
  const effectiveBorderRadius =
    layoutRadius != null && String(layoutRadius).trim() !== ""
      ? layoutRadius
      : scaleRadiusForDensity(pbContentGuidelines.frameBorderRadiusDefault);

  const resolvedFlexGap = resolveFrameGapCss(resolvedGapValue);
  const resolvedRowGap = resolveFrameRowGapCss(
    rowGap === undefined || rowGap === null ? rowGap : String(rowGap)
  );
  const resolvedColGap = resolveFrameColumnGapCss(
    columnGap === undefined || columnGap === null ? columnGap : String(columnGap)
  );
  const overlapGap = peblorOverlapGapToCss(resolvedGapValue);
  const resolvedJustifyContent = peblorJustifyContentForGap(
    normalizeFlexJustifyContentValue(
      coalesceEmptyString(resolvedJustifyContentValue) ??
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
  const framePaddingFallback = !hasExplicitPadding
    ? { padding: scaleSpaceShorthandForDensity(pbContentGuidelines.framePaddingDefault) }
    : {};

  // ── wrapperStyle with bgBlur (aligned with ElementModuleGroup) ────────
  const rawGroupWrapperStyle = lowerThemeStyleObject(
    wrapperStyle as Record<string, unknown> | undefined
  ) as CSSProperties | undefined;
  const resolvedGroupWrapperStyle: CSSProperties | undefined =
    rawGroupWrapperStyle && "bgBlur" in rawGroupWrapperStyle
      ? (() => {
          const { bgBlur, ...rest } = rawGroupWrapperStyle;
          return { ...rest, backdropFilter: bgBlur, WebkitBackdropFilter: bgBlur } as CSSProperties;
        })()
      : rawGroupWrapperStyle;

  // ── Effects with glass filtering (aligned with useElementEffects) ─────
  const resolvedEffects = lowerThemeValueDeep(effects) as typeof effects;
  const coercedEffects = coerceSectionEffects(resolvedEffects);
  const hasGlassEffect =
    coercedEffects?.some((effect: SectionEffect) => effect.type === "glass") ?? false;
  const effectCssStyle = sectionEffectsToStyle(
    (coercedEffects ?? []).filter((effect) => effect.type !== "glass")
  );

  // ── groupStyleBase (aligned with ElementModuleGroup) ──────────────────
  const groupStyleBase: CSSProperties = {
    ...layoutStyle,
    borderRadius: effectiveBorderRadius,
    display:
      layoutStyle.display ??
      (resolveResponsiveValue(display, isMobile) as CSSProperties["display"]) ??
      "flex",
    flexDirection: resolvedFlexDirection,
    alignItems: resolvedAlignItems,
    ...(resolvedJustifyContent ? { justifyContent: resolvedJustifyContent } : {}),
    ...(resolvedFlexGap != null ? { gap: resolvedFlexGap } : {}),
    ...(resolvedRowGap != null ? { rowGap: resolvedRowGap } : {}),
    ...(resolvedColGap != null ? { columnGap: resolvedColGap } : {}),
    ...(resolvedPaddingValue != null ? { padding: resolvedPaddingValue } : {}),
    ...(resolvedPaddingTop != null ? { paddingTop: resolvedPaddingTop } : {}),
    ...(resolvedPaddingRight != null ? { paddingRight: resolvedPaddingRight } : {}),
    ...(resolvedPaddingBottom != null ? { paddingBottom: resolvedPaddingBottom } : {}),
    ...(resolvedPaddingLeft != null ? { paddingLeft: resolvedPaddingLeft } : {}),
    ...framePaddingFallback,
    flexWrap: resolvedFlexWrap,
    ...(resolvedFlexValue ? { flex: resolvedFlexValue } : {}),
    overflow: (scroll ??
      overflow ??
      (layoutChildren ? "visible" : "hidden")) as CSSProperties["overflow"],
    ...(resolvedGroupWrapperStyle as CSSProperties),
  };

  // ── groupStyle (aligned with ElementModuleGroup) ──────────────────────
  const groupStyle: CSSProperties = {
    ...groupStyleBase,
    ...(hasGlassEffect && groupStyleBase.position == null ? { position: "relative" } : {}),
    ...(effectCssStyle != null && Object.keys(effectCssStyle).length > 0 ? effectCssStyle : {}),
    ...(responsiveNeedsContainer ? { containerType: "inline-size" as const } : {}),
  };

  // ── className (aligned with ElementModuleGroup) ───────────────────────
  const rootClassName = [
    resolvedFlexValue ? undefined : "shrink-0",
    groupStyle.scrollbarWidth === "none" ? "scroll-container-hide-scrollbar" : undefined,
    stateStyleClass,
    responsiveStyleClass,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div style={groupStyle} className={rootClassName || undefined}>
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
