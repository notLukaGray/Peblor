import type { ElementBlock } from "@pb/contracts/types";
import { getElementLayoutStyle } from "@pb/core/layout";

type Props = Extract<ElementBlock, { type: "elementEmbed" }>;

export function ElementEmbed({
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
}: Props) {
  const layoutStyle = getElementLayoutStyle({
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
  });

  if (!src) {
    return (
      <div className="shrink-0 m-0" style={layoutStyle}>
        <span className="text-muted-foreground text-sm" role="status">
          No embed source.
        </span>
      </div>
    );
  }

  return (
    <div className="shrink-0 m-0" style={layoutStyle}>
      <iframe
        src={src}
        title={title || "Embedded content"}
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
