"use client";

import { Children, isValidElement, useMemo, type CSSProperties, type ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/peblor/core/peblor-schemas";
import { getElementLayoutStyle } from "@pb/core/layout";
import { sanitizeRichTextMarkup } from "@pb/runtime-react/core/lib/sanitize-rich-text";
import { getBodyTypographyClass, DEFAULT_BODY_LEVEL } from "@pb/core/typography";

import "highlight.js/styles/github-dark.min.css";

type Props = Extract<ElementBlock, { type: "elementRichText" }>;

function isExternalUrl(href: string | undefined): boolean {
  if (!href) return false;
  return href.startsWith("http") || href.startsWith("//");
}

/** Page-builder rich text using react-markdown + remark-gfm (CommonMark + GFM). */
export function ElementRichText({
  content,
  markup,
  level = DEFAULT_BODY_LEVEL,
  align,
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
      align,
      textAlign,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      ...rest,
    }),
  };
  const multilineAlign = textAlign ?? align;
  if (multilineAlign)
    blockStyle.textAlign = multilineAlign as "left" | "right" | "center" | "justify";
  blockStyle.whiteSpace = wordWrap ? "normal" : "nowrap";
  if (!wordWrap) blockStyle.overflow = "hidden";
  blockStyle.textOverflow = wordWrap ? undefined : "ellipsis";
  const hasMarkup = typeof markup === "string" && markup.trim().length > 0;
  const safeMarkup = useMemo(() => sanitizeRichTextMarkup(markup), [markup]);

  return (
    <div className="shrink-0" style={blockStyle}>
      {hasMarkup && safeMarkup ? (
        <div
          className={`pb-rich-text m-0 block ${typographyClass} **:max-w-full`}
          dangerouslySetInnerHTML={{ __html: safeMarkup }}
        />
      ) : (
        <div className={`pb-rich-text m-0 block ${typographyClass} **:max-w-full`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              p: ({ children }) => (
                <span className="block m-0 [&+&]:mt-(--pb-rich-text-p-gap)">{children}</span>
              ),
              a: ({ href, children, ...props }) => (
                <a
                  href={href}
                  className="underline hover:no-underline"
                  target={isExternalUrl(href) ? "_blank" : undefined}
                  rel={isExternalUrl(href) ? "noopener noreferrer" : undefined}
                  {...props}
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              h1: ({ children }) => (
                <span className="block text-2xl font-bold first:mt-0 mt-(--pb-rich-text-h1-mt) mb-(--pb-rich-text-h1-mb)">
                  {children}
                </span>
              ),
              h2: ({ children }) => (
                <span className="block text-xl font-bold first:mt-0 mt-(--pb-rich-text-h2-mt) mb-(--pb-rich-text-h2-mb)">
                  {children}
                </span>
              ),
              h3: ({ children }) => (
                <span className="block text-lg font-bold first:mt-0 mt-(--pb-rich-text-h3-mt) mb-(--pb-rich-text-h3-mb)">
                  {children}
                </span>
              ),
              code: ({ className, children, ...props }) =>
                className ? (
                  <code
                    className={`block text-sm overflow-x-auto p-3 rounded-(--pb-rich-text-code-radius) font-mono [&.hljs]:p-3 [&.hljs]:text-[13px] [&.hljs]:leading-relaxed ${className}`}
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code className="rounded bg-black/20 px-1 py-0.5 text-sm font-mono" {...props}>
                    {children}
                  </code>
                ),
              pre: ({ children }) => {
                const codeEl = Children.only(children) as ReactElement<{
                  className?: string;
                }> | null;
                const lang =
                  isValidElement(codeEl) && codeEl.props?.className?.match(/language-(\w+)/)?.[1];
                return (
                  <div className="my-(--pb-rich-text-pre-my) rounded-(--pb-rich-text-code-radius) overflow-hidden border border-white/10 bg-[#0d1117]">
                    {lang && (
                      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-white/60">
                          {lang}
                        </span>
                      </div>
                    )}
                    <pre className="block my-0 overflow-x-auto p-0 [&>code]:rounded-none! [&>code]:border-0!">
                      {children}
                    </pre>
                  </div>
                );
              },
              blockquote: ({ children }) => (
                <span className="block border-l-2 border-current pl-3 my-(--pb-rich-text-bq-my) opacity-90">
                  {children}
                </span>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside my-(--pb-rich-text-list-my) space-y-0.5">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside my-(--pb-rich-text-list-my) space-y-0.5">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="[&>p]:inline">{children}</li>,
              hr: () => <hr className="border-current opacity-30 my-(--pb-rich-text-hr-my)" />,
              del: ({ children }) => <del className="opacity-80">{children}</del>,
              table: ({ children }) => (
                <div className="overflow-x-auto my-(--pb-rich-text-list-my)">
                  <table className="border-collapse border border-current text-sm w-full min-w-48">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-black/20">{children}</thead>,
              th: ({ children }) => (
                <th className="border border-current px-2 py-1 text-left font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => <td className="border border-current px-2 py-1">{children}</td>,
              tr: ({ children }) => <tr>{children}</tr>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              input: ({ checked, ...props }) => (
                <input
                  type="checkbox"
                  checked={checked ?? false}
                  readOnly
                  className="mr-2 align-middle"
                  {...props}
                />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
