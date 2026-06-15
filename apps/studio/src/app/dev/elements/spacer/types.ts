import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type SpacerVariantDefaults = Omit<
  Extract<ElementBlock, { type: "elementSpacer" }>,
  "type"
> & {
  animation: PbImageAnimationDefaults;
};

export type SpacerVariantKey = "sm" | "md" | "lg";

export type PersistedSpacerDefaults = {
  v: 1;
  defaultVariant: SpacerVariantKey;
  variants: Record<SpacerVariantKey, SpacerVariantDefaults>;
};
