import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import {
  getElementLayoutStyle,
  getElementTransformStyle,
  stripResponsiveLayoutKeys,
} from "@pb/core/layout";
import { lowerThemeStringToCss } from "../../theme/theme-string";
import type { ServerElementComponentProps } from "../server-element-types";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";

type Props = Extract<ElementBlock, { type: "elementDivider" }>;

export function ServerElementDivider({
  orientation = "horizontal",
  thickness = "1px",
  color = "currentColor",
  style = "solid",
  length = "100%",
  rotate,
  flipHorizontal,
  flipVertical,
  stateStyleClass,
  responsiveStyleClass,
  responsiveLayoutKeys,
  ...layout
}: Props &
  Pick<
    ServerElementComponentProps,
    "stateStyleClass" | "responsiveStyleClass" | "responsiveLayoutKeys"
  >) {
  const isHorizontal = orientation !== "vertical";
  const resolvedLength = resolveResponsiveValue(length, true);
  const resolvedColor = lowerThemeStringToCss(color) ?? "currentColor";
  const lineStyle: CSSProperties = isHorizontal
    ? style === "solid"
      ? { width: resolvedLength, height: thickness, backgroundColor: resolvedColor }
      : { width: resolvedLength, height: 0, borderTop: `${thickness} ${style} ${resolvedColor}` }
    : style === "solid"
      ? { width: thickness, height: resolvedLength, backgroundColor: resolvedColor }
      : { width: 0, height: resolvedLength, borderLeft: `${thickness} ${style} ${resolvedColor}` };

  const filteredLayout = stripResponsiveLayoutKeys(
    layout,
    responsiveStyleClass ? responsiveLayoutKeys : undefined
  );
  const layoutStyle = getElementLayoutStyle(filteredLayout);
  const innerStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: "visible",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...getElementTransformStyle({ rotate, flipHorizontal, flipVertical }),
  };

  return (
    <div
      className={["shrink-0 m-0", stateStyleClass, responsiveStyleClass].filter(Boolean).join(" ")}
      style={layoutStyle}
    >
      <div style={innerStyle}>
        <span aria-hidden style={{ display: "block", ...lineStyle }} />
      </div>
    </div>
  );
}
