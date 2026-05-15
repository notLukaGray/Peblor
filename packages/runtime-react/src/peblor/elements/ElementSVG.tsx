"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { sanitizeSvgMarkup } from "@pb/runtime-react/core/lib/sanitize-svg";
import {
  parseTransformString,
  buildGradientTransformMatrix,
  serializeTransformMatrix,
} from "@pb/runtime-react/core/lib/svg-transform-utils";
import type { ElementLayoutTransformOptions } from "@pb/core/layout";
import type { ElementLayout } from "@pb/contracts/types";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { GraphicLinkWrapper } from "./Shared/GraphicLinkWrapper";

type Props = Extract<ElementBlock, { type: "elementSVG" }>;

type LayoutProps = Pick<
  ElementLayoutTransformOptions,
  "width" | "height" | "align" | "marginTop" | "marginBottom" | "marginLeft" | "marginRight"
> & {
  zIndex?: number;
  fixed?: ElementLayout["fixed"];
  borderRadius?: ElementLayout["borderRadius"];
  constraints?: ElementLayout["constraints"];
};

function parseAttr(tag: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1]?.trim();
}

function parseNumeric(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function isFullBleedRect(svgTag: string, rectTag: string): boolean {
  const rectWidthRaw = parseAttr(rectTag, "width");
  const rectHeightRaw = parseAttr(rectTag, "height");
  if (!rectWidthRaw || !rectHeightRaw) return false;

  const rectWidth = rectWidthRaw.trim().toLowerCase();
  const rectHeight = rectHeightRaw.trim().toLowerCase();
  if (
    (rectWidth === "100%" || rectWidth === "100") &&
    (rectHeight === "100%" || rectHeight === "100")
  ) {
    return true;
  }

  const viewBox = parseAttr(svgTag, "viewBox");
  if (!viewBox) return false;
  const parts = viewBox
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
  if (parts.length < 4) return false;

  const vbWidth = parts[2];
  const vbHeight = parts[3];
  if (vbWidth == null || vbHeight == null) return false;
  const rw = parseNumeric(rectWidthRaw);
  const rh = parseNumeric(rectHeightRaw);
  if (rw == null || rh == null) return false;

  return Math.abs(rw - vbWidth) < 0.01 && Math.abs(rh - vbHeight) < 0.01;
}

function inferSvgRectBorderRadius(markup: string | undefined): string | undefined {
  const source = typeof markup === "string" ? markup.trim() : "";
  if (!source) return undefined;

  const svgMatch = source.match(/<svg\b[^>]*>/i);
  const rectMatch = source.match(/<rect\b[^>]*>/i);
  if (!svgMatch?.[0] || !rectMatch?.[0]) return undefined;

  const svgTag = svgMatch[0];
  const rectTag = rectMatch[0];
  if (!isFullBleedRect(svgTag, rectTag)) return undefined;

  const rxRaw = parseAttr(rectTag, "rx");
  const ryRaw = parseAttr(rectTag, "ry");
  const radiusRaw = (rxRaw || ryRaw)?.trim();
  if (!radiusRaw) return undefined;

  if (/^-?\d*\.?\d+$/.test(radiusRaw)) return `${radiusRaw}px`;
  if (/^-?\d*\.?\d+(px|%)$/i.test(radiusRaw)) return radiusRaw;

  const parsed = Number.parseFloat(radiusRaw);
  return Number.isFinite(parsed) ? `${parsed}px` : undefined;
}

function getGlassShapeInfo(effects: unknown): { hasGlass: boolean; hasClipPath: boolean } {
  if (!Array.isArray(effects)) return { hasGlass: false, hasClipPath: false };

  let hasGlass = false;
  let hasClipPath = false;
  for (const effect of effects) {
    if (!effect || typeof effect !== "object") continue;
    const record = effect as { type?: unknown; clipPath?: unknown };
    if (record.type !== "glass") continue;
    hasGlass = true;
    if (typeof record.clipPath === "string" && record.clipPath.trim().length > 0) {
      hasClipPath = true;
      break;
    }
  }

  return { hasGlass, hasClipPath };
}

function parseSvgViewport(markup: string): { width: number; height: number } | undefined {
  const svgMatch = markup.match(/<svg\b[^>]*>/i);
  if (!svgMatch?.[0]) return undefined;
  const svgTag = svgMatch[0];

  const viewBox = parseAttr(svgTag, "viewBox");
  if (viewBox) {
    const nums = viewBox
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part))
      .filter((value) => Number.isFinite(value));
    const vbWidth = nums[2];
    const vbHeight = nums[3];
    if (nums.length >= 4 && vbWidth != null && vbHeight != null && vbWidth > 0 && vbHeight > 0) {
      return { width: vbWidth, height: vbHeight };
    }
  }

  const width = parseNumeric(parseAttr(svgTag, "width"));
  const height = parseNumeric(parseAttr(svgTag, "height"));
  if (width != null && height != null && width > 0 && height > 0) {
    return { width, height };
  }
  return undefined;
}

