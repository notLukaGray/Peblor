import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type VideoTimeVariantDefaults = Omit<
  Extract<ElementBlock, { type: "elementVideoTime" }>,
  "type"
> & {
  animation: PbImageAnimationDefaults;
};

export type VideoTimeVariantKey = "default" | "compact" | "overlay";

export type PersistedVideoTimeDefaults = {
  v: 1;
  defaultVariant: VideoTimeVariantKey;
  variants: Record<VideoTimeVariantKey, VideoTimeVariantDefaults>;
};
