import type { CSSProperties } from "react";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/types";
import {
  getElementLayoutStyle,
  getLayoutRotateFlipStyle,
  stripResponsiveLayoutKeys,
} from "@pb/core/layout";
import { getBodyTypographyClass, DEFAULT_BODY_LEVEL } from "@pb/core/typography";
import { sanitizeRichTextMarkup } from "@pb/runtime-react/core/lib/sanitize-rich-text";
import type { ServerElementComponentProps } from "../server-element-types";
import { renderInlineMarkdown } from "../../elements/Shared/InlineMarkdownTokens";

type Props = Extract<ElementBlock, { type: "elementRichText" }>;

export function ServerElementRichText({
  content,
  markup,
  level = DEFAULT_BODY_LEVEL,
  selfAlign,
  textAlign,
  width,
  height,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  wordWrap = true,
  rotate,
  flipHorizontal,
  flipVertical,
  serverIsMobile: _serverIsMobile,
  stateStyleClass,
  responsiveStyleClass,
  responsiveNeedsContainer,
  responsiveLayoutKeys,
  ...rest
}: Props &
  Pick<
    ServerElementComponentProps,
    | "serverIsMobile"
    | "stateStyleClass"
    | "responsiveStyleClass"
    | "responsiveNeedsContainer"
    | "responsiveLayoutKeys"
  >) {
  const resolvedLevel = (Array.isArray(level) ? level[0] : level) ?? DEFAULT_BODY_LEVEL;
  const typographyClass = getBodyTypographyClass(resolvedLevel as ElementBodyVariant);

  const blockStyle: CSSProperties = {
    ...getElementLayoutStyle(
      stripResponsiveLayoutKeys(
        {
          width,
          height,
          selfAlign,
          textAlign,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          ...rest,
        },
        responsiveStyleClass ? responsiveLayoutKeys : undefined
      )
    ),
    ...getLayoutRotateFlipStyle({ rotate, flipHorizontal, flipVertical }),
    ...(responsiveNeedsContainer ? { containerType: "inline-size" as const } : {}),
  };
  const multilineAlign = textAlign ?? selfAlign;
  if (multilineAlign)
    blockStyle.textAlign = multilineAlign as "left" | "right" | "center" | "justify";
  blockStyle.whiteSpace = wordWrap ? "normal" : "nowrap";
  if (!wordWrap) blockStyle.overflow = "hidden";
  blockStyle.textOverflow = wordWrap ? undefined : "ellipsis";

  // Fast path: pipeline precompiled markup into HTML
  const rawHtml = typeof markup === "string" && markup.trim() ? markup : undefined;
  const safeMarkup = rawHtml ? sanitizeRichTextMarkup(rawHtml) : undefined;

  if (safeMarkup) {
    return (
      <div
        className={["shrink-0", stateStyleClass, responsiveStyleClass].filter(Boolean).join(" ")}
        style={blockStyle}
      >
        <div
          className={`pb-rich-text m-0 block ${typographyClass} **:max-w-full`}
          dangerouslySetInnerHTML={{ __html: safeMarkup }}
        />
      </div>
    );
  }

  // Fallback: content wasn't precompiled (modal/overlay path).
  // Use inline markdown rendering for server-side output.
  const textContent = typeof content === "string" ? content : "";
  return (
    <div
      className={["shrink-0", stateStyleClass, responsiveStyleClass].filter(Boolean).join(" ")}
      style={blockStyle}
    >
      <div className={`pb-rich-text m-0 block ${typographyClass} **:max-w-full`}>
        {renderInlineMarkdown(textContent)}
      </div>
    </div>
  );
}
