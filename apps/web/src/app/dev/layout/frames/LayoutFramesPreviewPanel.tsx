"use client";

import { LayoutRendererPreviewCard } from "@/app/dev/layout/_shared/LayoutRendererPreviewCard";
import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import {
  FramePreviewAlignItems,
  FramePreviewGapWrapDirection,
  FramePreviewJustifyContent,
  FramePreviewPaddingRadius,
} from "@/devtools/app-dev/style/style-frame-previews";

type Props = {
  guidelines: PbContentGuidelines;
  previewBreakpoint: WorkbenchPreviewBreakpoint;
  setPreviewBreakpoint: (next: WorkbenchPreviewBreakpoint) => void;
};

/**
 * Live readouts of frame fallback tokens (gap, flex axis, padding, radius).
 * Uses the same micro-previews as the global style devtools so behavior matches
 * what authors see when editing guidelines.
 */
export function LayoutFramesPreviewPanel({
  guidelines,
  previewBreakpoint,
  setPreviewBreakpoint,
}: Props) {
  return (
    <LayoutRendererPreviewCard
      title="Frame defaults preview"
      previewBreakpoint={previewBreakpoint}
      setPreviewBreakpoint={setPreviewBreakpoint}
      previewBodyClassName="min-h-[28rem]"
      note={
        <>
          Each tile reflects the merged guidelines on the left (session + table overrides). These
          are fallbacks when frame JSON omits explicit layout fields.
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FramePreviewGapWrapDirection guidelines={guidelines} />
        <FramePreviewAlignItems guidelines={guidelines} />
        <FramePreviewJustifyContent guidelines={guidelines} />
        <FramePreviewPaddingRadius guidelines={guidelines} />
      </div>
    </LayoutRendererPreviewCard>
  );
}
