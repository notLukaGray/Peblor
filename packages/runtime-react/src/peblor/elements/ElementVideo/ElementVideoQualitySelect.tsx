"use client";

import type { ElementBlock } from "@pb/contracts/types";
import { ElementVector } from "@/peblor/elements/ElementVector";
import { useVideoControlContext } from "./VideoControlContext";
import { globals } from "@pb/runtime-react/core/lib/globals";

type Props = Extract<ElementBlock, { type: "elementVideoQualitySelect" }>;

function resolveControlSize(value: Props["width"]): string | undefined {
  const resolved = Array.isArray(value) ? value[0] : value;
  return typeof resolved === "string" && resolved !== "hug" ? resolved : undefined;
}

export function ElementVideoQualitySelect({ icon, style, width, height }: Props) {
  const videoCtx = useVideoControlContext();
  if (!videoCtx || videoCtx.qualityLevels.length < 2) return null;

  const baseStyle = style as React.CSSProperties;
  const controlWidth = resolveControlSize(width) ?? "28px";
  const controlHeight = resolveControlSize(height) ?? controlWidth;

  return (
    <label
      className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden focus-within:ring-2 focus-within:ring-white/80"
      style={{
        ...baseStyle,
        width: controlWidth,
        minWidth: controlWidth,
        height: controlHeight,
        padding: 0,
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        backgroundImage: "none",
      }}
    >
      <span className="sr-only">{globals.stringsAriaLabelVideoQuality}</span>
      {icon && (
        <span className="pointer-events-none flex items-center justify-center">
          <ElementVector {...icon} ariaLabel={globals.stringsAriaLabelVideoQuality} />
        </span>
      )}
      <select
        aria-label={globals.stringsAriaLabelVideoQuality}
        value={videoCtx.selectedQuality}
        onChange={(e) => videoCtx.setSelectedQuality(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus:outline-none"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundImage: "none",
        }}
      >
        <option value="auto">Auto</option>
        {videoCtx.qualityLevels.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>
    </label>
  );
}
