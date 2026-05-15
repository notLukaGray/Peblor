import type { ThemeString } from "@pb/contracts/types";
import type { LinkState } from "../Shared/GraphicLinkWrapper";
import type { VectorLink } from "./element-vector-types";

export function makeResolveFill(
  state: LinkState,
  link: VectorLink,
  resolve: (ref: ThemeString | undefined) => string | undefined
): (defaultFillRef: ThemeString | undefined) => string | undefined {
  return (defaultFillRef) => {
    if (state.disabled && link?.disabledFill) return resolve(link.disabledFill);
    if (state.active && link?.activeFill) return resolve(link.activeFill);
    if (state.hover && link?.hoverFill) return resolve(link.hoverFill);
    return resolve(defaultFillRef);
  };
}

export function makeResolveStroke(
  state: LinkState,
  link: VectorLink,
  resolve: (ref: ThemeString | undefined) => string | undefined
): (defaultStrokeRef: ThemeString | undefined) => string | undefined {
  return (defaultStrokeRef) => {
    if (!defaultStrokeRef && !link?.hoverStroke && !link?.activeStroke && !link?.disabledStroke)
      return undefined;
    if (state.disabled && link?.disabledStroke) return resolve(link.disabledStroke);
    if (state.active && link?.activeStroke) return resolve(link.activeStroke);
    if (state.hover && link?.hoverStroke) return resolve(link.hoverStroke);
    return resolve(defaultStrokeRef);
  };
}

export function makeResolveHoverFill(
  link: VectorLink,
  resolve: (ref: ThemeString | undefined) => string | undefined
): (defaultFillRef: ThemeString | undefined) => string | undefined {
  return (defaultFillRef) => (link?.hoverFill ? resolve(link.hoverFill) : resolve(defaultFillRef));
}
