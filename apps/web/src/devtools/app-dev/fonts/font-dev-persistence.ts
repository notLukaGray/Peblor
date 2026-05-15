import type { FontWeightMap, FontWeightRole } from "@/app/fonts/config";
import { FONT_WEIGHT_ROLES } from "@/app/fonts/config";
import type { TypeScaleConfig, TypeScaleEntry } from "@/app/fonts/type-scale";
import {
  TYPE_SCALE_LEGACY_KEYS,
  TYPE_SCALE_PREVIOUS_TSHIRT_SLOT_MAP,
  TYPE_SCALE_VAR_PREFIXES,
} from "@/app/fonts/type-scale";
import {
  FONT_DEV_LEGACY_STORAGE_KEY,
  getWorkbenchSession,
  patchWorkbenchFonts,
} from "@/app/dev/workbench/workbench-session";
import {
  DEFAULT_LETTER_SPACING_SCALE,
  DEFAULT_LINE_HEIGHT_SCALE,
  type LetterSpacingScale,
  type LineHeightScale,
} from "@/app/theme/pb-spacing-tokens";

export type SlotName = "primary" | "secondary" | "mono";
export type SlotPreviewMode = "catalog" | "local";

export type SlotState = {
  family: string;
  weights: FontWeightMap;
  italic: boolean;
  source: "local" | "webfont";
  localRoleFiles?: Partial<Record<keyof FontWeightMap, string>>;
};

export type FontDevPrefsV2 = {
  v: 2;
  configs: Record<SlotName, SlotState>;
  slotPreviewMode: Record<SlotName, SlotPreviewMode>;
  typeScale: TypeScaleConfig;
  previewSampleText: string;
  lineHeightScale: LineHeightScale;
  letterSpacingScale: LetterSpacingScale;
};

type FontDevPrefsWritePayload = Omit<
  FontDevPrefsV2,
  "v" | "lineHeightScale" | "letterSpacingScale"
> &
  Partial<Pick<FontDevPrefsV2, "lineHeightScale" | "letterSpacingScale">>;

export const SLOT_NAMES: SlotName[] = ["primary", "secondary", "mono"];
export const WEIGHT_NAMES: (keyof FontWeightMap)[] = [
  "thin",
  "light",
  "regular",
  "book",
  "bold",
  "black",
];
const SCALE_KEYS = Object.keys(TYPE_SCALE_VAR_PREFIXES) as (keyof TypeScaleConfig)[];
export const DEFAULT_PREVIEW_PHRASE = "The quick brown fox jumps over the lazy dog. 0123456789";

function sanitizeFontWeightMap(raw: unknown): FontWeightMap {
  const out: FontWeightMap = {};
  if (!raw || typeof raw !== "object") return out;
  const o = raw as Record<string, unknown>;
  for (const k of WEIGHT_NAMES) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 1000) out[k] = Math.round(v);
  }
  return out;
}

function sanitizeLocalRoleFiles(raw: unknown): SlotState["localRoleFiles"] {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: NonNullable<SlotState["localRoleFiles"]> = {};
  for (const k of WEIGHT_NAMES) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0 && v.length < 512) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function resolveSlotSource(
  baselineSource: SlotState["source"],
  patchSource: SlotState["source"] | undefined
): SlotState["source"] {
  if (baselineSource === "webfont") return "webfont";
  return patchSource === "local" ? "local" : "webfont";
}

function resolvedSlotFamily(patchFamily: unknown, baselineFamily: string): string {
  if (typeof patchFamily !== "string") return baselineFamily;
  const next = patchFamily.trim();
  return next.length > 0 ? next : baselineFamily;
}

function mergeSlotState(baseline: SlotState, patch: unknown): SlotState {
  if (!patch || typeof patch !== "object") return baseline;
  const p = patch as Partial<SlotState>;
  const weights = sanitizeFontWeightMap(p.weights);
  const hasWeights = WEIGHT_NAMES.some((k) => weights[k] !== undefined);
  const source = resolveSlotSource(baseline.source, p.source);
  const localRoleFiles = source === "local" ? sanitizeLocalRoleFiles(p.localRoleFiles) : undefined;
  return {
    family: resolvedSlotFamily(p.family, baseline.family),
    weights: hasWeights ? weights : baseline.weights,
    italic: typeof p.italic === "boolean" ? p.italic : baseline.italic,
    source,
    localRoleFiles,
  };
}

function sanitizeFontWeightRole(raw: unknown, fallback: FontWeightRole): FontWeightRole {
  if (typeof raw !== "string") return fallback;
  return FONT_WEIGHT_ROLES.includes(raw as FontWeightRole) ? (raw as FontWeightRole) : fallback;
}

function storedNeedsResetTshirtSlots(s: Record<string, unknown>): boolean {
  return ("heading2xs" in s && !("heading2xl" in s)) || ("body2xs" in s && !("body2xl" in s));
}

function remapPreviousTshirtEraKeys(s: Record<string, unknown>): Record<string, unknown> {
  const out = { ...s };
  for (const [from, to] of Object.entries(TYPE_SCALE_PREVIOUS_TSHIRT_SLOT_MAP)) {
    if (out[String(to)] === undefined && out[from] !== undefined) out[String(to)] = out[from];
  }
  for (const from of Object.keys(TYPE_SCALE_PREVIOUS_TSHIRT_SLOT_MAP)) delete out[from];
  return out;
}

