import { Suspense, lazy, type ReactNode } from "react";

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

function normalizeInlineText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\\n/g, "\n");
}

function isExternalUrl(href: string | undefined): boolean {
  if (!href) return false;
  return href.startsWith("http") || href.startsWith("//");
}

function hasMarkdownSyntax(text: string): boolean {
  return /[`*_~\[]/.test(text) || text.includes("\n");
}

type InlineToken =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "del"; value: string }
  | { type: "code"; value: string };

function tokenizeInlineMarkdown(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|~~[^~\n]+~~|`[^`\n]+`)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, matchIndex) });
    }

    const raw = match[0];
    if (raw.startsWith("**") && raw.endsWith("**")) {
      tokens.push({ type: "strong", value: raw.slice(2, -2) });
    } else if (raw.startsWith("~~") && raw.endsWith("~~")) {
      tokens.push({ type: "del", value: raw.slice(2, -2) });
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      tokens.push({ type: "code", value: raw.slice(1, -1) });
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      tokens.push({ type: "em", value: raw.slice(1, -1) });
    } else {
      tokens.push({ type: "text", value: raw });
    }

    lastIndex = matchIndex + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

function renderSimpleInlineFallback(text: string): ReactNode {
  const tokens = tokenizeInlineMarkdown(text);
  return tokens.map((token, index) => {
    const key = `${token.type}-${index}`;
    if (token.type === "strong") return <strong key={key}>{token.value}</strong>;
    if (token.type === "em") return <em key={key}>{token.value}</em>;
    if (token.type === "del") return <del key={key}>{token.value}</del>;
    if (token.type === "code") return <code key={key}>{token.value}</code>;
    return <span key={key}>{token.value}</span>;
  });
}

export function InlineFormattedText({ text }: { text: string }) {
  const normalized = normalizeInlineText(text);
  if (!hasMarkdownSyntax(normalized)) return <>{normalized}</>;

  return (
    <Suspense fallback={<>{renderSimpleInlineFallback(normalized)}</>}>
      <LazyMarkdown text={normalized} />
    </Suspense>
  );
}
