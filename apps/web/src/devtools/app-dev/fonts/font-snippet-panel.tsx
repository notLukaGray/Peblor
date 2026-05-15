"use client";

import { useState } from "react";

type SnippetTab = "fonts" | "scale";

export function FontSnippetPanel({
  fontSnippet,
  scaleSnippet,
}: {
  fontSnippet: string;
  scaleSnippet: string;
}) {
  const [active, setActive] = useState<SnippetTab>("fonts");
  const [copied, setCopied] = useState(false);
  const tabs: { id: SnippetTab; label: string }[] = [
    { id: "fonts", label: "Fonts" },
    { id: "scale", label: "Scale" },
  ];
  const snippet = active === "scale" ? scaleSnippet : fontSnippet;
  const destFile = active === "scale" ? "src/app/fonts/type-scale.ts" : "src/app/fonts/config.ts";

  const copy = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card/20 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide">
          Code to paste
        </p>
        <div className="flex gap-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                active === id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <pre className="overflow-x-auto rounded bg-muted/40 p-3 text-[11px] font-mono text-foreground leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
        {snippet}
      </pre>

      <button
        type="button"
        onClick={copy}
        className="w-full rounded border border-border px-3 py-2 text-sm font-mono text-foreground hover:bg-muted transition-colors"
      >
        {copied ? "Copied!" : "Copy code"}
      </button>

      <p className="text-[10px] text-muted-foreground">
        Paste into <code className="font-mono text-[0.95em]">{destFile}</code> and save; the running
        dev server will pick it up.
      </p>
    </div>
  );
}
