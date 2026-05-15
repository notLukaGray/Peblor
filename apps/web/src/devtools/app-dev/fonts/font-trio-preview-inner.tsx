"use client";

import { createElement, type ReactNode, useCallback, useMemo, useState } from "react";
import type { FontWeightMap } from "@/app/fonts/config";
import type { TypeScaleConfig } from "@/app/fonts/type-scale";
import { TYPE_SCALE_LABELS, TYPE_SCALE_UTILITY_CLASS } from "@/app/fonts/type-scale";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";
import type { SlotName, SlotPreviewMode, SlotState } from "./font-dev-persistence";
import {
  compositeTextStyle,
  trioEntryMetrics,
  trioHeadingTagFromScaleKey,
  trioHoverTitle,
  TRIO_DEMO_DEFAULTS,
  type TrioDemoBlockId,
  type TrioPreviewBreakpoint,
} from "./font-trio-preview-helpers";

function TrioHoverBlock({
  children,
  scaleKey,
  onScaleKeyChange,
  slot,
  extra,
}: {
  children: ReactNode;
  scaleKey: keyof TypeScaleConfig;
  onScaleKeyChange: (key: keyof TypeScaleConfig) => void;
  slot?: SlotName;
  extra?: string;
}) {
  const [hover, setHover] = useState(false);
  const title = trioHoverTitle(scaleKey, slot, extra);
  return (
    <div
      className="group rounded border border-transparent px-3 py-2 transition-colors hover:border-border/60 hover:bg-muted/20"
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {hover ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {TYPE_SCALE_UTILITY_CLASS[scaleKey]}
          </span>
          <select
            value={scaleKey}
            onChange={(event) => onScaleKeyChange(event.target.value as keyof TypeScaleConfig)}
            className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Object.keys(TYPE_SCALE_LABELS).map((key) => (
              <option key={key} value={key}>
                {TYPE_SCALE_LABELS[key as keyof TypeScaleConfig]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {children}
    </div>
  );
}

type Props = {
  configs: Record<SlotName, SlotState>;
  effectiveSlotPreviewMode: Record<SlotName, SlotPreviewMode>;
  previews: Partial<Record<SlotName, LocalPreviewRuntime>>;
  fontList: Record<string, BunnyFontMeta>;
  typeScale: TypeScaleConfig;
  bodyPhrase: string;
  trioBp: TrioPreviewBreakpoint;
};

export function TrioPreviewInner({
  configs,
  effectiveSlotPreviewMode,
  previews,
  fontList,
  typeScale,
  bodyPhrase,
  trioBp,
}: Props) {
  const [trioDemoKeys, setTrioDemoKeys] = useState<Record<TrioDemoBlockId, keyof TypeScaleConfig>>(
    () => ({ ...TRIO_DEMO_DEFAULTS })
  );
  const setDemoKey = useCallback(
    (id: TrioDemoBlockId, key: keyof TypeScaleConfig) =>
      setTrioDemoKeys((prev) => ({ ...prev, [id]: key })),
    []
  );
  const styleForCombo = useCallback(
    (
      slot: SlotName,
      role: keyof FontWeightMap,
      italicMode: "inherit" | "normal" | "italic" = "inherit"
    ) =>
      compositeTextStyle(
        slot,
        role,
        configs,
        effectiveSlotPreviewMode,
        previews,
        fontList,
        italicMode
      ),
    [configs, effectiveSlotPreviewMode, previews, fontList]
  );

  const previewInner = useMemo(() => {
    const kickerEntry = typeScale[trioDemoKeys.kicker];
    const headlineEntry = typeScale[trioDemoKeys.headline];
    const leadEntry = typeScale[trioDemoKeys.lead];
    const bodyEntry = typeScale[trioDemoKeys.body];
    const quoteEntry = typeScale[trioDemoKeys.quote];
    const codeParaEntry = typeScale[trioDemoKeys.codePara];
    const legal = typeScale.bodySm;
    const kickerMetrics = trioEntryMetrics(kickerEntry, trioBp);
    const headlineMetrics = trioEntryMetrics(headlineEntry, trioBp);
    const leadMetrics = trioEntryMetrics(leadEntry, trioBp);
    const bodyMetrics = trioEntryMetrics(bodyEntry, trioBp);
    const quoteMetrics = trioEntryMetrics(quoteEntry, trioBp);
    const codeParaMetrics = trioEntryMetrics(codeParaEntry, trioBp);
    const headlineTag = trioHeadingTagFromScaleKey(trioDemoKeys.headline);
    const bodyLine =
      bodyPhrase.trim().split(/\r?\n/)[0]?.trim() || "The quick brown fox jumps over the lazy dog.";

    return (
      <div className="w-full space-y-8 pb-24 text-foreground">
        <TrioHoverBlock
          scaleKey={trioDemoKeys.kicker}
          onScaleKeyChange={(key) => setDemoKey("kicker", key)}
          slot="secondary"
          extra="Uppercase kicker (custom letter-spacing)"
        >
          <p
            className="text-muted-foreground"
            style={{
              ...styleForCombo("secondary", kickerEntry.fontWeightRole),
              fontSize: kickerMetrics.sz,
              lineHeight: `${kickerMetrics.lh}px`,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            {bodyLine}
          </p>
        </TrioHoverBlock>
        <TrioHoverBlock
          scaleKey={trioDemoKeys.headline}
          onScaleKeyChange={(key) => setDemoKey("headline", key)}
          slot="primary"
        >
          {createElement(
            headlineTag,
            {
              className: "m-0",
              style: {
                ...styleForCombo("primary", headlineEntry.fontWeightRole),
                fontSize: headlineMetrics.sz,
                lineHeight: `${headlineMetrics.lh}px`,
                letterSpacing: headlineEntry.letterSpacing,
              },
            },
            "Design systems feel better when type has rhythm"
          )}
        </TrioHoverBlock>
        <TrioHoverBlock
          scaleKey={trioDemoKeys.body}
          onScaleKeyChange={(key) => setDemoKey("body", key)}
          slot="primary"
        >
          <p
            style={{
              ...styleForCombo("primary", bodyEntry.fontWeightRole),
              fontSize: bodyMetrics.sz,
              lineHeight: `${bodyMetrics.lh}px`,
              letterSpacing: bodyEntry.letterSpacing,
            }}
          >
            {bodyLine}
          </p>
        </TrioHoverBlock>
        <TrioHoverBlock
          scaleKey={trioDemoKeys.quote}
          onScaleKeyChange={(key) => setDemoKey("quote", key)}
          slot="secondary"
        >
          <blockquote
            className="border-l-2 border-border pl-4"
            style={{
              ...styleForCombo("secondary", quoteEntry.fontWeightRole, "italic"),
              fontSize: quoteMetrics.sz,
              lineHeight: `${quoteMetrics.lh}px`,
              letterSpacing: quoteEntry.letterSpacing,
            }}
          >
            Typography is a visual language with a measurable cadence.
          </blockquote>
        </TrioHoverBlock>
        <TrioHoverBlock
          scaleKey={trioDemoKeys.codePara}
          onScaleKeyChange={(key) => setDemoKey("codePara", key)}
          slot="mono"
          extra="Monospace utility"
        >
          <pre
            className="overflow-x-auto rounded bg-muted/40 p-3"
            style={{
              ...styleForCombo("mono", codeParaEntry.fontWeightRole),
              fontSize: codeParaMetrics.sz,
              lineHeight: `${codeParaMetrics.lh}px`,
              letterSpacing: codeParaEntry.letterSpacing,
            }}
          >{`const title = "${bodyLine.slice(0, 24)}";\nconsole.log(title);`}</pre>
          <p
            className="mt-2 text-muted-foreground"
            style={{
              ...styleForCombo("primary", legal.fontWeightRole),
              fontSize: legal.sizeDesktop,
              lineHeight: `${legal.lineHeightDesktop}px`,
            }}
          >
            Secondary support copy uses primary body tokens for legibility.
          </p>
          <p
            className="mt-2 text-muted-foreground"
            style={{
              ...styleForCombo("primary", leadEntry.fontWeightRole),
              fontSize: leadMetrics.sz,
              lineHeight: `${leadMetrics.lh}px`,
              letterSpacing: leadEntry.letterSpacing,
            }}
          >
            A lead paragraph that previews body readability and density across desktop and mobile
            breakpoints.
          </p>
        </TrioHoverBlock>
      </div>
    );
  }, [bodyPhrase, setDemoKey, styleForCombo, trioBp, trioDemoKeys, typeScale]);

  return <>{previewInner}</>;
}
