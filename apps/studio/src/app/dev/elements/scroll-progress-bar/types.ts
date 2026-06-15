import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type ScrollProgressBarVariantDefaults = Omit<
  Extract<ElementBlock, { type: "elementScrollProgressBar" }>,
  "type"
> & {
  animation: PbImageAnimationDefaults;
};

export type ScrollProgressBarVariantKey = "default" | "minimal" | "bold";

export type PersistedScrollProgressBarDefaults = {
  v: 1;
  defaultVariant: ScrollProgressBarVariantKey;
  variants: Record<ScrollProgressBarVariantKey, ScrollProgressBarVariantDefaults>;
};
