import { Suspense, lazy } from "react";

const LazyMarkdown = lazy(async () => {
  const [{ default: ReactMarkdown }, { default: remarkGfm }] = await Promise.all([
    import("react-markdown"),
    import("remark-gfm"),
  ]);

  function MarkdownInline({ text }: { text: string }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={["p", "br", "strong", "em", "del", "code", "a"]}
        unwrapDisallowed
        skipHtml
        components={{
          p: ({ children }) => <>{children}</>,
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
          del: ({ children }) => <del className="opacity-80">{children}</del>,
          code: ({ children, ...props }) => (
            <code className="rounded bg-black/15 px-1 py-0.5 font-mono text-[0.9em]" {...props}>
              {children}
            </code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
  }

  return { default: MarkdownInline };
});

function isExternalUrl(href: string | undefined): boolean {
  if (!href) return false;
  return href.startsWith("http") || href.startsWith("//");
}

import { renderInlineMarkdown } from "./InlineMarkdownTokens";

/** Quick check: does the string look like it contains inline markdown syntax? */
function hasInlineMarkdown(text: string): boolean {
  return /[`*_~\[]/.test(text) || text.includes("\n");
}

export function InlineFormattedText({ text }: { text: string }) {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\\n/g, "\n");
  if (!hasInlineMarkdown(normalized)) return <>{normalized}</>;

  return (
    <Suspense fallback={<>{renderInlineMarkdown(normalized)}</>}>
      <LazyMarkdown text={normalized} />
    </Suspense>
  );
}
