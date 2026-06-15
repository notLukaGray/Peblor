import type { ElementBlock } from "@pb/contracts";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

export type ButtonVariantDefaults = Omit<
  Extract<ElementBlock, { type: "elementButton" }>,
  "type"
> & {
  animation: PbImageAnimationDefaults;
};

export type ButtonVariantKey = "default" | "accent" | "ghost" | "text" | "glass";

export type PersistedButtonDefaults = {
  v: 1;
  defaultVariant: ButtonVariantKey;
  variants: Record<ButtonVariantKey, ButtonVariantDefaults>;
};
