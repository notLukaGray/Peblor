import type { PeblorAction, PeblorDefinitionBlock, SectionBlock, bgBlock } from "@pb/contracts";
import { isBgBlockShape, resolveBgBlockUrls } from "./peblor-blocks";

/**
 * Unified trigger payload resolver.
 * Resolves definition-key references in trigger payloads.
 * Optionally resolves bg-block asset URLs when resolveBgBlockUrl callback is provided.
 * Always returns new objects (immutable).
 *
 * Callers that don't need bg-block URL resolution (e.g. expand-stage) pass only payload and defs.
 * Callers that do need it (e.g. resolve-stage) pass all arguments.
 */
export function resolveTriggerPayload(
  payload: unknown,
  defs: Record<string, PeblorDefinitionBlock> | undefined,
  resolveBgBlockUrl?: (value: bgBlock, base: string) => bgBlock,
  base?: string
): unknown {
  if (payload == null) return payload;

  // String = definition key reference
  if (typeof payload === "string") {
    if (defs && defs[payload] != null && typeof defs[payload] === "object") return defs[payload];
    return payload;
  }

  if (typeof payload !== "object") return payload;

  const obj = payload as Record<string, unknown>;

  // Recurse into fireMultiple actions to resolve nested action payloads
  if (Array.isArray(obj.actions)) {
    let changed = false;
    const resolvedActions = obj.actions.map((action: unknown) => {
      if (action == null || typeof action !== "object") return action;
      const a = action as Record<string, unknown>;
      if (a.payload != null) {
        const resolved = resolveTriggerPayload(a.payload, defs, resolveBgBlockUrl, base);
        if (resolved !== a.payload) {
          changed = true;
          return { ...a, payload: resolved };
        }
      }
      return action;
    });
    return changed ? { ...obj, actions: resolvedActions } : payload;
  }

  // Resolve value key reference (string value pointing to a definition key)
  if (typeof obj.value === "string") {
    const resolvedValue =
      defs && defs[obj.value] != null && typeof defs[obj.value] === "object"
        ? defs[obj.value]
        : obj.value;
    if (resolvedValue !== obj.value) {
      const next = { ...obj, value: resolvedValue } as Record<string, unknown>;
      if (resolveBgBlockUrl && isBgBlockShape(resolvedValue)) {
        return { ...next, value: resolveBgBlockUrl(resolvedValue, base!) };
      }
      return next;
    }
  }

  // Resolve bg-block asset URLs for the whole payload
  if (resolveBgBlockUrl && isBgBlockShape(payload)) {
    return resolveBgBlockUrl(payload, base!);
  }

  // Resolve bg-block asset URLs for value when it's an object (not a string ref)
  if (
    resolveBgBlockUrl &&
    obj.value != null &&
    typeof obj.value === "object" &&
    isBgBlockShape(obj.value)
  ) {
    return { ...obj, value: resolveBgBlockUrl(obj.value as bgBlock, base!) };
  }

  return payload;
}

/** Resolve payloads inside array-based trigger entries (scrollDirectionTriggers, idleTriggers). */
function resolveArrayTriggerPayloads(
  entries: Array<Record<string, unknown>> | undefined,
  fieldNames: string[],
  defs: Record<string, PeblorDefinitionBlock> | undefined,
  resolveBgBlockUrl?: (value: bgBlock, base: string) => bgBlock,
  base?: string
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
          const resolvedPayload = resolveTriggerPayload(
            action.payload,
            defs,
            resolveBgBlockUrl,
            base
          );
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

type SectionTriggerFields = {
  onVisible?: PeblorAction;
  onInvisible?: PeblorAction;
  onProgress?: PeblorAction;
  onViewportProgress?: PeblorAction;
  scrollDirectionTriggers?: Array<{
    onScrollDown?: PeblorAction;
    onScrollUp?: PeblorAction;
  }>;
  idleTriggers?: Array<{
    onIdle?: PeblorAction;
    onActive?: PeblorAction;
  }>;
};

function applyTriggerPayloadResolutions(
  section: SectionBlock,
  defs: Record<string, PeblorDefinitionBlock> | undefined,
  resolveBgBlockUrl?: (value: bgBlock, base: string) => bgBlock,
  base?: string
): SectionBlock {
  const withTriggers = section as SectionBlock & SectionTriggerFields;
  if (
    !withTriggers.onVisible &&
    !withTriggers.onInvisible &&
    !withTriggers.onProgress &&
    !withTriggers.onViewportProgress &&
    !Array.isArray(withTriggers.scrollDirectionTriggers) &&
    !Array.isArray(withTriggers.idleTriggers)
  )
    return section;

  const out = { ...section } as SectionBlock & SectionTriggerFields;
  if (withTriggers.onVisible) {
    out.onVisible = {
      ...withTriggers.onVisible,
      payload: resolveTriggerPayload(withTriggers.onVisible.payload, defs, resolveBgBlockUrl, base),
    } as unknown as PeblorAction;
  }
  if (withTriggers.onInvisible) {
    out.onInvisible = {
      ...withTriggers.onInvisible,
      payload: resolveTriggerPayload(
        withTriggers.onInvisible.payload,
        defs,
        resolveBgBlockUrl,
        base
      ),
    } as unknown as PeblorAction;
  }
  if (withTriggers.onProgress) {
    out.onProgress = {
      ...withTriggers.onProgress,
      payload: resolveTriggerPayload(
        withTriggers.onProgress.payload,
        defs,
        resolveBgBlockUrl,
        base
      ),
    } as unknown as PeblorAction;
  }
  if (withTriggers.onViewportProgress) {
    out.onViewportProgress = {
      ...withTriggers.onViewportProgress,
      payload: resolveTriggerPayload(
        withTriggers.onViewportProgress.payload,
        defs,
        resolveBgBlockUrl,
        base
      ),
    } as unknown as PeblorAction;
  }

  // Resolve payloads inside scrollDirectionTriggers entries
  const resolvedScrollDir = resolveArrayTriggerPayloads(
    withTriggers.scrollDirectionTriggers as unknown as Array<Record<string, unknown>>,
    ["onScrollDown", "onScrollUp"],
    defs,
    resolveBgBlockUrl,
    base
  );
  if (resolvedScrollDir !== withTriggers.scrollDirectionTriggers) {
    (out as Record<string, unknown>).scrollDirectionTriggers = resolvedScrollDir;
  }

  // Resolve payloads inside idleTriggers entries
  const resolvedIdle = resolveArrayTriggerPayloads(
    withTriggers.idleTriggers as unknown as Array<Record<string, unknown>>,
    ["onIdle", "onActive"],
    defs,
    resolveBgBlockUrl,
    base
  );
  if (resolvedIdle !== withTriggers.idleTriggers) {
    (out as Record<string, unknown>).idleTriggers = resolvedIdle;
  }

  return out as SectionBlock;
}

/** Resolve asset URLs in trigger payloads so the client gets usable URLs when a trigger fires. */
export function resolveTriggerPayloadUrls(
  sections: SectionBlock[],
  base: string,
  defs?: Record<string, PeblorDefinitionBlock>
): SectionBlock[] {
  return sections.map((section) =>
    applyTriggerPayloadResolutions(section, defs, resolveBgBlockUrls, base)
  );
}
