import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type SvgVariantDefaults = Omit<Extract<ElementBlock, { type: "elementSVG" }>, "type"> & {
  animation: PbImageAnimationDefaults;
};

export type SvgVariantKey = "default" | "inline" | "badge";

export type PersistedSvgDefaults = {
  v: 1;
  defaultVariant: SvgVariantKey;
  variants: Record<SvgVariantKey, SvgVariantDefaults>;
};
