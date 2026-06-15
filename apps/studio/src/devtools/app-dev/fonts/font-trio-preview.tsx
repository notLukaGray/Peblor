"use client";

import { useState } from "react";
import type { TypeScaleConfig } from "@/app/fonts/type-scale";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import type { LocalPreviewRuntime } from "@/app/dev/fonts/use-local-font-previews";
import type { SlotName, SlotPreviewMode, SlotState } from "./font-dev-persistence";
import { TrioPreviewInner } from "./font-trio-preview-inner";
import { type TrioPreviewBreakpoint } from "./font-trio-preview-helpers";

export function TrioInUnisonPreview({
  configs,
  effectiveSlotPreviewMode,
  previews,
  fontList,
  typeScale,
  bodyPhrase,
}: {
  configs: Record<SlotName, SlotState>;
  effectiveSlotPreviewMode: Record<SlotName, SlotPreviewMode>;
  previews: Partial<Record<SlotName, LocalPreviewRuntime>>;
  fontList: Record<string, BunnyFontMeta>;
  typeScale: TypeScaleConfig;
  bodyPhrase: string;
}) {
  const [trioBp, setTrioBp] = useState<TrioPreviewBreakpoint>("desktop");
  const secondary = configs.secondary;

  return (
    <section className="mt-8 rounded-lg border border-border bg-card/20 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide">
          Trio preview
        </p>
        <div className="flex gap-1">
          {(["desktop", "mobile"] as TrioPreviewBreakpoint[]).map((breakpoint) => (
            <button
              key={breakpoint}
              type="button"
              onClick={() => setTrioBp(breakpoint)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${trioBp === breakpoint ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {breakpoint}
            </button>
          ))}
        </div>
      </div>

      <div
        className={
          trioBp === "mobile"
            ? "mx-auto w-full max-w-[390px] rounded-lg border border-dashed border-border/80 bg-background/40 p-4 pt-10"
            : "w-full pt-10"
        }
      >
        {trioBp === "mobile" ? (
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wide mb-4">
            390px column · mobile type sizes from the scale
          </p>
        ) : null}
        <TrioPreviewInner
          configs={configs}
          effectiveSlotPreviewMode={effectiveSlotPreviewMode}
          previews={previews}
          fontList={fontList}
          typeScale={typeScale}
          bodyPhrase={bodyPhrase}
          trioBp={trioBp}
        />
      </div>

      {secondary.italic ? (
        <p className="mt-4 text-[10px] text-muted-foreground">
          Secondary slot currently uses italic mode.
        </p>
      ) : null}
    </section>
  );
}
