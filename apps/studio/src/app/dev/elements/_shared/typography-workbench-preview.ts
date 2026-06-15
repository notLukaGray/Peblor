import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { ElementBlock } from "@pb/contracts";
import { resolveEntranceMotionsForElement } from "@pb/runtime-react/dev-core";
import type { PreviewFidelityMode } from "@/app/dev/workbench/preview-fidelity";

/** Merged dev runtime fields + `motionTiming.resolvedEntranceMotion` — same shape page JSON uses before render. */
export function buildResolvedTypographyWorkbenchBlock(
  draft: ImageRuntimeDraft,
  element: Record<string, unknown> & { type: ElementBlock["type"] },
  options?: {
    mode?: Extract<PreviewFidelityMode, "raw" | "guided">;
  }
): ElementBlock {
  const mode = options?.mode ?? "raw";
  const merged = mergeTypographyDevRuntime(draft, element) as Record<string, unknown>;
  const mt = merged.motionTiming as Record<string, unknown> | undefined;
  // Guided mode keeps legacy dev-helper behavior for nested previews that don't have viewport scroll.
  if (mode === "guided" && mt && typeof mt === "object") {
    merged.motionTiming = { ...mt, trigger: "onMount" };
  }
  return resolveEntranceMotionsForElement(merged) as ElementBlock;
}
