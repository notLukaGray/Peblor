"use client";

import { lazy, Suspense, useInsertionEffect, useMemo, type CSSProperties } from "react";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/peblor/core/peblor-schemas";
import { getElementLayoutStyle } from "@pb/core/layout";
import { sanitizeRichTextMarkup } from "@pb/runtime-react/core/lib/sanitize-rich-text";
import { getBodyTypographyClass, DEFAULT_BODY_LEVEL } from "@pb/core/typography";

type Props = Extract<ElementBlock, { type: "elementRichText" }>;

const LazyMarkdownRenderer = lazy(() => import("./ElementRichTextMarkdownRenderer"));

/** URL for highlight.js CSS copied to public/ at build time. Loaded only
 * when code blocks are detected in the precompiled markup. */
const HIGHLIGHT_CSS_HREF = "/highlight/github-dark.min.css";

/** Check if precompiled HTML contains syntax-highlighted code blocks. */
function hasHighlightJsClasses(html: string | undefined): boolean {
  if (!html) return false;
  return html.includes('class="hljs"') || html.includes("class=hljs");
}

/** Dynamically inject the highlight.js stylesheet when code blocks are present. */
function useHighlightJsCss(hasCodeBlocks: boolean): void {
  useInsertionEffect(() => {
    if (!hasCodeBlocks) return;
    if (document.head.querySelector(`link[href="${HIGHLIGHT_CSS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = HIGHLIGHT_CSS_HREF;
    document.head.appendChild(link);
  }, [hasCodeBlocks]);
}

/** Page-builder rich text. Uses precompiled markup (fast path) with a
 * lazy-loaded react-markdown fallback for content that bypassed the pipeline
 * (e.g. modal/overlay elements). */
export function ElementRichText({
  content,
  markup,
  level = DEFAULT_BODY_LEVEL,
  selfAlign,
  textAlign,
  width,
  height,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  wordWrap = true,
  ...rest
}: Props) {
  const resolvedLevel = (Array.isArray(level) ? level[0] : level) ?? DEFAULT_BODY_LEVEL;
  const typographyClass = getBodyTypographyClass(resolvedLevel as ElementBodyVariant);

  const blockStyle: CSSProperties = {
    ...getElementLayoutStyle({
      width,
      height,
      selfAlign,
      textAlign,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      ...rest,
    }),
  };
  const multilineAlign = textAlign ?? selfAlign;
  if (multilineAlign)
    blockStyle.textAlign = multilineAlign as "left" | "right" | "center" | "justify";
  blockStyle.whiteSpace = wordWrap ? "normal" : "nowrap";
  if (!wordWrap) blockStyle.overflow = "hidden";
  blockStyle.textOverflow = wordWrap ? undefined : "ellipsis";

  // Fast path (99.9% of cases): pipeline precompiled markup into HTML
  const rawHtml = typeof markup === "string" && markup.trim() ? markup : undefined;
  const safeMarkup = useMemo(
    () => (rawHtml ? sanitizeRichTextMarkup(rawHtml) : undefined),
    [rawHtml]
  );

  // Conditionally load highlight.js CSS when code blocks are present
  const hasCodeBlocks = useMemo(() => hasHighlightJsClasses(safeMarkup), [safeMarkup]);
  useHighlightJsCss(hasCodeBlocks);

  if (safeMarkup) {
    return (
      <div className="shrink-0" style={blockStyle}>
        <div
          className={`pb-rich-text m-0 block ${typographyClass} **:max-w-full`}
          dangerouslySetInnerHTML={{ __html: safeMarkup }}
        />
      </div>
    );
  }

  // Fallback: content wasn't precompiled (modal/overlay path).
  // Lazy-loaded so react-markdown doesn't bloat the initial route bundle.
  return (
    <div className="shrink-0" style={blockStyle}>
      <Suspense
        fallback={
          <div className={`pb-rich-text m-0 block ${typographyClass} **:max-w-full`}>
            {content ?? ""}
          </div>
        }
      >
        <LazyMarkdownRenderer content={content ?? ""} typographyClass={typographyClass} />
      </Suspense>
    </div>
  );
}
