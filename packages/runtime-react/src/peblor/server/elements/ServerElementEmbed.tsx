import type { ElementBlock } from "@pb/contracts/types";
import { getElementLayoutStyle, stripResponsiveLayoutKeys } from "@pb/core/layout";
import type { ServerElementComponentProps } from "../server-element-types";

type Props = Extract<ElementBlock, { type: "elementEmbed" }>;

export function ServerElementEmbed({
  src,
  title,
  allow,
  allowFullScreen,
  loading = "lazy",
  referrerPolicy,
  sandbox,
  width,
  height,
  selfAlign,
  alignY,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  constraints,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  scroll,
  hidden,
  aspectRatio,
  borderRadius,
  stateStyleClass,
  responsiveStyleClass,
  responsiveLayoutKeys,
}: Props &
  Pick<
    ServerElementComponentProps,
    "stateStyleClass" | "responsiveStyleClass" | "responsiveLayoutKeys"
  >) {
  const layoutInput = stripResponsiveLayoutKeys(
    {
      width,
      height,
      selfAlign,
      alignY,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      layer,
      constraints,
      wrapperStyle,
      opacity,
      blendMode,
      boxShadow,
      filter,
      bgBlur,
      scroll,
      hidden,
      aspectRatio,
      borderRadius,
    },
    responsiveStyleClass ? responsiveLayoutKeys : undefined
  );
  const layoutStyle = getElementLayoutStyle(layoutInput);

  const wrapperClassName = ["shrink-0 m-0", stateStyleClass, responsiveStyleClass]
    .filter(Boolean)
    .join(" ");

  if (!src) {
    return (
      <div className={wrapperClassName} style={layoutStyle}>
        <span className="text-muted-foreground text-sm" role="status">
          No embed source.
        </span>
      </div>
    );
  }

  return (
    <div className={wrapperClassName} style={layoutStyle}>
      <iframe
        src={src}
        title={title}
        allow={allow}
        allowFullScreen={allowFullScreen}
        loading={loading}
        referrerPolicy={referrerPolicy ?? undefined}
        sandbox={sandbox}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
