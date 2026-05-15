"use client";

import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { resolveThemeString } from "@/peblor/theme/theme-string";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";

type Props = Extract<ElementBlock, { type: "elementDivider" }>;

export function ElementDivider({
  orientation = "horizontal",
  thickness = "1px",
  color = "currentColor",
  style = "solid",
  length = "100%",
  rotate,
  flipHorizontal,
  flipVertical,
  interactions,
  ...layout
}: Props) {
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const isHorizontal = orientation !== "vertical";
  const resolvedLength = resolveResponsiveValue(length, isMobile) ?? "100%";
  const resolvedColor = resolveThemeString(color, themeMode) ?? "currentColor";

  const lineStyle: CSSProperties = isHorizontal
    ? style === "solid"
      ? {
          width: resolvedLength,
          height: thickness,
          backgroundColor: resolvedColor,
        }
      : {
          width: resolvedLength,
          height: 0,
          borderTop: `${thickness} ${style} ${resolvedColor}`,
        }
    : style === "solid"
      ? {
          width: thickness,
          height: resolvedLength,
          backgroundColor: resolvedColor,
        }
      : {
          width: 0,
          height: resolvedLength,
          borderLeft: `${thickness} ${style} ${resolvedColor}`,
        };

  return (
    <ElementLayoutWrapper
      layout={layout as Parameters<typeof ElementLayoutWrapper>[0]["layout"]}
      transform={{ rotate, flipHorizontal, flipVertical }}
      overflow="visible"
      interactions={interactions}
    >
      <span
        aria-hidden
        style={{
          display: "block",
          ...(lineStyle as CSSProperties),
        }}
      />
    </ElementLayoutWrapper>
  );
}
