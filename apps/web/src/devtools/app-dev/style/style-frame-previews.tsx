import type { CSSProperties, ReactNode } from "react";
import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { scaleSpaceForDensity, scaleSpaceShorthandForDensity } from "@pb/contracts";

const FRAME_PREVIEW_CHROME: Pick<CSSProperties, "boxSizing" | "border" | "background"> = {
  boxSizing: "border-box",
  border: "1px solid var(--border)",
  background: "transparent",
};

function normalizeGapValue(value: string | null): string | undefined {
  if (value == null) return undefined;
  const next = String(value).trim();
  return next === "" ? undefined : next;
}

function resolveFrameGapsCss(
  guidelines: PbContentGuidelines
): Pick<CSSProperties, "gap" | "rowGap" | "columnGap"> {
  const gap = normalizeGapValue(guidelines.frameGapWhenUnset);
  const rowGap = normalizeGapValue(guidelines.frameRowGapWhenUnset);
  const columnGap = normalizeGapValue(guidelines.frameColumnGapWhenUnset);
  const out: Pick<CSSProperties, "gap" | "rowGap" | "columnGap"> = {};
  if (gap) out.gap = scaleSpaceForDensity(gap);
  if (rowGap) out.rowGap = scaleSpaceForDensity(rowGap);
  if (columnGap) out.columnGap = scaleSpaceForDensity(columnGap);
  return out;
}

function frameGapWrapDirectionPreviewStyle(guidelines: PbContentGuidelines): CSSProperties {
  return {
    display: "flex",
    ...FRAME_PREVIEW_CHROME,
    flexDirection: guidelines.frameFlexDirectionDefault,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    flexWrap: guidelines.frameFlexWrapDefault,
    maxWidth: 260,
    minHeight: 48,
    overflow: "visible",
    padding: 0,
    borderRadius: 0,
    ...resolveFrameGapsCss(guidelines),
  };
}

const FRAME_PREVIEW_CELLS = ["A", "B", "C", "D", "E", "F"] as const;

function FrameSubPreviewLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 font-mono text-[10px] leading-snug text-muted-foreground">{children}</p>
  );
}

export function FramePreviewAlignItems({ guidelines }: { guidelines: PbContentGuidelines }) {
  return (
    <div>
      <FrameSubPreviewLabel>
        <strong className="text-foreground">Align-items</strong> — cross axis only (row direction).
      </FrameSubPreviewLabel>
      <div
        style={{
          display: "flex",
          ...FRAME_PREVIEW_CHROME,
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: guidelines.frameAlignItemsDefault,
          flexWrap: "nowrap",
          gap: 0,
          padding: 0,
          borderRadius: 0,
          minHeight: 72,
          maxWidth: 280,
          width: "100%",
        }}
      >
        {[["A"], ["B", "tall", "cell"], ["C"]].map((parts, index) => (
          <span
            key={parts[0]}
            className={`shrink-0 rounded border border-border/60 px-2 py-1 text-center font-mono text-[10px] leading-snug text-foreground ${index === 0 ? "bg-muted" : index === 1 ? "bg-card" : "bg-muted"}`}
            style={{ flex: "0 0 auto", width: 52 }}
          >
            {parts.map((part, partIndex) => (
              <span key={partIndex} className="block">
                {part}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FramePreviewJustifyContent({ guidelines }: { guidelines: PbContentGuidelines }) {
  return (
    <div>
      <FrameSubPreviewLabel>
        <strong className="text-foreground">Justify-content</strong> — main axis only (row, no gap).
      </FrameSubPreviewLabel>
      <div
        style={{
          display: "flex",
          ...FRAME_PREVIEW_CHROME,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: guidelines.frameJustifyContentDefault as CSSProperties["justifyContent"],
          flexWrap: "nowrap",
          gap: 0,
          padding: 0,
          borderRadius: 0,
          width: "100%",
          maxWidth: 280,
          minHeight: 52,
        }}
      >
        {(["J1", "J2", "J3"] as const).map((label, index) => (
          <span
            key={label}
            className={`shrink-0 rounded border border-border/60 px-2 py-2 text-center font-mono text-[10px] text-foreground ${index === 0 ? "bg-muted" : index === 1 ? "bg-card" : "bg-muted"}`}
            style={{ flex: "0 0 auto", width: 52 }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FramePreviewGapWrapDirection({ guidelines }: { guidelines: PbContentGuidelines }) {
  return (
    <div>
      <FrameSubPreviewLabel>
        <strong className="text-foreground">Gap / direction / wrap</strong> fallbacks.
      </FrameSubPreviewLabel>
      <div style={frameGapWrapDirectionPreviewStyle(guidelines)}>
        {FRAME_PREVIEW_CELLS.map((cell, index) => (
          <span
            key={cell}
            className={`shrink-0 rounded border border-border/60 px-2 py-1.5 text-center font-mono text-[10px] text-foreground ${index % 2 === 0 ? "bg-muted" : "bg-card"}`}
            style={{ flex: "0 0 auto", width: 56 }}
          >
            {cell}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FramePreviewPaddingRadius({ guidelines }: { guidelines: PbContentGuidelines }) {
  return (
    <div>
      <FrameSubPreviewLabel>
        <strong className="text-foreground">Padding and border-radius</strong> fallbacks.
      </FrameSubPreviewLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: "0.5rem",
          padding: scaleSpaceShorthandForDensity(guidelines.framePaddingDefault),
          borderRadius: guidelines.frameBorderRadiusDefault,
          ...FRAME_PREVIEW_CHROME,
          width: "100%",
          maxWidth: 280,
        }}
      >
        <span className="block h-8 min-w-14 rounded-sm border border-border/60 bg-muted" />
        <span className="block h-8 min-w-14 rounded-sm border border-border/60 bg-card" />
      </div>
    </div>
  );
}
