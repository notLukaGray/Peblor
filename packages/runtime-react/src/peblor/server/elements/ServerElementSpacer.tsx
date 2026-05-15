import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { getElementLayoutStyle } from "@pb/core/layout";
import { resolveThemeStyleObject } from "../../theme/theme-string";

type Props = Extract<ElementBlock, { type: "elementSpacer" }>;

export function ServerElementSpacer({
  height,
  width,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
  wrapperStyle,
}: Props) {
  const layoutStyle = getElementLayoutStyle({
    height,
    width,
    align,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    zIndex,
    constraints,
    wrapperStyle: resolveThemeStyleObject(
      wrapperStyle as Record<string, unknown> | undefined,
      "light"
    ),
  } as Parameters<typeof getElementLayoutStyle>[0]);
  const innerStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    minWidth: 0,
    flex: 1,
  };

  return (
    <figure className="shrink-0 m-0" style={layoutStyle}>
      <div style={innerStyle} />
    </figure>
  );
}
