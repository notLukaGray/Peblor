import type { PbImageAnimationDefaults, PbResponsiveValue } from "@/app/theme/pb-builder-defaults";

export type RiveVariantDefaults = {
  animation: PbImageAnimationDefaults;
  src: string;
  artboard?: string;
  stateMachine?: string;
  autoplay?: boolean;
  fit?: string;
  ariaLabel?: string;
  aspectRatio?: string;
  borderRadius?: PbResponsiveValue<string>;
  marginTop?: PbResponsiveValue<string>;
  marginBottom?: PbResponsiveValue<string>;
  marginLeft?: PbResponsiveValue<string>;
  marginRight?: PbResponsiveValue<string>;
  width?: PbResponsiveValue<string>;
  height?: PbResponsiveValue<string>;
  opacity?: number;
  zIndex?: number;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
};

export type RiveVariantKey = "default" | "autoplay" | "cover";

export type PersistedRiveDefaults = {
  v: 1;
  defaultVariant: RiveVariantKey;
  variants: Record<RiveVariantKey, RiveVariantDefaults>;
};
