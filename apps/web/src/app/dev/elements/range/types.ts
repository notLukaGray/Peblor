import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type RangeVariantDefaults = Omit<Extract<ElementBlock, { type: "elementRange" }>, "type"> & {
  animation: PbImageAnimationDefaults;
};

export type RangeVariantKey = "default" | "slim" | "accent";

export type PersistedRangeDefaults = {
  v: 1;
  defaultVariant: RangeVariantKey;
  variants: Record<RangeVariantKey, RangeVariantDefaults>;
};