function roundClipCoord(value: number): number {
  return Math.round(value * 100000) / 100000;
}

function normalizeSvgPathToObjectBoundingBox(d: string, width: number, height: number): string {
  const wx = 1 / width;
  const wy = 1 / height;

  const tokens: Array<{ cmd: string; args: number[] }> = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1];
    if (!cmd) continue;
    const raw = (m[2] ?? "").trim();
    const args =
      raw.length > 0
        ? raw
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n))
        : [];
    tokens.push({ cmd, args });
  }

  const out: string[] = [];
  for (const { cmd, args } of tokens) {
    switch (cmd) {
      case "M":
      case "m":
      case "L":
      case "l":
      case "T":
      case "t": {
        const scaled: number[] = [];
        for (let i = 0; i + 1 < args.length; i += 2) {
          scaled.push(roundClipCoord(args[i]! * wx), roundClipCoord(args[i + 1]! * wy));
        }
        if (scaled.length > 0) out.push(`${cmd}${scaled.join(" ")}`);
        break;
      }
      case "H":
      case "h": {
        const scaled = args.map((x) => roundClipCoord(x * wx));
        if (scaled.length > 0) out.push(`${cmd}${scaled.join(" ")}`);
        break;
      }
      case "V":
      case "v": {
        const scaled = args.map((y) => roundClipCoord(y * wy));
        if (scaled.length > 0) out.push(`${cmd}${scaled.join(" ")}`);
        break;
      }
      case "C":
      case "c": {
        const scaled: number[] = [];
        for (let i = 0; i + 5 < args.length; i += 6) {
          scaled.push(
            roundClipCoord(args[i]! * wx),
            roundClipCoord(args[i + 1]! * wy),
            roundClipCoord(args[i + 2]! * wx),
            roundClipCoord(args[i + 3]! * wy),
            roundClipCoord(args[i + 4]! * wx),
            roundClipCoord(args[i + 5]! * wy)
          );
        }
        if (scaled.length > 0) out.push(`${cmd}${scaled.join(" ")}`);
        break;
      }
      case "S":
      case "s":
      case "Q":
      case "q": {
        const step = cmd.toLowerCase() === "s" || cmd.toLowerCase() === "q" ? 4 : 4;
        const scaled: number[] = [];
        for (let i = 0; i + step - 1 < args.length; i += step) {
          for (let j = 0; j < step; j += 2) {
            scaled.push(roundClipCoord(args[i + j]! * wx), roundClipCoord(args[i + j + 1]! * wy));
          }
        }
        if (scaled.length > 0) out.push(`${cmd}${scaled.join(" ")}`);
        break;
      }
      case "A":
      case "a": {
        const scaled: number[] = [];
        for (let i = 0; i + 6 < args.length; i += 7) {
          scaled.push(
            roundClipCoord(args[i]! * wx),
            roundClipCoord(args[i + 1]! * wy),
            args[i + 2]!,
            args[i + 3]!,
            args[i + 4]!,
            roundClipCoord(args[i + 5]! * wx),
            roundClipCoord(args[i + 6]! * wy)
          );
        }
        if (scaled.length > 0) out.push(`${cmd}${scaled.join(" ")}`);
        break;
      }
      case "Z":
      case "z":
        out.push("Z");
        break;
      default:
        break;
    }
  }

  return out.join("");
}

