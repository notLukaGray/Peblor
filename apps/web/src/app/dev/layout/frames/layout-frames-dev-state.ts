import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import type { StyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";

export const FRAME_GUIDELINE_KEYS = [
  "frameGapWhenUnset",
  "frameRowGapWhenUnset",
  "frameColumnGapWhenUnset",
  "frameAlignItemsDefault",
  "frameFlexDirectionDefault",
  "frameJustifyContentDefault",
  "framePaddingDefault",
  "frameFlexWrapDefault",
  "frameBorderRadiusDefault",
] as const;

export type FrameGuidelineKey = (typeof FRAME_GUIDELINE_KEYS)[number];

export type LayoutFramesSlices = {
  guidelines: Pick<PbContentGuidelines, FrameGuidelineKey>;
  locks: Record<FrameGuidelineKey, boolean>;
};

export function pickLayoutFramesSlices(style: StyleToolPersistedV3): LayoutFramesSlices {
  return {
    guidelines: {
      frameGapWhenUnset: style.guidelines.frameGapWhenUnset,
      frameRowGapWhenUnset: style.guidelines.frameRowGapWhenUnset,
      frameColumnGapWhenUnset: style.guidelines.frameColumnGapWhenUnset,
      frameAlignItemsDefault: style.guidelines.frameAlignItemsDefault,
      frameFlexDirectionDefault: style.guidelines.frameFlexDirectionDefault,
      frameJustifyContentDefault: style.guidelines.frameJustifyContentDefault,
      framePaddingDefault: style.guidelines.framePaddingDefault,
      frameFlexWrapDefault: style.guidelines.frameFlexWrapDefault,
      frameBorderRadiusDefault: style.guidelines.frameBorderRadiusDefault,
    },
    locks: {
      frameGapWhenUnset: style.locks.frameGapWhenUnset,
      frameRowGapWhenUnset: style.locks.frameRowGapWhenUnset,
      frameColumnGapWhenUnset: style.locks.frameColumnGapWhenUnset,
      frameAlignItemsDefault: style.locks.frameAlignItemsDefault,
      frameFlexDirectionDefault: style.locks.frameFlexDirectionDefault,
      frameJustifyContentDefault: style.locks.frameJustifyContentDefault,
      framePaddingDefault: style.locks.framePaddingDefault,
      frameFlexWrapDefault: style.locks.frameFlexWrapDefault,
      frameBorderRadiusDefault: style.locks.frameBorderRadiusDefault,
    },
  };
}

export function mergeLayoutFramesSlices(
  style: StyleToolPersistedV3,
  slices: LayoutFramesSlices
): StyleToolPersistedV3 {
  return {
    ...style,
    guidelines: { ...style.guidelines, ...slices.guidelines },
    locks: { ...style.locks, ...slices.locks },
  };
}
