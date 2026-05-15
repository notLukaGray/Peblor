/**
 * TextNode → elementHeading / elementBody / elementLink converter.
 */

import type { ElementBody, ElementHeading, ElementLink } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { extractLayoutProps, resolveNumericVar } from "./layout";
import {
  extractTypographyOverrides,
  inferHeadingLevel,
  isLikelyHeading,
  figmaLetterSpacingToCSS,
} from "./typography";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { extractNodeVisualEffects } from "./node-visual-effects";
import { parseAnnotations, parseTextStyleAnnotation } from "./annotations";
import { extractTextLinks } from "./text-links";
import { applyTextTruncation, applyTextFillColor, applyTextAnnotations } from "./text-style-apply";

export type { TextLinkSegment } from "./text-links";

/**
 * Converts a Figma TextNode to an elementHeading, elementBody, or elementLink.
 *
 * Heuristic routing:
 * - If the node has a hyperlink → elementLink
 * - If isLikelyHeading() → elementHeading
 * - Otherwise → elementBody
 */
export async function convertTextNode(
  node: TextNode,
  ctx: ConversionContext
): Promise<ElementHeading | ElementBody | ElementLink> {
  const id = ensureUniqueId(slugify(node.name || "text"), ctx.usedIds);
  const text = node.characters;
  const layout = extractLayoutProps(node);
  const { boxShadow, filter, backdropFilter, glassEffect } = await extractNodeVisualEffects(node);
  if (boxShadow) layout.boxShadow = boxShadow;
  if (filter) layout.filter = filter;
  if (backdropFilter) {
    layout.backdropFilter = backdropFilter;
    layout.WebkitBackdropFilter = backdropFilter;
  }
  if (glassEffect) layout.effects = [glassEffect];

  // Resolve Figma text style name (async — must use getStyleByIdAsync)
  let figmaStyleName: string | null = null;
  if (node.textStyleId && typeof node.textStyleId === "string") {
    try {
      const style = await figma.getStyleByIdAsync(node.textStyleId);
      if (style) figmaStyleName = style.name;
    } catch {
      // style not resolvable (library component, etc.) — ignore
    }
  }

  const typography = extractTypographyOverrides(node);

  const annotations = parseAnnotations(node.name ?? "");
  const seoRaw = annotations["seo"];
  const seoMatch = seoRaw ? /^h([1-6])$/i.exec(seoRaw) : null;
  if (seoRaw && !seoMatch) {
    ctx.warnings.push(
      `[annotations] "${node.name}" has unsupported seo value "${seoRaw}" — expected h1..h6`
    );
  }

  // Semantic style: seo annotation wins, then legacy style annotation, then Figma style name.
  let semanticStyle = parseTextStyleAnnotation(annotations);

  if (!semanticStyle && figmaStyleName) {
    const n = figmaStyleName.toLowerCase().replace(/[\s_-]/g, "");
    const hMatch = n.match(/^h([1-5])$/);
    const pMatch = n.match(/^(?:p|body|paragraph)([1-6])$/);
    if (hMatch) {
      semanticStyle = { elementType: "elementHeading", level: Number(hMatch[1]) };
    } else if (pMatch) {
      semanticStyle = { elementType: "elementBody", level: Number(pMatch[1]) };
    }
  }

  if (semanticStyle !== null) {
    if (semanticStyle.elementType === "elementHeading") {
      const level =
        seoMatch !== null
          ? (Number(seoMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6)
          : (inferHeadingLevel(node) as 1 | 2 | 3 | 4 | 5 | 6);
      const result: ElementHeading = {
        type: "elementHeading",
        id,
        level,
        text,
        ...(seoMatch !== null
          ? { semanticLevel: Number(seoMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6 }
          : {}),
        ...layout,
        ...typography,
      };
      applyTextFillColor(node, result);
      applyTextAnnotations(node, result);
      applyTextTruncation(node, result as unknown as Record<string, unknown>);
      return result;
    }

    const result: ElementBody = {
      type: "elementBody",
      id,
      text,
      level: semanticStyle.level,
      ...layout,
      ...typography,
    };
    applyTextFillColor(node, result);
    applyTextAnnotations(node, result);
    applyTextTruncation(node, result as unknown as Record<string, unknown>);
    return result;
  }

  const boundVars = (
    node as TextNode & {
      boundVariables?: Record<string, { type: "VARIABLE_ALIAS"; id: string }>;
    }
  ).boundVariables;

  // fontSize
  if (typeof node.fontSize === "number") {
    const resolved = resolveNumericVar(boundVars, "fontSize", node.fontSize, "px", node);
    if (typeof resolved === "string" && !typography.fontSize) {
      typography.fontSize = resolved;
    }
  }

  // letterSpacing — resolve variable binding
  const ls = node.letterSpacing;
  if (ls !== figma.mixed && typeof ls.value === "number" && ls.value !== 0) {
    const aliasRaw = boundVars?.["letterSpacing"];
    const alias = Array.isArray(aliasRaw) ? aliasRaw[0] : aliasRaw;
    if (alias?.type === "VARIABLE_ALIAS" && !typography.letterSpacing) {
      const rawResolved = resolveNumericVar(boundVars, "letterSpacing", ls.value, "px", node);
      if (typeof rawResolved === "string") {
        const cssLsFallback = figmaLetterSpacingToCSS(ls);
        typography.letterSpacing = rawResolved.replace(/,\s*[\d.]+px\s*\)$/, `, ${cssLsFallback})`);
      }
    }
  }

  // lineHeight — resolve variable binding; skip AUTO unit.
  const lh = node.lineHeight;
  if (lh !== figma.mixed && lh.unit !== "AUTO" && typeof lh.value === "number") {
    const aliasRawLh = boundVars?.["lineHeight"];
    const alias = Array.isArray(aliasRawLh) ? aliasRawLh[0] : aliasRawLh;
    if (alias?.type === "VARIABLE_ALIAS" && !typography.lineHeight) {
      const resolvedLh = resolveNumericVar(
        boundVars,
        "lineHeight",
        lh.value,
        lh.unit === "PIXELS" ? "px" : "",
        node
      );
      if (typeof resolvedLh === "string") {
        typography.lineHeight = resolvedLh;
      }
    }
  }

  const links = extractTextLinks(node);

  if (links.length === 1 && links[0].characters.trim() === node.characters.trim()) {
    const headingLink = isLikelyHeading(node, figmaStyleName);
    const inferredLevel = inferHeadingLevel(node);
    const result: ElementLink = {
      type: "elementLink",
      id,
      label: links[0].characters.trim(),
      href: links[0].href,
      external: links[0].external,
      copyType: inferredLevel >= 4 ? "body" : "heading",
      ...(headingLink ? { level: inferredLevel as 1 | 2 | 3 | 4 | 5 | 6 } : {}),
      ...layout,
      ...typography,
    };
    applyTextFillColor(node, result);
    applyTextAnnotations(node, result);
    applyTextTruncation(node, result as unknown as Record<string, unknown>);
    return result;
  }

  if (links.length > 0) {
    ctx.warnings.push(
      `[text] "${node.name}" has partial hyperlinks on characters "${links.map((l) => l.characters).join('", "')}". Partial inline links are not supported — emitting as plain text. Consider splitting into separate text + link elements in Figma.`
    );
  }

  // Legacy single-hyperlink path (node.hyperlink covers the whole node)
  if (links.length === 0) {
    const hyperlinkRaw = node.hyperlink;
    if (hyperlinkRaw && typeof hyperlinkRaw === "object" && "type" in hyperlinkRaw) {
      const hyperlink = hyperlinkRaw as { type: string; value: string };
      if (hyperlink.type === "URL") {
        const headingLink = isLikelyHeading(node, figmaStyleName);
        const result: ElementLink = {
          type: "elementLink",
          id,
          label: text,
          href: hyperlink.value,
          external: !hyperlink.value.startsWith("/"),
          copyType: headingLink ? "heading" : "body",
          ...(headingLink ? { level: inferHeadingLevel(node) as 1 | 2 | 3 | 4 | 5 | 6 } : {}),
          ...layout,
          ...typography,
        };
        applyTextFillColor(node, result);
        applyTextAnnotations(node, result);
        applyTextTruncation(node, result as unknown as Record<string, unknown>);
        return result;
      }
    }
  }

  if (isLikelyHeading(node, figmaStyleName)) {
    const level = inferHeadingLevel(node) as 1 | 2 | 3 | 4 | 5 | 6;
    const result: ElementHeading = {
      type: "elementHeading",
      id,
      level,
      text,
      ...layout,
      ...typography,
    };
    applyTextFillColor(node, result);
    applyTextAnnotations(node, result);
    applyTextTruncation(node, result as unknown as Record<string, unknown>);
    return result;
  }

  // No semantic annotation and no Figma text style — omit `level` entirely so the renderer
  // skips the typography class and uses the explicit typography overrides as inline
  // styles instead of fighting a class-based font size / weight.
  const result: ElementBody = { type: "elementBody", id, text, ...layout, ...typography };
  applyTextFillColor(node, result);
  // Promote wrapperStyle.color to a direct `color` prop so ElementBody can apply it
  // as an inline style. The wrapperStyle key is only consumed by ElementRenderer's
  // gesture wrapper and would not reach the inner <p> element.
  if (result.wrapperStyle?.["color"] && typeof result.wrapperStyle["color"] === "string") {
    result.color = result.wrapperStyle["color"] as string;
    delete result.wrapperStyle["color"];
    if (Object.keys(result.wrapperStyle).length === 0) delete result.wrapperStyle;
  }
  applyTextAnnotations(node, result);
  applyTextTruncation(node, result as unknown as Record<string, unknown>);
  return result;
}
