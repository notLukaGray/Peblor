import type { CSSProperties } from "react";
import type {
  PbImageAnimationDefaults,
  PbImageVariantDefaults,
} from "@/app/theme/pb-builder-defaults";

export type PreviewResolvedVariant = {
  layoutMode: PbImageVariantDefaults["layoutMode"];
  objectFit: "cover" | "contain" | "fillWidth" | "fillHeight" | "crop";
  aspectRatio?: string;
  width?: string;
  height?: string;
  constraints?: { minWidth?: string; maxWidth?: string; minHeight?: string; maxHeight?: string };
  borderRadius: string;
  objectPosition?: string;
  imageCrop?: { x: number; y: number; scale: number; focalX?: number; focalY?: number };
  align?: "left" | "center" | "right";
  alignY?: "top" | "center" | "bottom";
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  zIndex?: number;
  rotate?: number | string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  opacity?: number;
  blendMode?: string;
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
  hidden?: boolean;
  animation: PbImageAnimationDefaults;
};

export type PreviewMediaShell = {
  className: string;
  style: CSSProperties;
  mediaStyle: CSSProperties;
  slotClassName: string;
  slotStyle: CSSProperties;
  innerClassName: string;
  innerStyle: CSSProperties;
};
