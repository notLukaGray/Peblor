"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { replaceVwUnitsWithPreviewFrameWidth } from "@/app/dev/layout/_shared/resolve-layout-preview-css";
import type { StyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";

const WIDTH_KEYS = ["narrow", "standard", "wide", "full"] as const;

type Props = {
  contentWidths: StyleToolPersistedV3["contentWidths"];
};

/**
 * Width rails are authored with `vw` for real pages. Inside the workbench card that is wrong
 * (`vw` = browser viewport). We re-resolve `vw` against the measured preview width so bars show
 * how rails compare **within this frame**, not the full window.
 */
export function LayoutSectionContentWidthFramePreview({ contentWidths }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [framePx, setFramePx] = useState(1120);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setFramePx(Math.max(1, el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={trackRef} className="space-y-2 rounded border border-dashed border-border/70 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Content width — frame preview (vw → preview width)
      </p>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Tokens on the left are unchanged in your saved style. For this card only,{" "}
        <span className="font-mono text-foreground/90">vw</span> in each token is rewritten from the
        measured preview width ({Math.round(framePx)}px) so{" "}
        <span className="font-mono">min(90vw, …)</span> behaves like “90% of this frame”, not the
        browser tab.
      </p>
      <div className="space-y-2.5">
        {WIDTH_KEYS.map((key) => {
          const raw = contentWidths[key];
          const resolved = replaceVwUnitsWithPreviewFrameWidth(raw, framePx);
          return (
            <div key={key} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-foreground">
                  {key}
                </span>
                <span className="max-w-[min(100%,28rem)] truncate font-mono text-[10px] text-muted-foreground">
                  {raw}
                </span>
              </div>
              <div className="relative h-11 w-full overflow-hidden rounded-md bg-muted/40 ring-1 ring-inset ring-border/50">
                <div
                  className="flex h-full flex-col items-center justify-center gap-0.5 bg-card px-2 text-center font-mono text-[10px] text-foreground ring-1 ring-inset ring-border/60"
                  style={{ width: "100%", maxWidth: resolved }}
                >
                  <span className="font-semibold uppercase tracking-wide">{key}</span>
                  <span className="max-w-full truncate text-[9px] opacity-80" title={resolved}>
                    {resolved}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
