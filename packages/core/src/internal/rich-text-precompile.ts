import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type { ElementBlock } from "@pb/contracts/types";
import { sanitizeRichTextMarkup } from "./rich-text-sanitize";

/** Minimal interface covering what compileMarkdown needs from the unified processor chain. */
interface MarkdownProcessor {
  processSync(content: string): { value: { toString(): string } };
}

let _processor: MarkdownProcessor | undefined;

function getProcessor(): MarkdownProcessor {
  if (!_processor) {
    _processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify);
  }
  return _processor;
}

function compileMarkdown(content: string): string {
  const result = getProcessor().processSync(content);
  return sanitizeRichTextMarkup(String(result));
}

/**
 * Compile inline markdown text to HTML, stripping the outer `<p>` wrapper
 * that unified/rehype adds. Single-paragraph input produces inline HTML
 * safe for use inside existing `<p>` or heading tags.
 * Multi-paragraph input (double newline) preserves internal `<p>` boundaries
 * — callers should switch their wrapper to `<div>` in that case.
 */
function compileInlineMarkdown(text: string): string {
  const html = compileMarkdown(text);
  // Single paragraph: strip outer <p> wrapper for inline use
  if (html.startsWith("<p>") && html.endsWith("</p>")) {
    const inner = html.slice(3, -4);
    // Guard: only strip if there are no other <p> tags inside (multi-paragraph)
    if (!inner.includes("<p>") && !inner.includes("</p>")) {
      return inner;
    }
  }
  // Multi-paragraph or complex output: keep all tags
  return html;
}

/**
 * Returns true when the compiled markup contains block-level paragraph tags.
 * Components use this to decide whether to swap their `<p>` wrapper for `<div>`.
 */
export function hasMultiParagraphMarkup(markup: string): boolean {
  return markup.includes("<p>") || markup.includes("</p>");
}

/** Element types whose text content is compiled from markdown to HTML at build time. */
const MARKDOWN_ELEMENT_TYPES = new Set(["elementBody", "elementHeading"]);

/**
 * Per-element rich text precompilation for use with `transformElementsInSectionsCombined`.
 * Compiles `content` / `text` (markdown) into `markup` (HTML) when `markup` is not already set.
 * All non-text element types pass through unchanged.
 */
export function precompileRichTextOnSingleElement(el: ElementBlock): ElementBlock {
  const rec = el as Record<string, unknown>;

  if (el.type === "elementRichText") {
    const hasMarkup = typeof rec.markup === "string" && String(rec.markup).trim().length > 0;
    const hasContent = typeof rec.content === "string" && String(rec.content).trim().length > 0;
    if (hasMarkup || !hasContent) return el;
    return { ...rec, markup: compileMarkdown(rec.content as string) } as ElementBlock;
  }

  if (MARKDOWN_ELEMENT_TYPES.has(el.type)) {
    const hasMarkup = typeof rec.markup === "string" && String(rec.markup).trim().length > 0;
    const text = typeof rec.text === "string" ? (rec.text as string) : "";
    if (hasMarkup || !text.trim()) return el;
    return { ...rec, markup: compileInlineMarkdown(text) } as ElementBlock;
  }

  return el;
}
