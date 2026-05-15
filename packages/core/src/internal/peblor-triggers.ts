import type {
  CoreTriggerAction,
  PeblorAction,
  PeblorDefinitionBlock,
  SectionBlock,
  bgBlock,
} from "@pb/contracts";
import { isBgBlockShape, resolveBgBlockUrls } from "./peblor-blocks";

export type TriggerPayloadResolveContext = {
  defs: Record<string, PeblorDefinitionBlock> | undefined;
  base: string;
};

function resolvePayloadStringKey(key: string, ctx: TriggerPayloadResolveContext): unknown {
  const { defs } = ctx;
  if (defs && defs[key] != null && typeof defs[key] === "object") return defs[key];
  return key;
}

function resolvePayloadWithValueKey(
  obj: Record<string, unknown>,
  ctx: TriggerPayloadResolveContext
): unknown {
  if (typeof obj.value !== "string") return obj;
  const resolvedValue = resolvePayloadStringKey(obj.value, ctx);
  const next = { ...obj, value: resolvedValue };
  if (isBgBlockShape(resolvedValue)) {
    return { ...next, value: resolveBgBlockUrls(resolvedValue as bgBlock, ctx.base) };
  }
  return next;
}

function resolvePayloadAsBgBlock(value: unknown, base: string): unknown {
  if (!isBgBlockShape(value)) return value;
  return resolveBgBlockUrls(value as bgBlock, base);
}

function resolveTriggerPayload(payload: unknown, ctx: TriggerPayloadResolveContext): unknown {
  if (payload == null) return payload;
  if (typeof payload === "string") return resolvePayloadStringKey(payload, ctx);
  if (typeof payload !== "object") return payload;

  const obj = payload as Record<string, unknown>;
  const withValueResolved = resolvePayloadWithValueKey(obj, ctx);
  if (withValueResolved !== obj) return withValueResolved;

  if (isBgBlockShape(payload)) return resolveBgBlockUrls(payload as bgBlock, ctx.base);
  if (obj.value != null && typeof obj.value === "object" && isBgBlockShape(obj.value)) {
    return { ...obj, value: resolvePayloadAsBgBlock(obj.value, ctx.base) };
  }
  return payload;
}

function applyTriggerPayloadResolutions(
  section: SectionBlock,
  ctx: TriggerPayloadResolveContext
): SectionBlock {
  const withTriggers = section as SectionBlock & {
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
    return section;

  const out = { ...section } as SectionBlock & {
    onVisible?: PeblorAction;
    onInvisible?: PeblorAction;
    onProgress?: PeblorAction;
    onViewportProgress?: PeblorAction;
  };
  if (withTriggers.onVisible) {
    out.onVisible = {
      ...withTriggers.onVisible,
      payload: resolveTriggerPayload(withTriggers.onVisible.payload, ctx),
    } as CoreTriggerAction;
  }
  if (withTriggers.onInvisible) {
    out.onInvisible = {
      ...withTriggers.onInvisible,
      payload: resolveTriggerPayload(withTriggers.onInvisible.payload, ctx),
    } as CoreTriggerAction;
  }
  if (withTriggers.onProgress) {
    out.onProgress = {
      ...withTriggers.onProgress,
      payload: resolveTriggerPayload(withTriggers.onProgress.payload, ctx),
    } as CoreTriggerAction;
  }
  if (withTriggers.onViewportProgress) {
    out.onViewportProgress = {
      ...withTriggers.onViewportProgress,
      payload: resolveTriggerPayload(withTriggers.onViewportProgress.payload, ctx),
    } as CoreTriggerAction;
  }
  return out as SectionBlock;
}

/** Resolve asset URLs in trigger payloads so the client gets usable URLs when a trigger fires. */
export function resolveTriggerPayloadUrls(
  sections: SectionBlock[],
  base: string,
  defs?: Record<string, PeblorDefinitionBlock>
): SectionBlock[] {
  const ctx: TriggerPayloadResolveContext = { defs, base };
  return sections.map((section) => applyTriggerPayloadResolutions(section, ctx));
}
