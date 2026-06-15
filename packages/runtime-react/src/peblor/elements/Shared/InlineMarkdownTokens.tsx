import type { ReactNode } from "react";

function normalizeInlineText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\\n/g, "\n");
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

/** Render inline markdown tokens as React elements.
 *  Safe for both server and client components — no hooks or browser APIs. */
export function renderInlineMarkdown(text: string): ReactNode {
  const normalized = normalizeInlineText(text);
  if (!hasMarkdownSyntax(normalized)) return normalized;

  const tokens = tokenizeInlineMarkdown(normalized);
  return tokens.map((token, index) => {
    const key = `${token.type}-${index}`;
    if (token.type === "strong")
      return (
        <strong key={key} className="font-semibold">
          {token.value}
        </strong>
      );
    if (token.type === "em")
      return (
        <em key={key} className="italic">
          {token.value}
        </em>
      );
    if (token.type === "del")
      return (
        <del key={key} className="opacity-80">
          {token.value}
        </del>
      );
    if (token.type === "code")
      return (
        <code key={key} className="rounded bg-black/15 px-1 py-0.5 font-mono text-[0.9em]">
          {token.value}
        </code>
      );
    return <span key={key}>{token.value}</span>;
  });
}
