"use client";

import { useRef } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import type { ElementLayoutTransformOptions } from "@pb/core/layout";
import type { ElementLayout, SectionEffect } from "@pb/contracts/peblor/core/peblor-schemas";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { resolveThemeString } from "@/peblor/theme/theme-string";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";

type Props = Extract<ElementBlock, { type: "elementInput" }>;

type LayoutProps = Pick<
  ElementLayoutTransformOptions,
  "width" | "height" | "align" | "marginTop" | "marginBottom" | "marginLeft" | "marginRight"
> & {
  zIndex?: number;
  constraints?: ElementLayout["constraints"];
  effects?: SectionEffect[];
  [key: string]: unknown;
};

export function ElementInput({
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
  effects,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  hidden,
  borderRadius,
  interactions,
  placeholder = "Search",
  ariaLabel,
  showIcon = true,
  color,
}: Props) {
  const themeMode = usePeblorThemeMode();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const layout = {
    width,
    height,
    align,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    zIndex,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter,
    hidden,
    borderRadius,
  } as LayoutProps;

  const textColor = resolveThemeString(color, themeMode) ?? "rgba(255, 255, 255, 0.85)";

  return (
    <ElementLayoutWrapper layout={layout} glassLayer="background" interactions={interactions}>
      <div
        className="flex items-center gap-3 w-full h-full px-4 cursor-text"
        style={{ color: textColor }}
        onClick={() => inputRef.current?.focus()}
      >
        {showIcon !== false && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="shrink-0"
            style={{ opacity: 0.6 }}
            aria-hidden="true"
          >
            <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M11.5 11.5L15 15"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] leading-none select-text placeholder:opacity-70 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-0"
          style={{
            padding: 0,
            color: textColor,
            caretColor: "rgba(255, 255, 255, 0.75)",
          }}
        />
      </div>
    </ElementLayoutWrapper>
  );
}
