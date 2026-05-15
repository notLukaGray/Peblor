import {
  DEFAULT_M1_SEEDS_DARK,
  DEFAULT_M1_SEEDS_LIGHT,
  initialM1Rows,
  type M1ColorSeeds,
  type M1RowState,
} from "@/app/theme/palette-suggest";
import { type M1TokenId } from "@/app/theme/pb-color-tokens";
import {
  DEV_NEUTRAL_M1_SEEDS_DARK,
  DEV_NEUTRAL_M1_SEEDS_LIGHT,
} from "@/app/dev/colors/color-tool-baseline";

/** Legacy localStorage key; kept for one-time migration into `workbench-session-v2`. */
export const COLOR_TOOL_LEGACY_STORAGE_KEY = "pb-color-tool-m1";

export type ColorToolPersistedV2 = {
  seedsLight: M1ColorSeeds;
  seedsDark: M1ColorSeeds;
  rowsLight: Record<M1TokenId, M1RowState>;
  rowsDark: Record<M1TokenId, M1RowState>;
  /** When true, seed edits apply to both light and dark seed sets. */
  syncSeedsAcrossThemes?: boolean;
};

/** Built-in M1 color tool snapshot (matches `/dev/colors` reset). */
export function getDefaultColorToolPersistedV2(): ColorToolPersistedV2 {
  return {
    seedsLight: { ...DEV_NEUTRAL_M1_SEEDS_LIGHT },
    seedsDark: { ...DEV_NEUTRAL_M1_SEEDS_DARK },
    rowsLight: initialM1Rows(DEV_NEUTRAL_M1_SEEDS_LIGHT, "light"),
    rowsDark: initialM1Rows(DEV_NEUTRAL_M1_SEEDS_DARK, "dark"),
    syncSeedsAcrossThemes: true,
  };
}

export function getProductionColorToolPersistedV2(): ColorToolPersistedV2 {
  return {
    seedsLight: { ...DEFAULT_M1_SEEDS_LIGHT },
    seedsDark: { ...DEFAULT_M1_SEEDS_DARK },
    rowsLight: initialM1Rows(DEFAULT_M1_SEEDS_LIGHT, "light"),
    rowsDark: initialM1Rows(DEFAULT_M1_SEEDS_DARK, "dark"),
    syncSeedsAcrossThemes: true,
  };
}

type ColorToolPersistedV1 = {
  seeds: {
    primaryLight: string;
    secondaryLight: string;
    accentLight: string;
    linkAccent: string;
  };
  rows: Record<M1TokenId, M1RowState>;
};

function migrateV1ToV2(data: ColorToolPersistedV1): ColorToolPersistedV2 {
  const seedsLight: M1ColorSeeds = {
    primary: data.seeds.primaryLight,
    secondary: data.seeds.secondaryLight,
    accent: data.seeds.accentLight,
    linkAccent: data.seeds.linkAccent,
  };
  return {
    seedsLight,
    seedsDark: { ...DEV_NEUTRAL_M1_SEEDS_DARK },
    rowsLight: data.rows,
    rowsDark: initialM1Rows(DEV_NEUTRAL_M1_SEEDS_DARK, "dark"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function hasRequiredV2Slices(value: ColorToolPersistedV2): boolean {
  return (
    value.seedsLight != null &&
    value.seedsDark != null &&
    value.rowsLight != null &&
    value.rowsDark != null
  );
}

function readV2Shape(data: unknown): ColorToolPersistedV2 | null {
  if (!isRecord(data)) return null;
  const v = data as ColorToolPersistedV2;
  if (!hasRequiredV2Slices(v)) return null;
  if (!isRecord(v.seedsLight) || !isRecord(v.seedsDark)) return null;
  return {
    seedsLight: v.seedsLight,
    seedsDark: v.seedsDark,
    rowsLight: v.rowsLight,
    rowsDark: v.rowsDark,
    syncSeedsAcrossThemes: v.syncSeedsAcrossThemes === true,
  };
}

function readV1Shape(data: unknown): ColorToolPersistedV1 | null {
  if (!data || typeof data !== "object") return null;
  const v1 = data as ColorToolPersistedV1;
  if (!v1.seeds || typeof v1.seeds !== "object" || !v1.rows) return null;
  if (!("primaryLight" in v1.seeds)) return null;
  return v1;
}

/** Parse stored JSON (legacy key or workbench slice) into the current V2 shape, or null. */
export function parseColorToolPersistedJson(raw: string): ColorToolPersistedV2 | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const v2 = readV2Shape(parsed);
    if (v2) return v2;
    const v1 = readV1Shape(parsed);
    return v1 ? migrateV1ToV2(v1) : null;
  } catch {
    return null;
  }
}

export function parseColorToolPersistedValue(data: unknown): ColorToolPersistedV2 | null {
  if (data == null) return null;
  try {
    return parseColorToolPersistedJson(JSON.stringify(data));
  } catch {
    return null;
  }
}

/** Read-only helper for migration when only the raw legacy string is available. */
export function readColorToolFromLegacyLocalStorage(): ColorToolPersistedV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COLOR_TOOL_LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return parseColorToolPersistedJson(raw);
  } catch {
    return null;
  }
}

export function coerceColorToolPersisted(data: unknown): ColorToolPersistedV2 | null {
  if (typeof data === "string") return parseColorToolPersistedJson(data);
  return parseColorToolPersistedValue(data);
}
