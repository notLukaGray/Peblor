import type { CSSProperties } from "react";
import type {
  ElementBlock,
  ElementLayout,
  ThemeString,
} from "@pb/contracts/peblor/core/peblor-schemas";
import type { ElementLayoutTransformOptions } from "@pb/core/layout";
import type { LinkState } from "../Shared/GraphicLinkWrapper";
import type { VectorShape } from "@pb/contracts/types";

export type ElementVectorProps = Extract<ElementBlock, { type: "elementVector" }>;

export type VectorLayoutProps = Pick<
  ElementLayoutTransformOptions,
  "width" | "height" | "align" | "marginTop" | "marginBottom" | "marginLeft" | "marginRight"
> & {
  zIndex?: number;
  constraints?: ElementLayout["constraints"];
};

export type VectorLink = ElementVectorProps["link"];
export type VectorStrokeGroup = NonNullable<ElementVectorProps["strokeGroup"]>;

export type SvgRenderContext = {
  state: LinkState;
  shapes: VectorShape[];
  pathShapes: (VectorShape & { type: "path"; d: string })[];
  strokeGroup: VectorStrokeGroup | null;
  resolve: (ref: ThemeString | undefined) => string | undefined;
  resolveFill: (defaultFillRef: ThemeString | undefined) => string | undefined;
  resolveStroke: (defaultStrokeRef: ThemeString | undefined) => string | undefined;
  resolveHoverFill: (defaultFillRef: ThemeString | undefined) => string | undefined;
  resolvedStroke: string | undefined;
  strokeTransitionStyle: CSSProperties | undefined;
  needsOpacityTransition: boolean;
  opacityTransitionStyle: CSSProperties | undefined;
};
