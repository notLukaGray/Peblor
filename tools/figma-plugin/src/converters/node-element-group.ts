/**
 * Converts frame/group nodes to elementGroup blocks and handles rich-text conversion.
 */

import type { ElementBlock, ElementImage } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import {
  extractLayoutProps,
  extractBorderProps,
  extractAutoLayoutProps,
  extractAbsolutePositionStyle,
  extractConstraintPosition,
  isAbsolutePositioned,
} from "./layout";
import { extractMultipleFills, extractImageFill, figmaScaleModeToObjectFit } from "./fills-image";
import { buildAssetKey } from "../utils/asset-key";
import { extractGradientFill } from "./fills";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { toPx } from "../utils/css";
import { parseNodeAnnotations } from "./annotations-parse";
import { parseTextStyle } from "@figma-plugin/helpers";
import { figmaRgbToHex } from "../utils/color";
import { getInspectableBackgroundAsync, getInspectableCssAsync } from "./node-css";
import { extractNodeVisualEffects } from "./node-visual-effects";
import {
  inferNodeId,
  ensureElementId,
  applyElementAnnotationProps,
  type GroupNodeParentCtx,
} from "./node-element-helpers";
import { warnRepeatedStructuralSignatures } from "./structure-hints";
import { figmaTextAlignToCSS } from "./typography";

function extractGradientStrokeForGroup(
  node: FrameNode | GroupNode | ComponentNode | InstanceNode
): { stroke: string; width: string } | undefined {
  const strokes =
    "strokes" in node ? (node.strokes as readonly Paint[] | typeof figma.mixed) : undefined;
  if (!Array.isArray(strokes) || strokes.length === 0) return undefined;

  const hasGradientStroke = strokes.some(
    (stroke) =>
      stroke.visible !== false &&
      (stroke.type === "GRADIENT_LINEAR" ||
        stroke.type === "GRADIENT_RADIAL" ||
        stroke.type === "GRADIENT_ANGULAR" ||
        stroke.type === "GRADIENT_DIAMOND")
  );
  if (!hasGradientStroke) return undefined;

  const align = ("strokeAlign" in node ? node.strokeAlign : "INSIDE") ?? "INSIDE";
  if (align === "OUTSIDE") return undefined;

  const topW = "strokeTopWeight" in node ? node.strokeTopWeight : undefined;
  const rightW = "strokeRightWeight" in node ? node.strokeRightWeight : undefined;
  const bottomW = "strokeBottomWeight" in node ? node.strokeBottomWeight : undefined;
  const leftW = "strokeLeftWeight" in node ? node.strokeLeftWeight : undefined;
  const definedSideWeights = [topW, rightW, bottomW, leftW].filter(
    (value): value is number => typeof value === "number"
  );

  let strokeWeight = 0;
  if (definedSideWeights.length > 0) {
    const first = definedSideWeights[0];
    const uniformSides = definedSideWeights.every((value) => Math.abs(value - first) < 1e-6);
    if (!uniformSides) return undefined;
    strokeWeight = first;
  } else {
    const strokeWeightRaw = "strokeWeight" in node ? node.strokeWeight : 0;
    strokeWeight = typeof strokeWeightRaw === "number" ? strokeWeightRaw : 0;
  }
  if (strokeWeight <= 0) return undefined;

  const stroke = extractGradientFill(strokes, { width: node.width, height: node.height });
  if (!stroke || !stroke.includes("gradient")) return undefined;

  return { stroke, width: toPx(strokeWeight) };
}

/**
 * Converts a frame/group/component/instance node to an elementGroup ElementBlock.
 */
