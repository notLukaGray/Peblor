"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  type HarmonyFit,
  type InferredHarmony,
  contrastPair,
  wcagContrastTooltipLines,
} from "@/app/theme/palette-suggest";
import { M1_TOKEN_IDS, type M1TokenId } from "@/app/theme/pb-color-tokens";

const HARMONY_LABELS: Record<InferredHarmony, string> = {
  monochromatic: "Monochromatic",
  analogous: "Analogous",
  complementary: "Complementary",
  "split-complementary": "Split-complementary",
  triadic: "Triadic",
  tetradic: "Tetradic",
  unknown: "—",
};

export function HarmonyIndicator({ fit }: { fit: HarmonyFit }) {
  if (fit.confidence < 0.3 || fit.harmony === "unknown") return null;
  const pct = Math.round(fit.confidence * 100);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      <span className="text-foreground/70">{HARMONY_LABELS[fit.harmony]}</span>
      <span className="opacity-60">{pct}%</span>
    </span>
  );
}

/** WCAG level badge for a contrast ratio. */
export function WcagBadge({ ratio }: { ratio: number }) {
  if (ratio >= 7) {
    return (
      <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
        AAA
      </span>
    );
  }
  if (ratio >= 4.5) {
    return (
      <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        AA
      </span>
    );
  }
  if (ratio >= 3) {
    return (
      <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        A
      </span>
    );
  }
  return (
    <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
      ✗
    </span>
  );
}

function WcagHoverBubble({
  fg,
  bg,
  title,
  children,
}: {
  fg: string;
  bg: string;
  title: string;
  children: ReactNode;
}) {
  const lines = wcagContrastTooltipLines(contrastPair(fg, bg));
  return (
    <div className="group/wcag relative w-fit max-w-full overflow-visible">
      {children}
      {lines ? (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 block w-max min-w-48 max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-2 font-mono text-[10px] leading-snug text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/wcag:opacity-100"
          role="tooltip"
        >
          <span className="mb-1 block border-b border-border/60 pb-1 text-[9px] uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          {lines.map((line, index) => (
            <span key={index} className="block">
              {line}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function WcagLinkBubble({ v }: { v: Record<M1TokenId, string> }) {
  const linesDef = wcagContrastTooltipLines(contrastPair(v["--pb-link"], v["--pb-secondary"]));
  const linesHov = wcagContrastTooltipLines(
    contrastPair(v["--pb-link-hover"], v["--pb-secondary"])
  );
  return (
    <span className="group/wlink relative inline-block overflow-visible">
      <a
        href="#"
        className="underline decoration-2 underline-offset-4"
        style={{ color: "var(--pb-link)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--pb-link-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--pb-link)";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.color = "var(--pb-link-active)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.color = "var(--pb-link-hover)";
        }}
        onClick={(e) => e.preventDefault()}
      >
        Call to action link
      </a>
      {linesDef || linesHov ? (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 block w-max min-w-52 max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-2 font-mono text-[10px] leading-snug text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/wlink:opacity-100">
          {linesDef ? (
            <>
              <span className="mb-1 block border-b border-border/60 pb-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                Link · default
              </span>
              {linesDef.map((line, index) => (
                <span key={`d-${index}`} className="block">
                  {line}
                </span>
              ))}
            </>
          ) : null}
          {linesHov ? (
            <>
              <span
                className={`block text-[9px] uppercase tracking-wide text-muted-foreground ${linesDef ? "mt-2 border-t border-border/60 pt-2" : "mb-1 border-b border-border/60 pb-1"}`}
              >
                Link · hover vs surface
              </span>
              {linesHov.map((line, index) => (
                <span key={`h-${index}`} className="block">
                  {line}
                </span>
              ))}
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function PreviewColumn({ label, v }: { label: string; v: Record<M1TokenId, string> }) {
  const vars = useMemo((): CSSProperties => {
    const out: Record<string, string> = {};
    for (const id of M1_TOKEN_IDS) out[id] = v[id];
    return out as CSSProperties;
  }, [v]);

  return (
    <div
      className="overflow-visible rounded-lg border border-border/80"
      style={{ ...vars, background: "var(--pb-secondary)", color: "var(--pb-on-secondary)" }}
    >
      <div className="border-b border-border/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="space-y-3 overflow-visible p-3">
        <div className="flex flex-wrap gap-2 overflow-visible">
          <WcagHoverBubble
            fg={v["--pb-on-primary"]}
            bg={v["--pb-primary"]}
            title="On primary / primary"
          >
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--pb-primary)", color: "var(--pb-on-primary)" }}
            >
              Primary
            </button>
          </WcagHoverBubble>
          <WcagHoverBubble
            fg={v["--pb-on-accent"]}
            bg={v["--pb-accent"]}
            title="On accent / accent"
          >
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--pb-accent)", color: "var(--pb-on-accent)" }}
            >
              Accent
            </button>
          </WcagHoverBubble>
          <WcagHoverBubble
            fg={v["--pb-on-secondary"]}
            bg={v["--pb-secondary"]}
            title="Outline / surface"
          >
            <span
              className="inline-flex rounded-md border-2 px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: "var(--pb-on-secondary)", color: "var(--pb-on-secondary)" }}
            >
              Ghost
            </span>
          </WcagHoverBubble>
        </div>
        <WcagHoverBubble
          fg={v["--pb-on-secondary"]}
          bg={v["--pb-secondary"]}
          title="Body / surface"
        >
          <p className="max-w-prose text-sm leading-relaxed">
            Body copy on the secondary surface — hover this block for contrast. Shorter labels and
            large type can pass with lower ratios than dense paragraph text.
          </p>
        </WcagHoverBubble>
        <p className="text-xs opacity-80">
          Muted-style line (same ink, reduced emphasis for hierarchy only).
        </p>
        <p className="text-sm">
          Inline copy with a <WcagLinkBubble v={v} /> in context.
        </p>
      </div>
    </div>
  );
}
