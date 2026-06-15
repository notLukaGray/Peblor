import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { getElementLayoutStyle, stripResponsiveLayoutKeys } from "@pb/core/layout";
import { lowerThemeStyleObject } from "../../theme/theme-string";
import type { ServerElementComponentProps } from "../server-element-types";

type Props = Extract<ElementBlock, { type: "elementSpacer" }>;

export function ServerElementSpacer({
  height,
  width,
  selfAlign,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  constraints,
  wrapperStyle,
  serverIsMobile,
  stateStyleClass,
  responsiveStyleClass,
  responsiveLayoutKeys,
}: Props &
  Pick<
    ServerElementComponentProps,
    "serverIsMobile" | "stateStyleClass" | "responsiveStyleClass" | "responsiveLayoutKeys"
  >) {
  const layoutInput = stripResponsiveLayoutKeys(
    {
      height,
      width,
      selfAlign,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      layer,
      constraints,
      wrapperStyle: lowerThemeStyleObject(wrapperStyle as Record<string, unknown> | undefined),
    },
    responsiveStyleClass ? responsiveLayoutKeys : undefined
  );
  const layoutStyle = getElementLayoutStyle(
    layoutInput as Parameters<typeof getElementLayoutStyle>[0],
    serverIsMobile
  );
  const innerStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    minWidth: 0,
    flex: 1,
  };

  return (
    <div
      className={["shrink-0 m-0", stateStyleClass, responsiveStyleClass].filter(Boolean).join(" ")}
      style={layoutStyle}
    >
      <div style={innerStyle} />
    </div>
  );
}
