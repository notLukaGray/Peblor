/**
 * Sanitize inline SVG markup for safe display (elementSVG). Treat as image: no scripts,
 * no external refs, no event handlers. Allowlist tags and attributes only.
 * Uses DOMParser in browser; falls back to regex-based sanitizer in Node SSR.
 */

import { resolveAuthoredUrl } from "./url-policy";

// ---------------------------------------------------------------------------
// Allowlists
// ---------------------------------------------------------------------------

/** Allowlist of safe SVG tag names (lowercase). */
export const TAGS_ALLOWED = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "rect",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "defs",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "stop",
  "title",
  "desc",
  "animate",
  "animatetransform",
  "animatemotion",
  "set",
  "mpath",
]);

/** Allowlist of safe attribute names (lowercase, no xlink prefix, no hyphens). */
export const ATTRS_ALLOWED = new Set([
  "viewbox",
  "width",
  "height",
  "preserveaspectratio",
  "xmlns",
  "d",
  "fill",
  "fillopacity",
  "stroke",
  "strokeopacity",
  "strokewidth",
  "strokelinecap",
  "strokelinejoin",
  "opacity",
  "transform",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "points",
  "id",
  "clippath",
  "cliprule",
  "fillrule",
  "gradientunits",
  "gradienttransform",
  "fx",
  "fy",
  "offset",
  "stopcolor",
  "stopopacity",
  "strokemiterlimit",
  "href",
  "xlinkhref",
  "attributename",
  "attributetype",
  "from",
  "to",
  "by",
  "values",
  "keytimes",
  "keysplines",
  "calcmode",
  "begin",
  "dur",
  "end",
  "repeatcount",
  "repeatdur",
  "additive",
  "accumulate",
  "restart",
  "min",
  "max",
  "path",
  "keypoints",
  "rotate",
  "type",
  "origin",
]);

const SHAPE_TAGS = new Set(["path", "circle", "rect", "ellipse", "polygon", "polyline", "line"]);

function normalizeAttrName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^xlink:/, "")
    .replace(/-/g, "");
}

export function isAllowedTag(tagName: string): boolean {
  return TAGS_ALLOWED.has(tagName.toLowerCase());
}

export function isAllowedAttr(_tagName: string, attrName: string): boolean {
  const normalized = normalizeAttrName(attrName);
  if (normalized.startsWith("on")) return false;
  if (ATTRS_ALLOWED.has(normalized)) return true;
  if (normalized === "style") return true;
  return false;
}

