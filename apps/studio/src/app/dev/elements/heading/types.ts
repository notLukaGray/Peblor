import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type HeadingVariantDefaults = Omit<
  Extract<ElementBlock, { type: "elementHeading" }>,
  "type"
> & {
  animation: PbImageAnimationDefaults;
};

export type HeadingVariantKey = "display" | "section" | "label";

export type PersistedHeadingDefaults = {
  v: 1;
  defaultVariant: HeadingVariantKey;
  variants: Record<HeadingVariantKey, HeadingVariantDefaults>;
};
