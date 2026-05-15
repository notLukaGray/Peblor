const ALLOWED_TAGS = new Set([
  "span",
  "strong",
  "em",
  "s",
  "br",
  "hr",
  "a",
  "p",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

const GLOBAL_ALLOWED_ATTRS = new Set(["style"]);
const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
};

const ALLOWED_STYLE_PROPS = new Set([
  "font-size",
  "line-height",
  "font-weight",
  "font-style",
  "font-family",
  "color",
  "text-decoration",
  "letter-spacing",
  "text-transform",
  "opacity",
]);

const SELF_CLOSING_TAGS = new Set(["br", "hr"]);

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeHref(raw: string): string | null {
  const href = unquote(raw).trim();
  const lowered = href.toLowerCase();
  if (
    lowered.startsWith("javascript:") ||
    lowered.startsWith("data:") ||
    lowered.startsWith("vbscript:")
  ) {
    return null;
  }
  return href;
}

function sanitizeStyle(raw: string): string | null {
  const value = unquote(raw);
  const declarations = value
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const kept: string[] = [];

  for (const decl of declarations) {
    const idx = decl.indexOf(":");
    if (idx <= 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    const lowered = val.toLowerCase();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (
      lowered.includes("expression(") ||
      lowered.includes("javascript:") ||
      lowered.includes("vbscript:") ||
      lowered.includes("url(") ||
      lowered.includes("@import")
    ) {
      continue;
    }
    kept.push(`${prop}:${val}`);
  }

  if (kept.length === 0) return null;
  return kept.join(";");
}

function sanitizeTagAttributes(tagName: string, attrsRaw: string): string {
  const allowedForTag = TAG_ALLOWED_ATTRS[tagName] ?? new Set<string>();
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(".*?"|'.*?'|[^\s"'=<>`]+))?/g;
  const safeAttrs: string[] = [];
  let match: RegExpExecArray | null = null;
  let hasBlankTarget = false;
  let hasRel = false;

  while ((match = attrPattern.exec(attrsRaw)) !== null) {
    const attrName = match[1]?.toLowerCase() ?? "";
    if (!attrName || attrName.startsWith("on")) continue;
    const rawValue = match[2];
    if (rawValue == null) continue;

    if (!GLOBAL_ALLOWED_ATTRS.has(attrName) && !allowedForTag.has(attrName)) continue;

    if (attrName === "href") {
      const href = sanitizeHref(rawValue);
      if (!href) continue;
      safeAttrs.push(`href="${escapeAttr(href)}"`);
      continue;
    }

    if (attrName === "target") {
      const target = unquote(rawValue).trim();
      if (target !== "_blank" && target !== "_self") continue;
      hasBlankTarget = target === "_blank";
      safeAttrs.push(`target="${escapeAttr(target)}"`);
      continue;
    }

    if (attrName === "rel") {
      const rel = unquote(rawValue).trim();
      if (!rel) continue;
      hasRel = true;
      safeAttrs.push(`rel="${escapeAttr(rel)}"`);
      continue;
    }

    if (attrName === "style") {
      const style = sanitizeStyle(rawValue);
      if (!style) continue;
      safeAttrs.push(`style="${escapeAttr(style)}"`);
      continue;
    }
  }

  if (tagName === "a" && hasBlankTarget && !hasRel) {
    safeAttrs.push('rel="noopener noreferrer"');
  }

  return safeAttrs.length > 0 ? ` ${safeAttrs.join(" ")}` : "";
}

/**
 * Sanitizes rich text HTML fragments for safe rendering in peblor.
 * Uses a strict allow-list for tags/attrs and strips scriptable values.
 */
export function sanitizeRichTextMarkup(markup: string | undefined): string {
  if (typeof markup !== "string") return "";
  const trimmed = markup.trim();
  if (!trimmed) return "";

  const withoutDangerousBlocks = trimmed
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<\s*(script|style|iframe|object|embed|meta|link|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      ""
    )
    .replace(/<\s*(script|style|iframe|object|embed|meta|link|base)\b[^>]*\/?\s*>/gi, "");

  return withoutDangerousBlocks.replace(
    /<\/?([a-zA-Z0-9-]+)([^>]*)>/g,
    (full, rawTagName: string, rawAttrs: string) => {
      const tagName = rawTagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tagName)) return "";

      const isClosing = full.startsWith("</");
      if (isClosing) {
        if (SELF_CLOSING_TAGS.has(tagName)) return "";
        return `</${tagName}>`;
      }

      const attrs = sanitizeTagAttributes(tagName, rawAttrs ?? "");
      if (SELF_CLOSING_TAGS.has(tagName)) return `<${tagName}${attrs}>`;
      return `<${tagName}${attrs}>`;
    }
  );
}