function isSafeLocalSvgUrlRef(raw: string): boolean {
  const value = raw.trim().replace(/^['"]|['"]$/g, "");
  return /^#[-_a-zA-Z][-_a-zA-Z0-9:.]*$/.test(value);
}

function hasUnsafeUrlFunction(value: string): boolean {
  const urlFnPattern = /url\(([^)]+)\)/gi;
  let match: RegExpExecArray | null = null;
  while ((match = urlFnPattern.exec(value)) !== null) {
    const ref = match[1] ?? "";
    if (!isSafeLocalSvgUrlRef(ref)) return true;
  }
  return false;
}

export function sanitizeAttrValue(
  _tagName: string,
  attrName: string,
  value: string
): string | null {
  const normalizedAttr = normalizeAttrName(attrName);

  if (
    normalizedAttr === "href" ||
    normalizedAttr === "xlink:href" ||
    attrName === "href" ||
    attrName === "xlink:href"
  ) {
    if (isSafeLocalSvgUrlRef(value)) {
      return value.replace(/"/g, "&quot;").replace(/</g, "&lt;");
    }
    const result = resolveAuthoredUrl(value, "any");
    if (!result.ok) return null;
    return result.url.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  const v = value.trim().toLowerCase();
  if (v.startsWith("javascript:") || v.startsWith("data:") || v.startsWith("vbscript:"))
    return null;
  if (hasUnsafeUrlFunction(value)) return null;
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serializeNode(node: Node, inheritedFill?: string): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText(node.textContent ?? "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (!isAllowedTag(tag)) return "";

  const fill = el.getAttribute("fill");
  const hasFill = fill != null && fill !== "none" && fill !== "transparent";
  const currentFill = hasFill ? fill : inheritedFill;

  const attrs: string[] = [];
  for (const { name, value } of Array.from(el.attributes)) {
    if (!isAllowedAttr(tag, name)) continue;
    const safe = sanitizeAttrValue(tag, name, value);
    if (safe === null) continue;
    attrs.push(`${name}="${safe}"`);
  }

  if (SHAPE_TAGS.has(tag) && !hasFill && currentFill) {
    attrs.push(`fill="${currentFill.replace(/"/g, "&quot;")}"`);
  }

  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
  const children = Array.from(el.childNodes)
    .map((child) => serializeNode(child, currentFill))
    .join("");
  return `<${tag}${attrStr}>${children}</${tag}>`;
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/**
 * Server-safe SVG sanitizer: uses a regex-based allowlist to produce sanitized markup
 * in environments where DOMParser is unavailable (Node SSR).
 * Does NOT parse SVG as XML — strips scripts, event handlers, unsafe attributes, and
 * preserves only allowlisted tags and attributes.
 */
export function sanitizeSvgMarkupServer(markup: string): string {
  const trimmed = markup.trim();
  if (!trimmed) return "";

  const maybeUnescaped = trimmed
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
  const src = maybeUnescaped === trimmed ? trimmed : maybeUnescaped;

  // Strip dangerous elements completely
  let result = src
    .replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, "")
    .replace(/<script\b[^>]*\/?\s*>/gi, "")
    .replace(/<style\b[^>]*\/?\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Process each tag — attribute values may contain `>` when quoted, so
  // match quoted strings atomically rather than stopping at the first `>`.
  result = result.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_match, tagName: string, attrsStr: string) => {
      const tag = tagName.toLowerCase();
      if (!isAllowedTag(tag)) return "";

      const isClosing = _match.startsWith("</");
      if (isClosing) return `</${tag}>`;

      const safeAttrs: string[] = [];
      const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(".*?"|'.*?'|[^\s"'=<>`]+))?/g;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(attrsStr)) !== null) {
        const attrName = m[1] ?? "";
        if (!isAllowedAttr(tag, attrName)) continue;
        const rawVal = m[2];
        if (rawVal == null) {
          safeAttrs.push(attrName);
          continue;
        }
        const unquoted = rawVal.replace(/^["']|["']$/g, "");
        const safe = sanitizeAttrValue(tag, attrName, unquoted);
        if (safe === null) continue;
        safeAttrs.push(`${attrName}="${safe}"`);
      }

      // Add required xmlns if missing on root <svg>
      if (tag === "svg" && !safeAttrs.some((a) => a.toLowerCase().startsWith("xmlns="))) {
        safeAttrs.push('xmlns="http://www.w3.org/2000/svg"');
      }

      const attrStr = safeAttrs.length > 0 ? " " + safeAttrs.join(" ") : "";
      return `<${tag}${attrStr}>`;
    }
  );

  // Validate the result starts with <svg
  if (!/^\s*<svg\b/i.test(result)) return "";

  return result;
}

/**
 * Sanitize SVG markup: allowlist tags and attributes, strip scripts and dangerous refs.
 * Uses DOMParser in browser; falls back to regex-based server sanitizer in Node SSR.
 */
export async function sanitizeSvgMarkup(markup: string): Promise<string> {
  const trimmed = markup.trim();
  if (!trimmed) return "";

  let safe: string;

  if (typeof DOMParser === "undefined") {
    safe = sanitizeSvgMarkupServer(trimmed);
  } else {
    const maybeUnescaped = trimmed
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
    const candidates = maybeUnescaped === trimmed ? [trimmed] : [trimmed, maybeUnescaped];

    try {
      const parser = new DOMParser();
      safe = "";
      for (const candidate of candidates) {
        const doc = parser.parseFromString(candidate, "image/svg+xml");
        const root = doc.documentElement;
        if (!root || root.tagName.toLowerCase() !== "svg") continue;
        safe = serializeNode(root);
        break;
      }
    } catch (err) {
      console.warn("[pb-runtime-react] SVG sanitization failed", err);
      return "";
    }
  }

  return safe;
}
