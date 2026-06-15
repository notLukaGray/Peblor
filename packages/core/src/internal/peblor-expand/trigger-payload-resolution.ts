import type { PeblorAction } from "@pb/contracts";
import type { SectionWithElements, DefinitionsMap } from "./section-shapes";
import { resolveTriggerPayload } from "../peblor-triggers";

/** Resolve a single PeblorAction's payload (if present) against definitions. */
function resolveActionPayload(
  action: PeblorAction | undefined,
  defs: DefinitionsMap
): PeblorAction | undefined {
  if (!action || action.payload == null) return action;
  const resolved = resolveTriggerPayload(action.payload, defs);
  if (resolved === action.payload) return action;
  return { ...action, payload: resolved } as PeblorAction;
}

function resolveActionsInArray(
  entries: Array<Record<string, unknown>> | undefined,
  fieldNames: string[],
  defs: DefinitionsMap
): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(entries)) return entries;
  let changed = false;
  const resolved = entries.map((entry) => {
    let entryChanged = false;
    const next = { ...entry };
    for (const field of fieldNames) {
      if (next[field] != null && typeof next[field] === "object") {
        const action = next[field] as Record<string, unknown>;
        if (action.payload != null) {
          const resolvedPayload = resolveTriggerPayload(action.payload, defs);
          if (resolvedPayload !== action.payload) {
            next[field] = { ...action, payload: resolvedPayload };
            entryChanged = true;
          }
        }
      }
    }
    if (entryChanged) changed = true;
    return next;
  });
  return changed ? resolved : entries;
}

export function resolveSectionTriggerPayloads(
  section: SectionWithElements,
  defs: DefinitionsMap
): SectionWithElements {
  const withTriggers = section as SectionWithElements & {
    onVisible?: PeblorAction;
    onInvisible?: PeblorAction;
    onProgress?: PeblorAction;
    onViewportProgress?: PeblorAction;
    scrollDirectionTriggers?: Array<Record<string, unknown>>;
    idleTriggers?: Array<Record<string, unknown>>;
  };
  const hasTopLevel =
    withTriggers.onVisible ||
    withTriggers.onInvisible ||
    withTriggers.onProgress ||
    withTriggers.onViewportProgress;
  const hasScrollDir = Array.isArray(withTriggers.scrollDirectionTriggers);
  const hasIdle = Array.isArray(withTriggers.idleTriggers);
  if (!hasTopLevel && !hasScrollDir && !hasIdle) return section;

  const out = { ...section } as SectionWithElements & {
    onVisible?: PeblorAction;
    onInvisible?: PeblorAction;
    onProgress?: PeblorAction;
    onViewportProgress?: PeblorAction;
    scrollDirectionTriggers?: Array<Record<string, unknown>>;
    idleTriggers?: Array<Record<string, unknown>>;
  };

  if (withTriggers.onVisible) {
    out.onVisible = resolveActionPayload(withTriggers.onVisible, defs);
  }
  if (withTriggers.onInvisible) {
    out.onInvisible = resolveActionPayload(withTriggers.onInvisible, defs);
  }
  if (withTriggers.onProgress) {
    out.onProgress = resolveActionPayload(withTriggers.onProgress, defs);
  }
  if (withTriggers.onViewportProgress) {
    out.onViewportProgress = resolveActionPayload(withTriggers.onViewportProgress, defs);
  }

  if (hasScrollDir) {
    out.scrollDirectionTriggers = resolveActionsInArray(
      withTriggers.scrollDirectionTriggers,
      ["onScrollDown", "onScrollUp"],
      defs
    );
  }

  if (hasIdle) {
    out.idleTriggers = resolveActionsInArray(
      withTriggers.idleTriggers,
      ["onIdle", "onActive"],
      defs
    );
  }

  return out as SectionWithElements;
}
