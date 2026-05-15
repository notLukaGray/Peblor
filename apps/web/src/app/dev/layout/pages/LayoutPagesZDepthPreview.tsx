"use client";

import type { StyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";

type Slices = Pick<StyleToolPersistedV3, "zIndexLayers" | "opacityScale">;

const LAYERS = [
  {
    key: "base" as const,
    label: "Base",
    fill: "var(--secondary)",
    ink: "var(--secondary-foreground)",
  },
  {
    key: "raised" as const,
    label: "Raised",
    fill: "var(--accent)",
    ink: "var(--accent-foreground)",
  },
  {
    key: "overlay" as const,
    label: "Overlay",
    fill: "var(--primary)",
    ink: "var(--primary-foreground)",
  },
  { key: "modal" as const, label: "Modal", fill: "var(--muted)", ink: "var(--foreground)" },
];

const OPACITY_KEY: Record<(typeof LAYERS)[number]["key"], keyof Slices["opacityScale"]> = {
  base: "muted",
  raised: "dimmed",
  overlay: "strong",
  modal: "full",
};

/** Taller cards lower in the stack so overlap reads as depth, not a single horizontal strip. */
const CARD_MIN_HEIGHT_REM = [8.5, 10.5, 12.5, 14.75] as const;

/**
 * Purpose-built stacking preview (not `PeblorRenderer`): tall cards, staggered heights,
 * horizontal offset, and session z-index / opacity so layer order is obvious in the workbench frame.
 */
export function LayoutPagesZDepthPreview({ slices }: { slices: Slices }) {
  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-10 pt-6">
      <p className="mb-6 max-w-xl text-center text-[10px] leading-relaxed text-muted-foreground">
        Cards are only for this dev view. Production pages still use{" "}
        <code className="font-mono text-foreground/90">PeblorRenderer</code> with absolute layer
        coordinates — here we exaggerate height and overlap so z-depth is readable inside the
        preview frame.
      </p>
      <div className="relative flex w-full flex-col items-center">
        {LAYERS.map((layer, index) => {
          const opacityKey = OPACITY_KEY[layer.key];
          const opacity = slices.opacityScale[opacityKey];
          const z = slices.zIndexLayers[layer.key];
          const minH =
            CARD_MIN_HEIGHT_REM[index] ?? CARD_MIN_HEIGHT_REM[CARD_MIN_HEIGHT_REM.length - 1];
          const pullUp = index === 0 ? 0 : -44;
          const shiftX = index * 14;
          return (
            <div
              key={layer.key}
              className="flex w-[min(100%,20rem)] flex-col justify-between rounded-xl border border-border px-5 py-4 text-left shadow-sm ring-1 ring-border/40"
              style={{
                position: "relative",
                marginTop: pullUp,
                marginLeft: shiftX,
                zIndex: z,
                opacity,
                minHeight: `${minH}rem`,
                background: layer.fill,
                color: layer.ink,
              }}
            >
              <div>
                <p className="m-0 font-mono text-[11px] font-semibold uppercase tracking-wide">
                  {layer.label}
                </p>
                <p className="mt-2 m-0 max-w-[18rem] text-[11px] leading-snug opacity-90">
                  Stacking rail sample — taller cards sit lower so overlap shows which layer sits on
                  top.
                </p>
              </div>
              <p className="m-0 mt-4 font-mono text-[10px] opacity-80">
                z-index {z} · opacity token {opacityKey} ({opacity.toFixed(2)})
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
