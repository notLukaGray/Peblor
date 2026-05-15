import type { ElementBlock } from "@pb/contracts";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** True when `ElementRenderer` will mount `ElementExitWrapper` (preset exit or explicit exit motion JSON). */
export function blockNeedsExitPresence(block: ElementBlock): boolean {
  const b = block as {
    exitPreset?: string;
    motionTiming?: {
      exitPreset?: string;
      exitMotion?: { exit?: unknown };
    };
  };
  if (isNonEmptyString(b.exitPreset)) return true;
  const mt = b.motionTiming;
  if (!mt || typeof mt !== "object") return false;
  if (isNonEmptyString(mt.exitPreset)) return true;
  const exit = mt.exitMotion?.exit;
  return exit != null && typeof exit === "object";
}
