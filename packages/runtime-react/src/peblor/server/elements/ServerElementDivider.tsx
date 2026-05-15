import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { getElementLayoutStyle, getElementTransformStyle } from "@pb/core/layout";
import { resolveThemeString } from "../../theme/theme-string";

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
  ...layout
}: Props) {
  const isHorizontal = orientation !== "vertical";
  const resolvedLength = Array.isArray(length) ? length[0] : length;
  const resolvedColor = resolveThemeString(color, "light") ?? "currentColor";
  const lineStyle: CSSProperties = isHorizontal
    ? style === "solid"
      ? { width: resolvedLength, height: thickness, backgroundColor: resolvedColor }
      : { width: resolvedLength, height: 0, borderTop: `${thickness} ${style} ${resolvedColor}` }
    : style === "solid"
      ? { width: thickness, height: resolvedLength, backgroundColor: resolvedColor }
      : { width: 0, height: resolvedLength, borderLeft: `${thickness} ${style} ${resolvedColor}` };

  const layoutStyle = getElementLayoutStyle(layout);
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
    <figure className="shrink-0 m-0" style={layoutStyle}>
      <div style={innerStyle}>
        <span aria-hidden style={{ display: "block", ...lineStyle }} />
      </div>
    </figure>
  );
}
