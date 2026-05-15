"use client";

import { formatHex, parse } from "culori";

/** sRGB hex for native color inputs (SSR-safe). */
function hexApproxForInput(css: string): string {
  try {
    const parsed = parse(css);
    if (!parsed) return "#808080";
    return formatHex(parsed) ?? "#808080";
  } catch {
    return "#808080";
  }
}

/** Native color input over swatch; opens system picker and commits on change. */
export function NativeColorSwatch({
  cssValue,
  disabled,
  onPickHex,
  size,
  ariaLabel,
}: {
  cssValue: string;
  disabled?: boolean;
  onPickHex: (hex: string) => void;
  size: "sm" | "md" | "lg";
  ariaLabel: string;
}) {
  const hex = hexApproxForInput(cssValue);
  const box = size === "sm" ? "h-8 w-12" : size === "lg" ? "h-11 w-16" : "h-9 w-14";
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded border border-border shadow-inner ${box}`}
      style={{ backgroundColor: hex }}
    >
      <input
        type="color"
        disabled={disabled}
        className="absolute inset-0 block h-full w-full min-h-0 min-w-0 cursor-pointer opacity-0 disabled:cursor-not-allowed disabled:pointer-events-none"
        value={hex}
        onChange={(e) => onPickHex(e.target.value)}
        aria-label={ariaLabel}
      />
    </span>
  );
}
