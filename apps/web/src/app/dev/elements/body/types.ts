import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type BodyVariantDefaults = Omit<Extract<ElementBlock, { type: "elementBody" }>, "type"> & {
  animation: PbImageAnimationDefaults;
};

export type BodyVariantKey = "lead" | "standard" | "fine";

export type PersistedBodyDefaults = {
  v: 1;
  defaultVariant: BodyVariantKey;
  variants: Record<BodyVariantKey, BodyVariantDefaults>;
};