export async function convertGroupNode(
  node: FrameNode | GroupNode | ComponentNode | InstanceNode,
  ctx: ConversionContext,
  convertNodeFn: (
    node: SceneNode,
    ctx: ConversionContext,
    parentCtx?: GroupNodeParentCtx
  ) => Promise<ElementBlock | null>,
  parentCtx?: GroupNodeParentCtx
): Promise<ElementBlock | null> {
  const annotations = parseNodeAnnotations(
    node as unknown as { name?: string } & Record<string, unknown>
  );
  const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
  const layout = extractLayoutProps(node);
  const inspectCss = await getInspectableCssAsync(node as SceneNode);

  const { boxShadow, filter, backdropFilter, glassEffect } = await extractNodeVisualEffects(
    node as SceneNode,
    inspectCss
  );
  const figmaEffects: unknown[] = glassEffect ? [glassEffect] : [];

  const visualExtras: Record<string, string | number> = {};
  if (layout.borderRadius !== undefined) {
    const br = layout.borderRadius;
    if (!Array.isArray(br)) {
      visualExtras.borderRadius = br;
      delete layout.borderRadius;
    }
  }
  if (layout.blendMode) {
    visualExtras.mixBlendMode = layout.blendMode;
    delete layout.blendMode;
  }
  if (layout.opacity !== undefined) {
    visualExtras.opacity = layout.opacity;
    delete layout.opacity;
  }
  if (boxShadow) visualExtras.boxShadow = boxShadow;
  if (filter) visualExtras.filter = filter;
  if (backdropFilter) {
    visualExtras.backdropFilter = backdropFilter;
    visualExtras.WebkitBackdropFilter = backdropFilter;
  }
  if (Object.keys(visualExtras).length > 0) {
    layout.wrapperStyle = { ...(layout.wrapperStyle ?? {}), ...visualExtras };
  }

  const autoLayout =
    node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE"
      ? extractAutoLayoutProps(node as FrameNode | ComponentNode | InstanceNode)
      : {};

  const nodeLayoutMode: GroupNodeParentCtx["layoutMode"] =
    "layoutMode" in node ? node.layoutMode : "NONE";

  if (parentCtx?.layoutMode === "NONE" && "x" in node && "y" in node) {
    const { figmaConstraints } = extractAbsolutePositionStyle(
      node as SceneNode & { x: number; y: number; width: number; height: number },
      parentCtx?.parentWidth,
      parentCtx?.parentHeight
    );
    layout.figmaConstraints = figmaConstraints;
  }

  if (isAbsolutePositioned(node) && "x" in node && "y" in node) {
    const { figmaConstraints } = extractConstraintPosition(
      node as SceneNode & { x: number; y: number; width: number; height: number },
      parentCtx?.parentWidth,
      parentCtx?.parentHeight
    );
    layout.figmaConstraints = figmaConstraints;
  }

  if (nodeLayoutMode === "NONE") {
    const ws: Record<string, string | number> = { ...(layout.wrapperStyle ?? {}) };
    if (!ws.position) ws.position = "relative";
    layout.wrapperStyle = ws;
  }

  if (nodeLayoutMode !== "NONE") {
    const nodeChildren = "children" in node ? [...node.children] : [];
    const hasAbsChild = nodeChildren.some(isAbsolutePositioned);
    if (hasAbsChild) {
      const ws: Record<string, string | number> = { ...(layout.wrapperStyle ?? {}) };
      if (!ws.position) {
        ws.position = "relative";
        layout.wrapperStyle = ws;
      }
    }
  }

  const fills = "fills" in node ? (node.fills as Paint[]) : [];
  const inspectBackground = await getInspectableBackgroundAsync(node as SceneNode, inspectCss);
  const multipleFills = extractMultipleFills(
    fills,
    "width" in node && "height" in node
      ? { width: (node as { width: number }).width, height: (node as { height: number }).height }
      : undefined
  );
  const bgColor =
    !multipleFills?.hasImageFill && inspectBackground ? inspectBackground : multipleFills?.fill;
  const gradientStroke = extractGradientStrokeForGroup(node);

  if (multipleFills?.hasImageFill && multipleFills.hasMultiple) {
    ctx.warnings.push(
      `[fills] "${node.name}" has stacked image+color fills — image fill exported separately, overlay fill applied via wrapperStyle`
    );
  }

  const childParentCtx: GroupNodeParentCtx = {
    layoutMode: nodeLayoutMode,
    parentWidth: "width" in node ? (node as { width: number }).width : undefined,
    parentHeight: "height" in node ? (node as { height: number }).height : undefined,
    parentClipsContent:
      (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") &&
      "clipsContent" in node &&
      (node as FrameNode).clipsContent === true,
    // For GROUP nodes, children report x/y in the parent frame's coordinate space, not
    // relative to the group. Pass the group's own x/y so applyAbsPos can correct them.
    ...(node.type === "GROUP" && "x" in node && "y" in node
      ? {
          originX: (node as { x: number }).x,
          originY: (node as { y: number }).y,
        }
      : {}),
  };

  const children = "children" in node ? node.children : [];
  const definitions: Record<string, ElementBlock> = {};
  const elementOrder: string[] = [];
  const convertedChildren: ElementBlock[] = [];

  for (const child of children) {
    const converted = await convertNodeFn(child, ctx, childParentCtx);
    if (converted) {
      const childId = ensureElementId(converted, child.name || child.type, ctx, ctx.warnings);
      definitions[childId] = converted;
      elementOrder.push(childId);
      convertedChildren.push(converted);
    }
  }

  // Image fill background: when this group/frame has an image fill AND children (content on top),
  // export the image as a background elementImage injected as the first child.
  const groupImageFill = extractImageFill(fills);
  if (groupImageFill) {
    let bgSrc: string | undefined;
    if (ctx.skipAssets) {
      const ak = buildAssetKey(`${node.name || id}/bg`, ctx);
      bgSrc = ak.cdnKey;
    } else {
      const img = figma.getImageByHash(groupImageFill.hash);
      if (img) {
        try {
          const bytes = await img.getBytesAsync();
          const ak = buildAssetKey(`${node.name || id}/bg`, ctx);
          ctx.assets.push({ filename: ak.filename, data: new Uint8Array(bytes) });
          bgSrc = ak.cdnKey;
        } catch (err) {
          ctx.warnings.push(`[fills] "${node.name}" image fill export failed: ${String(err)}`);
        }
      }
    }

    if (bgSrc) {
      const bgId = ensureUniqueId(`${id}-bg`, ctx.usedIds);
      const objFit = figmaScaleModeToObjectFit(groupImageFill.scaleMode);
      const bgElement: ElementImage = {
        type: "elementImage",
        id: bgId,
        src: bgSrc,
        alt: "",
        objectFit: objFit as ElementImage["objectFit"],
        wrapperStyle: {
          position: "absolute",
          top: "0px",
          left: "0px",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        },
      };
      definitions[bgId] = bgElement as unknown as ElementBlock;
      elementOrder.unshift(bgId);
      // Ensure parent is positioned so the absolute bg child works
      layout.wrapperStyle = { position: "relative", ...(layout.wrapperStyle ?? {}) };
    }
  }

  // Use `background` (not `backgroundColor`) so CSS gradients and multi-layer fills work;
  // Peblor passes wrapperStyle through to `style` as-is.
  if (bgColor) {
    const normalizedBg = bgColor.trim().toLowerCase();
    const hasGradientOrImageLayer =
      normalizedBg.includes("gradient(") ||
      normalizedBg.includes("url(") ||
      normalizedBg.includes("image-set(");
    const isVarRef = normalizedBg.startsWith("var(");
    const isVarWithLayerFallback = isVarRef && hasGradientOrImageLayer;
    const isSolidColor =
      normalizedBg.startsWith("#") ||
      normalizedBg.startsWith("rgba(") ||
      normalizedBg.startsWith("rgb(") ||
      normalizedBg.startsWith("hsl(") ||
      normalizedBg.startsWith("hsla(") ||
      (isVarRef && !isVarWithLayerFallback);
    const isCssGradientOrImage =
      normalizedBg.startsWith("linear-gradient") ||
      normalizedBg.startsWith("radial-gradient") ||
      normalizedBg.startsWith("conic-gradient") ||
      normalizedBg.startsWith("url(") ||
      normalizedBg.startsWith("image-set(") ||
      isVarWithLayerFallback;
    if (isSolidColor) {
      // Use backgroundColor so Framer Motion gesture diffs (whileHover/whileTap) animate the same property
      layout.wrapperStyle = { ...(layout.wrapperStyle ?? {}), backgroundColor: bgColor };
    } else if (isCssGradientOrImage) {
      // Gradients and image fills must use the `background` shorthand
      layout.wrapperStyle = { ...(layout.wrapperStyle ?? {}), background: bgColor };
    } else {
      // Unknown fill format — fall back to `background` to avoid silent drop
      layout.wrapperStyle = { ...(layout.wrapperStyle ?? {}), background: bgColor };
    }
  }

  if (gradientStroke) {
    layout.borderGradient = gradientStroke;
  }

  if (!gradientStroke) {
    const borderProps = extractBorderProps(node as SceneNode & { strokes?: readonly Paint[] });
    if (Object.keys(borderProps).length > 0) {
      layout.wrapperStyle = {
        ...(layout.wrapperStyle ?? {}),
        ...(borderProps.border ? { border: borderProps.border } : {}),
        ...(borderProps.borderTop ? { borderTop: borderProps.borderTop } : {}),
        ...(borderProps.borderRight ? { borderRight: borderProps.borderRight } : {}),
        ...(borderProps.borderBottom ? { borderBottom: borderProps.borderBottom } : {}),
        ...(borderProps.borderLeft ? { borderLeft: borderProps.borderLeft } : {}),
        ...(borderProps.outline ? { outline: borderProps.outline } : {}),
      };
    }
  }

  const group: ElementBlock = {
    type: "elementGroup",
    id,
    ...autoLayout,
    ...layout,
    section: { elementOrder, definitions },
    ...(figmaEffects.length > 0 ? { effects: figmaEffects } : {}),
  };

  warnRepeatedStructuralSignatures(
    node.name || id,
    convertedChildren,
    ctx.warnings,
    "direct children",
    {
      suppress: ctx.autoPresets,
    }
  );
  applyElementAnnotationProps(group, node, annotations, ctx.warnings);

  return group;
}

/**
 * Converts a TextNode with mixed text styles to an elementRichText block.
 */
export async function convertRichTextNode(
  node: TextNode,
  ctx: ConversionContext
): Promise<ElementBlock | null> {
  const annotations = parseNodeAnnotations(
    node as unknown as { name?: string } & Record<string, unknown>
  );
  const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
  const layout = extractLayoutProps(node);
  if (node.textAlignHorizontal) {
    layout.textAlign = figmaTextAlignToCSS(node.textAlignHorizontal);
  }

  let content = node.characters;
  let markup: string | undefined;
  try {
    const runs = parseTextStyle(node) as Array<Record<string, unknown>>;
    if (Array.isArray(runs) && runs.length > 0) {
      content = runsToMarkdown(runs);
      markup = runs.map(runToHtml).join("");
    }
  } catch {
    // Keep plain content fallback when parseTextStyle cannot introspect this node.
  }

  ctx.warnings.push(
    `[richText] Layer "${node.name}" has mixed text styles — exported as elementRichText with run-level formatting approximations.`
  );

  const result = {
    type: "elementRichText",
    id,
    content,
    ...(markup ? { markup } : {}),
    ...layout,
  } as ElementBlock;

  applyElementAnnotationProps(result, node, annotations, ctx.warnings);

  return result;
}

function escapeMarkdownText(value: string): string {
  // Keep markdown human-readable for the peblor markdown renderer.
  // Escape only tokens that commonly break inline emphasis parsing.
  return value.replace(/\\/g, "\\\\").replace(/([`*_[\]])/g, "\\$1");
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTextCase(value: string, textCase: unknown): string {
  if (textCase === "UPPER") return value.toUpperCase();
  if (textCase === "LOWER") return value.toLowerCase();
  if (textCase === "TITLE") return value.replace(/\b\w/g, (char) => char.toUpperCase());
  return value;
}

type MarkdownRunStyle = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
};

function isRunBold(run: Record<string, unknown>): boolean {
  const numericWeight =
    typeof run.fontWeight === "number" && Number.isFinite(run.fontWeight)
      ? run.fontWeight
      : undefined;
  if (numericWeight !== undefined) return numericWeight >= 600;
  const styleName = String((run.fontName as { style?: string } | undefined)?.style ?? "");
  return /(semi|demi|extra)?bold|black|heavy/i.test(styleName);
}

function readMarkdownStyle(run: Record<string, unknown>): MarkdownRunStyle {
  const styleName = String((run.fontName as { style?: string } | undefined)?.style ?? "");
  return {
    bold: isRunBold(run),
    italic: /(italic|oblique)/i.test(styleName),
    strikethrough: run.textDecoration === "STRIKETHROUGH",
  };
}

function renderMarkdownWithStyle(value: string, style: MarkdownRunStyle): string {
  // Wrap each non-empty line separately so markdown markers never straddle newlines.
  const wrapByLine = (value: string, marker: string): string =>
    value
      .split("\n")
      .map((line) => (line.length > 0 ? `${marker}${line}${marker}` : line))
      .join("\n");

  let rendered = value;
  if (style.bold) rendered = wrapByLine(rendered, "**");
  if (style.italic) rendered = wrapByLine(rendered, "*");
  if (style.strikethrough) rendered = wrapByLine(rendered, "~~");

  return rendered;
}

function sameMarkdownStyle(a: MarkdownRunStyle, b: MarkdownRunStyle): boolean {
  return a.bold === b.bold && a.italic === b.italic && a.strikethrough === b.strikethrough;
}

function runsToMarkdown(runs: Array<Record<string, unknown>>): string {
  let merged = "";
  let buffer = "";
  let currentStyle: MarkdownRunStyle | null = null;

  const flush = (): void => {
    if (!currentStyle || buffer.length === 0) return;
    merged += renderMarkdownWithStyle(buffer, currentStyle);
    buffer = "";
  };

  for (const run of runs) {
    let text = String(run.characters ?? "");
    text = normalizeTextCase(text, run.textCase);
    const escaped = escapeMarkdownText(text);
    const nextStyle = readMarkdownStyle(run);

    if (currentStyle && !sameMarkdownStyle(currentStyle, nextStyle)) {
      flush();
    }
    currentStyle = nextStyle;
    buffer += escaped;
  }

  flush();
  return merged;
}

function runToHtml(run: Record<string, unknown>): string {
  let text = String(run.characters ?? "");
  text = normalizeTextCase(text, run.textCase);
  let escaped = htmlEscape(text).replace(/\n/g, "<br/>");

  const styleParts: string[] = [];
  if (typeof run.fontSize === "number") styleParts.push(`font-size:${run.fontSize}px`);
  const lineHeightPx =
    typeof run.lineHeightPx === "number" &&
    Number.isFinite(run.lineHeightPx) &&
    run.lineHeightPx > 0
      ? run.lineHeightPx
      : undefined;
  if (lineHeightPx !== undefined) styleParts.push(`line-height:${lineHeightPx}px`);
  const styleName = String((run.fontName as { style?: string } | undefined)?.style ?? "");
  const isBold = isRunBold(run);
  const isItalic = /(italic|oblique)/i.test(styleName);
  const isStrikethrough = run.textDecoration === "STRIKETHROUGH";
  if (isBold) escaped = `<strong>${escaped}</strong>`;
  if (isItalic) escaped = `<em>${escaped}</em>`;
  if (isStrikethrough) escaped = `<s>${escaped}</s>`;

  const fills = run.fills as Paint[] | undefined;
  const solidFill = Array.isArray(fills)
    ? fills.find((fill) => fill.type === "SOLID" && fill.visible !== false)
    : undefined;
  if (solidFill && solidFill.type === "SOLID") {
    styleParts.push(
      solidFill.opacity !== undefined && solidFill.opacity < 1
        ? `color:rgba(${Math.round(solidFill.color.r * 255)},${Math.round(solidFill.color.g * 255)},${Math.round(solidFill.color.b * 255)},${solidFill.opacity})`
        : `color:${figmaRgbToHex(solidFill.color.r, solidFill.color.g, solidFill.color.b)}`
    );
  }

  if (styleParts.length === 0) return escaped;
  return `<span style="${styleParts.join(";")}">${escaped}</span>`;
}
