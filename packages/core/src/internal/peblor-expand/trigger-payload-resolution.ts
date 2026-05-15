import type { CoreTriggerAction, PeblorAction } from "@pb/contracts";
import type { SectionWithElements, DefinitionsMap } from "./section-shapes";

function resolveTriggerPayload(payload: unknown, defs: DefinitionsMap): unknown {
  if (payload == null) return payload;
  if (typeof payload === "string") {
    const resolved = defs[payload];
    return resolved != null && typeof resolved === "object" ? resolved : payload;
  }
  if (typeof payload !== "object") return payload;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.value === "string") {
    const resolved = defs[obj.value];
    if (resolved != null && typeof resolved === "object") return { ...obj, value: resolved };
  }
  return payload;
}

export function resolveSectionTriggerPayloads(
  section: SectionWithElements,
  defs: DefinitionsMap
): void {
  const withTriggers = section as SectionWithElements & {
    onVisible?: PeblorAction;
    onInvisible?: PeblorAction;
    onProgress?: PeblorAction;
    onViewportProgress?: PeblorAction;
  };
  if (
    !withTriggers.onVisible &&
    !withTriggers.onInvisible &&
    !withTriggers.onProgress &&
    !withTriggers.onViewportProgress
  )
    return;

  if (withTriggers.onVisible?.payload != null) {
    withTriggers.onVisible = {
      ...withTriggers.onVisible,
      payload: resolveTriggerPayload(withTriggers.onVisible.payload, defs),
    } as CoreTriggerAction;
  }
  if (withTriggers.onInvisible?.payload != null) {
    withTriggers.onInvisible = {
      ...withTriggers.onInvisible,
      payload: resolveTriggerPayload(withTriggers.onInvisible.payload, defs),
    } as CoreTriggerAction;
  }
  if (withTriggers.onProgress?.payload != null) {
    withTriggers.onProgress = {
      ...withTriggers.onProgress,
      payload: resolveTriggerPayload(withTriggers.onProgress.payload, defs),
    } as CoreTriggerAction;
  }
  if (withTriggers.onViewportProgress?.payload != null) {
    withTriggers.onViewportProgress = {
      ...withTriggers.onViewportProgress,
      payload: resolveTriggerPayload(withTriggers.onViewportProgress.payload, defs),
    } as CoreTriggerAction;
  }
}