function mergeTypeScaleEntry(
  baselineEntry: TypeScaleEntry,
  storedEntry: Record<string, unknown>
): TypeScaleEntry {
  return {
    sizeDesktop:
      typeof storedEntry.sizeDesktop === "number"
        ? storedEntry.sizeDesktop
        : baselineEntry.sizeDesktop,
    sizeMobile:
      typeof storedEntry.sizeMobile === "number"
        ? storedEntry.sizeMobile
        : baselineEntry.sizeMobile,
    lineHeightDesktop:
      typeof storedEntry.lineHeightDesktop === "number"
        ? storedEntry.lineHeightDesktop
        : baselineEntry.lineHeightDesktop,
    lineHeightMobile:
      typeof storedEntry.lineHeightMobile === "number"
        ? storedEntry.lineHeightMobile
        : baselineEntry.lineHeightMobile,
    letterSpacing:
      typeof storedEntry.letterSpacing === "string"
        ? storedEntry.letterSpacing
        : baselineEntry.letterSpacing,
    fontWeightRole: sanitizeFontWeightRole(
      storedEntry.fontWeightRole,
      baselineEntry.fontWeightRole
    ),
  };
}

function withLegacyTypeScaleAliases(raw: Record<string, unknown>): Record<string, unknown> {
  const next = { ...raw };
  for (const [legacy, modern] of Object.entries(TYPE_SCALE_LEGACY_KEYS)) {
    if (next[String(modern)] === undefined && next[legacy] !== undefined)
      next[String(modern)] = next[legacy];
  }
  return storedNeedsResetTshirtSlots(next) ? remapPreviousTshirtEraKeys(next) : next;
}

function mergeTypeScaleFromStored(baseline: TypeScaleConfig, stored: unknown): TypeScaleConfig {
  if (!stored || typeof stored !== "object") return baseline;
  const normalized = withLegacyTypeScaleAliases(stored as Record<string, unknown>);
  const out = { ...baseline };
  for (const key of SCALE_KEYS) {
    const e = normalized[key as string];
    if (!e || typeof e !== "object") continue;
    out[key] = mergeTypeScaleEntry(baseline[key], e as Record<string, unknown>);
  }
  return out;
}

function isFontDevPrefsV2(value: unknown): value is FontDevPrefsV2 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.v === 2 && !!candidate.configs && typeof candidate.configs === "object";
}

function readStoredFontDevPrefs(): FontDevPrefsV2 | null {
  const sessionFonts = getWorkbenchSession().fonts;
  if (isFontDevPrefsV2(sessionFonts)) return sessionFonts;
  const raw = localStorage.getItem(FONT_DEV_LEGACY_STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as unknown;
  return isFontDevPrefsV2(parsed) ? parsed : null;
}

function mergeStoredConfigs(
  baselineConfigs: Record<SlotName, SlotState>,
  parsed: FontDevPrefsV2
): Record<SlotName, SlotState> {
  const next = { ...baselineConfigs };
  for (const slot of SLOT_NAMES)
    next[slot] = mergeSlotState(baselineConfigs[slot], parsed.configs[slot]);
  return next;
}

function mergeStoredSlotPreviewMode(
  parsed: FontDevPrefsV2,
  configs: Record<SlotName, SlotState>
): Record<SlotName, SlotPreviewMode> {
  const spm = parsed.slotPreviewMode;
  return syncSlotPreviewModeWithWebfontSource(configs, {
    primary: spm?.primary === "local" ? "local" : "catalog",
    secondary: spm?.secondary === "local" ? "local" : "catalog",
    mono: spm?.mono === "local" ? "local" : "catalog",
  });
}

function normalizePreviewSampleText(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim().length === 0) return DEFAULT_PREVIEW_PHRASE;
  return raw.slice(0, 5000);
}

export function readFontDevPrefs(
  baselineConfigs: Record<SlotName, SlotState>,
  baselineScale: TypeScaleConfig
): Omit<FontDevPrefsV2, "v"> | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = readStoredFontDevPrefs();
    if (!parsed) return null;
    const configs = mergeStoredConfigs(baselineConfigs, parsed);
    const slotPreviewMode = mergeStoredSlotPreviewMode(parsed, configs);
    const typeScale = mergeTypeScaleFromStored(baselineScale, parsed.typeScale);
    const previewSampleText = normalizePreviewSampleText(parsed.previewSampleText);
    return {
      configs,
      slotPreviewMode,
      typeScale,
      previewSampleText,
      lineHeightScale: parsed.lineHeightScale ?? { ...DEFAULT_LINE_HEIGHT_SCALE },
      letterSpacingScale: parsed.letterSpacingScale ?? { ...DEFAULT_LETTER_SPACING_SCALE },
    };
  } catch {
    return null;
  }
}

export function writeFontDevPrefs(payload: FontDevPrefsWritePayload): void {
  if (typeof window === "undefined") return;
  try {
    const current = getWorkbenchSession().fonts;
    const lineHeightScale =
      payload.lineHeightScale ??
      (current.v === 2 ? current.lineHeightScale : DEFAULT_LINE_HEIGHT_SCALE);
    const letterSpacingScale =
      payload.letterSpacingScale ??
      (current.v === 2 ? current.letterSpacingScale : DEFAULT_LETTER_SPACING_SCALE);
    patchWorkbenchFonts({ v: 2, ...payload, lineHeightScale, letterSpacingScale });
  } catch {
    // ignore quota / private mode
  }
}

export function syncSlotPreviewModeWithWebfontSource(
  configs: Record<SlotName, SlotState>,
  slotPreviewMode: Record<SlotName, SlotPreviewMode>
): Record<SlotName, SlotPreviewMode> {
  const next = { ...slotPreviewMode };
  for (const slot of SLOT_NAMES) {
    if (configs[slot].source === "webfont") next[slot] = "catalog";
  }
  return next;
}