function inferSvgClipPathFromMarkup(
  markup: string | undefined
): { clipPath: string; clipRule: "nonzero" | "evenodd" } | undefined {
  const source = typeof markup === "string" ? markup.trim() : "";
  if (!source) return undefined;

  const viewport = parseSvgViewport(source);
  if (!viewport) return undefined;

  const pathTags = Array.from(source.matchAll(/<path\b[^>]*>/gi)).map((match) => match[0]);
  if (pathTags.length === 0) return undefined;

  const clipRule: "nonzero" | "evenodd" = (() => {
    const first = pathTags[0];
    if (!first) return "nonzero";
    const rule = parseAttr(first, "clip-rule") ?? parseAttr(first, "fill-rule");
    return typeof rule === "string" && rule.trim().toLowerCase() === "evenodd"
      ? "evenodd"
      : "nonzero";
  })();

  const combined = pathTags
    .map((tag) => parseAttr(tag, "d"))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  if (!combined) return undefined;

  const normalized = normalizeSvgPathToObjectBoundingBox(combined, viewport.width, viewport.height);
  if (!normalized) return undefined;
  return { clipPath: normalized, clipRule };
}

function applyInferredGlassClipPath(
  effects: unknown,
  inferred:
    | {
        clipPath: string;
        clipRule: "nonzero" | "evenodd";
      }
    | undefined
): unknown {
  if (!Array.isArray(effects) || !inferred) return effects;

  let changed = false;
  const next = effects.map((effect) => {
    if (changed || !effect || typeof effect !== "object") return effect;
    const record = effect as { type?: unknown; clipPath?: unknown };
    if (record.type !== "glass") return effect;
    if (typeof record.clipPath === "string" && record.clipPath.trim().length > 0) return effect;
    changed = true;
    return { ...(effect as Record<string, unknown>), ...inferred };
  });
  return changed ? next : effects;
}

function ensureSvgFillsContainer(sanitized: string): string {
  if (!sanitized.trim().startsWith("<svg")) return sanitized;
  return sanitized.replace(/<svg(\s[^>]*)?>/i, (_match, attrs) => {
    const hasXmlns = attrs && /xmlns\s*=/i.test(attrs);
    const xmlnsAttr = hasXmlns ? "" : ' xmlns="http://www.w3.org/2000/svg"';
    return `<svg width="100%" height="100%" style="display:block"${xmlnsAttr}${attrs || ""}>`;
  });
}

function fixBlendModeForMobile(svg: string): string {
  return svg.replace(/<g([^>]*style="([^"]*mix-blend-mode[^"]*)"([^>]*))>/gi, (match) => {
    const styleMatch = match.match(/style="([^"]*)"/);
    if (!styleMatch || !styleMatch[1]) return match;

    const styleContent = styleMatch[1];
    if (styleContent.includes("transform")) {
      return match;
    }
    const newStyleContent = `${styleContent};transform:translateZ(0)`;
    return match.replace(/style="([^"]*)"/, `style="${newStyleContent}"`);
  });
}

function fixGradientTransformForMobile(svg: string): string {
  return svg.replace(/gradientTransform="([^"]+)"/gi, (_, transformValue) => {
    const parsed = parseTransformString(transformValue);
    const matrix = buildGradientTransformMatrix(parsed);
    const out = matrix != null ? serializeTransformMatrix(matrix) : transformValue;
    return `gradientTransform="${out}"`;
  });
}

