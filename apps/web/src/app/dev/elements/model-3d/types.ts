import type { PbImageAnimationDefaults, PbResponsiveValue } from "@/app/theme/pb-builder-defaults";

/**
 * elementModel3D has a very complex schema (models, scene, camera, etc.).
 * We use a loose record type here to avoid fighting the Extract utility
 * against required nested fields, and add the animation field for the
 * shared animation lab.
 */
export type Model3dVariantDefaults = Record<string, unknown> & {
  animation: PbImageAnimationDefaults;
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

export type Model3dVariantKey = "default" | "interactive" | "showcase";

export type PersistedModel3dDefaults = {
  v: 1;
  defaultVariant: Model3dVariantKey;
  variants: Record<Model3dVariantKey, Model3dVariantDefaults>;
};
