import type { PbImageVariantDefaults } from "@/app/theme/pb-builder-defaults";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "@/app/dev/elements/image/constants";
import type {
  PersistedImageDefaults,
  PersistedImageDefaultsLegacyV1,
  PersistedImageDefaultsLegacyV2,
} from "@/app/dev/elements/image/types";
import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import { normalizeVariant } from "./normalization-variant";

function isPersistedPayloadCandidate(
  data: unknown
): data is
  | PersistedImageDefaults
  | PersistedImageDefaultsLegacyV2
  | PersistedImageDefaultsLegacyV1 {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Record<string, unknown>;
  return "variants" in candidate && "defaultVariant" in candidate;
}

function normalizePersistedVariants(
  variants: Record<string, Partial<PbImageVariantDefaults>> | undefined
): PersistedImageDefaults["variants"] {
  const next = { ...BASE_DEFAULTS.variants };
  for (const key of VARIANT_ORDER) {
    next[key] = normalizeVariant(BASE_DEFAULTS.variants[key], variants?.[key]);
  }
  return next;
}

function resolveDefaultVariant(defaultVariant: unknown): PersistedImageDefaults["defaultVariant"] {
  return VARIANT_ORDER.includes(defaultVariant as PersistedImageDefaults["defaultVariant"])
    ? (defaultVariant as PersistedImageDefaults["defaultVariant"])
    : BASE_DEFAULTS.defaultVariant;
}

export function parsePersistedImagePayload(data: unknown): PersistedImageDefaults | null {
  try {
    if (!isPersistedPayloadCandidate(data)) return null;
    const rawVariants = data.variants as
      | Record<string, Partial<PbImageVariantDefaults>>
      | undefined;
    return {
      v: 3,
      defaultVariant: resolveDefaultVariant(data.defaultVariant),
      variants: normalizePersistedVariants(rawVariants),
    };
  } catch {
    return null;
  }
}

export function readPersisted(): PersistedImageDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const session = getWorkbenchSession();
    if (session.elements?.image != null) {
      const fromSession = parsePersistedImagePayload(session.elements.image);
      if (fromSession) return fromSession;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePersistedImagePayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function toExportJson(data: PersistedImageDefaults): string {
  return JSON.stringify(
    { image: { defaultVariant: data.defaultVariant, variants: data.variants } },
    null,
    2
  );
}
