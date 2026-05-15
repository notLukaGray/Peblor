import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type VideoVariantDefaults = Omit<Extract<ElementBlock, { type: "elementVideo" }>, "type"> & {
  animation: PbImageAnimationDefaults;
};

export type VideoVariantKey = "inline" | "compact" | "fullcover" | "hero";

export type PersistedVideoDefaults = {
  v: 1;
  defaultVariant: VideoVariantKey;
  variants: Record<VideoVariantKey, VideoVariantDefaults>;
};
