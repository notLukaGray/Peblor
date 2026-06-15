import type { ElementBlock } from "@pb/contracts/types";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";

type Props = Extract<ElementBlock, { type: "elementSpacer" }>;

/**
 * Fixed-height spacer element.
 *
 * Applies the block's layout props (height, margins, etc.) through ElementLayoutWrapper
 * so configured spacing values are visible in the dev preview and honoured in page renders.
 *
 * The inner div uses `flex: 1` as a secondary expansion hint when placed inside a flex
 * container that has surplus space — an explicit height wins when provided.
 */
export function ElementSpacer({
  type: _type,
  variant: _variant,
  interactions,
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
}: Props) {
  return (
    <ElementLayoutWrapper
      layout={
        {
          height,
          width,
          align: selfAlign,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          zIndex: layer,
          constraints,
          wrapperStyle,
        } as Parameters<typeof ElementLayoutWrapper>[0]["layout"]
      }
      interactions={interactions}
    >
      <div style={{ flex: 1, width: "100%", height: "100%", minWidth: 0 }} />
    </ElementLayoutWrapper>
  );
}
