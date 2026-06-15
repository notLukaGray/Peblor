import type { bgBlock } from "@pb/contracts/types";

type BgVariable = Extract<bgBlock, { type: "backgroundVariable" }>;

function bgVariableHasMotion(bg: BgVariable): boolean {
  return (bg.layers ?? []).some((layer) => Array.isArray(layer.motion) && layer.motion.length > 0);
}

export function bgVariableNeedsClient(bg: BgVariable): boolean {
  return bgVariableHasMotion(bg);
}
