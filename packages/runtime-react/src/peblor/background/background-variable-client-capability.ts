import type { bgBlock } from "@pb/contracts/types";

type BgVariable = Extract<bgBlock, { type: "backgroundVariable" }>;

function bgVariableHasMotion(bg: BgVariable): boolean {
  return (bg.layers ?? []).some((layer) => Array.isArray(layer.motion) && layer.motion.length > 0);
}

function isThemeStringObject(value: unknown): boolean {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  return "light" in value || "dark" in value;
}

export function bgVariableNeedsClient(bg: BgVariable): boolean {
  return (
    bgVariableHasMotion(bg) || (bg.layers ?? []).some((layer) => isThemeStringObject(layer.fill))
  );
}