/** Page-builder SVG element: inline markup, treat as image (no editing; display only). Sanitized. Optional link (ref + internal/external) makes it buttonable. */
export const ElementSVG = forwardRef<HTMLAnchorElement | HTMLDivElement, Props>(
  (
    {
      markup,
      ariaLabel,
      width,
      height,
      align,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      zIndex,
      fixed,
      constraints,
      effects,
      wrapperStyle,
      opacity,
      blendMode,
      boxShadow,
      filter,
      backdropFilter,
      overflow,
      hidden,
      borderRadius,
      rotate,
      flipHorizontal = false,
      flipVertical = false,
      link,
      interactions,
      figmaConstraints,
    },
    ref
  ) => {
    const inferredBorderRadius = useMemo(() => inferSvgRectBorderRadius(markup), [markup]);
    const glassShapeInfo = useMemo(() => getGlassShapeInfo(effects), [effects]);
    const transform = { rotate, flipHorizontal, flipVertical };

    const [safeHtml, setSafeHtml] = useState("");
    const [sanitizeFailed, setSanitizeFailed] = useState(false);

    useEffect(() => {
      const trimmed = markup != null ? String(markup).trim() : "";
      if (!trimmed) {
        queueMicrotask(() => {
          setSafeHtml("");
          setSanitizeFailed(false);
        });
        return;
      }
      const sanitized = sanitizeSvgMarkup(markup);
      const filled = ensureSvgFillsContainer(sanitized);
      const blendModeFixed = fixBlendModeForMobile(filled);
      const gradientFixed = fixGradientTransformForMobile(blendModeFixed);
      const hasValidSvg =
        gradientFixed.trim().length > 0 && gradientFixed.trim().toLowerCase().startsWith("<svg");
      queueMicrotask(() => {
        setSafeHtml(gradientFixed);
        setSanitizeFailed(!hasValidSvg);
      });
    }, [markup]);

    const inferredGlassClipPath = useMemo(() => {
      if (!glassShapeInfo.hasGlass || glassShapeInfo.hasClipPath || sanitizeFailed)
        return undefined;
      const source = safeHtml.trim();
      if (!source) return undefined;
      if (inferSvgRectBorderRadius(source) !== undefined) return undefined;
      return inferSvgClipPathFromMarkup(source);
    }, [glassShapeInfo.hasClipPath, glassShapeInfo.hasGlass, safeHtml, sanitizeFailed]);

    const resolvedEffects = useMemo(
      () => applyInferredGlassClipPath(effects, inferredGlassClipPath),
      [effects, inferredGlassClipPath]
    );

    const layout = {
      width,
      height,
      borderRadius: borderRadius ?? inferredBorderRadius,
      align,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      zIndex,
      fixed,
      constraints,
      figmaConstraints,
      effects: resolvedEffects,
      wrapperStyle,
      opacity,
      blendMode,
      boxShadow,
      filter,
      backdropFilter,
      overflow,
      hidden,
    };

    const hasMarkup = markup != null && String(markup).trim() !== "";
    const showFallback = !hasMarkup || sanitizeFailed;

    return (
      <ElementLayoutWrapper
        layout={layout as LayoutProps}
        transform={transform}
        interactions={interactions}
        glassLayer="background"
      >
        {showFallback && (
          <GraphicLinkWrapper ref={ref} className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm w-full text-center" role="status">
              {!hasMarkup ? "No SVG markup." : "SVG content unavailable."}
            </span>
          </GraphicLinkWrapper>
        )}
        {!showFallback && (
          <GraphicLinkWrapper
            ref={ref}
            link={link}
            className="w-full h-full flex items-center justify-center [&_svg]:block"
            style={{ transform: "translateZ(0)" }}
          >
            <div
              data-graphic-content
              className="w-full h-full [&_svg]:block"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
              role="img"
              aria-label={ariaLabel?.trim() || "SVG graphic"}
            />
          </GraphicLinkWrapper>
        )}
      </ElementLayoutWrapper>
    );
  }
);
ElementSVG.displayName = "ElementSVG";
