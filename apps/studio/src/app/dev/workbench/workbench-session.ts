import {
  COLOR_TOOL_LEGACY_STORAGE_KEY,
  type ColorToolPersistedV2,
} from "@/app/dev/colors/color-tool-persistence";
import { STORAGE_KEY as BODY_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/body/constants";
import { STORAGE_KEY as BUTTON_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/button/constants";
import { STORAGE_KEY as HEADING_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/heading/constants";
import { STORAGE_KEY as IMAGE_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/image/constants";
import { STORAGE_KEY as INPUT_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/input/constants";
import { STORAGE_KEY as LINK_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/link/constants";
import { STORAGE_KEY as MODEL3D_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/model-3d/constants";
import { STORAGE_KEY as RANGE_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/range/constants";
import { STORAGE_KEY as RICH_TEXT_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/rich-text/constants";
import { STORAGE_KEY as RIVE_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/rive/constants";
import { STORAGE_KEY as SCROLL_PROGRESS_BAR_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/scroll-progress-bar/constants";
import { STORAGE_KEY as SPACER_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/spacer/constants";
import { STORAGE_KEY as SVG_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/svg/constants";
import { STORAGE_KEY as VECTOR_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/vector/constants";
import { STORAGE_KEY as VIDEO_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/video/constants";
import { STORAGE_KEY as VIDEO_TIME_ELEMENT_LEGACY_KEY } from "@/app/dev/elements/video-time/constants";
import {
  getDefaultWorkbenchSession,
  getProductionWorkbenchSession,
  isWorkbenchStorageJsonComplete,
  mergeWorkbenchSessionWithDefaults,
  type WorkbenchSessionV2,
} from "@/app/dev/workbench/workbench-defaults";
import {
  STYLE_TOOL_LEGACY_STORAGE_KEY_V1,
  STYLE_TOOL_LEGACY_STORAGE_KEY_V2,
  type StyleToolPersistedV3,
} from "@/app/dev/style/style-tool-persistence";
import {
  parseImportedWorkbenchSessionJson,
  type WorkbenchSessionV2InFlight,
} from "@/app/dev/workbench/workbench-session-import";
export type { WorkbenchSessionV2 } from "@/app/dev/workbench/workbench-defaults";

export type WorkbenchElementKey = keyof WorkbenchSessionV2["elements"];

export const WORKBENCH_SESSION_STORAGE_KEY = "workbench-session-v2";

/** Named bookmark written by “Save” in the workbench nav (separate from the live session). */
export const WORKBENCH_SESSION_BOOKMARK_KEY = "workbench-session-bookmark-v2";

/** Dispatched after Load bookmark or Import so mounted tools resync in the same tab (storage events are other-tabs only). */
export const WORKBENCH_SESSION_CHANGED_EVENT = "pb-workbench-session-changed";

export const FONT_DEV_LEGACY_STORAGE_KEY = "peblor-font-dev-prefs-v1";

export const WORKBENCH_LEGACY_LOCAL_STORAGE_KEYS = [
  COLOR_TOOL_LEGACY_STORAGE_KEY,
  FONT_DEV_LEGACY_STORAGE_KEY,
  STYLE_TOOL_LEGACY_STORAGE_KEY_V1,
  STYLE_TOOL_LEGACY_STORAGE_KEY_V2,
  IMAGE_ELEMENT_LEGACY_KEY,
  BODY_ELEMENT_LEGACY_KEY,
  HEADING_ELEMENT_LEGACY_KEY,
  LINK_ELEMENT_LEGACY_KEY,
  BUTTON_ELEMENT_LEGACY_KEY,
  RICH_TEXT_ELEMENT_LEGACY_KEY,
  INPUT_ELEMENT_LEGACY_KEY,
  RANGE_ELEMENT_LEGACY_KEY,
  VIDEO_ELEMENT_LEGACY_KEY,
  VIDEO_TIME_ELEMENT_LEGACY_KEY,
  VECTOR_ELEMENT_LEGACY_KEY,
  SVG_ELEMENT_LEGACY_KEY,
  MODEL3D_ELEMENT_LEGACY_KEY,
  RIVE_ELEMENT_LEGACY_KEY,
  SPACER_ELEMENT_LEGACY_KEY,
  SCROLL_PROGRESS_BAR_ELEMENT_LEGACY_KEY,
] as const;

export const ALL_WORKBENCH_DEV_STORAGE_KEYS = [
  WORKBENCH_SESSION_STORAGE_KEY,
  WORKBENCH_SESSION_BOOKMARK_KEY,
  ...WORKBENCH_LEGACY_LOCAL_STORAGE_KEYS,
] as const;

function readParsedOnly(): WorkbenchSessionV2InFlight | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<WorkbenchSessionV2>;
    if (p?.v !== 2) return null;
    return p as WorkbenchSessionV2InFlight;
  } catch (err) {
    console.warn("[web] Failed to parse workbench session from localStorage", err);
    return null;
  }
}

export function clearWorkbenchLegacyLocalStorageKeys(): void {
  if (typeof window === "undefined") return;
  for (const k of WORKBENCH_LEGACY_LOCAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch (err) {
      console.warn("[web] Failed to clear legacy workbench storage key", err);
    }
  }
}

export function dispatchWorkbenchSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKBENCH_SESSION_CHANGED_EVENT));
}

export function applyImportedWorkbenchSession(session: WorkbenchSessionV2InFlight): void {
  clearWorkbenchLegacyLocalStorageKeys();
  saveWorkbenchSession(session);
  dispatchWorkbenchSessionChanged();
}

export function saveWorkbenchBookmark(): void {
  if (typeof window === "undefined") return;
  try {
    const s = getWorkbenchSession();
    localStorage.setItem(WORKBENCH_SESSION_BOOKMARK_KEY, JSON.stringify(s));
  } catch (err) {
    console.warn("[web] Failed to save workbench bookmark (quota / private mode)", err);
  }
}

export function loadWorkbenchBookmark(): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: false, error: "Not available" };
  try {
    const raw = localStorage.getItem(WORKBENCH_SESSION_BOOKMARK_KEY);
    if (raw == null || raw.trim() === "") return { ok: false, error: "No saved snapshot yet" };
    const r = parseImportedWorkbenchSessionJson(raw);
    if (!r.ok) return r;
    applyImportedWorkbenchSession(r.session);
    return { ok: true };
  } catch (err) {
    console.warn("[web] Failed to load workbench bookmark", err);
    return { ok: false, error: "Could not load snapshot" };
  }
}

export function importWorkbenchSessionFromJson(
  raw: string
): { ok: true } | { ok: false; error: string } {
  const r = parseImportedWorkbenchSessionJson(raw);
  if (!r.ok) return r;
  applyImportedWorkbenchSession(r.session);
  return { ok: true };
}

export function importWorkbenchProductionDefaults(): { ok: true } {
  applyImportedWorkbenchSession(getProductionWorkbenchSession());
  return { ok: true };
}

export function exportWorkbenchSessionJson(): string {
  return JSON.stringify(getWorkbenchSession(), null, 2);
}

/** Persist canonical full session (merges any missing slices from defaults). */
export function saveWorkbenchSession(session: WorkbenchSessionV2InFlight): void {
  if (typeof window === "undefined") return;
  const complete = mergeWorkbenchSessionWithDefaults(session);
  try {
    localStorage.setItem(WORKBENCH_SESSION_STORAGE_KEY, JSON.stringify(complete));
  } catch (err) {
    console.warn("[web] Failed to save workbench session (quota / private mode)", err);
  }
}

/**
 * Single canonical dev workbench snapshot:
 * merges defaults for any missing slice, upgrades storage to a complete document, and returns the full object.
 */
export function getWorkbenchSession(): WorkbenchSessionV2 {
  const base = readParsedOnly() ?? { v: 2 as const };
  const normalized: WorkbenchSessionV2InFlight = { ...base, v: 2 };
  const complete = mergeWorkbenchSessionWithDefaults(normalized);
  const raw =
    typeof window !== "undefined" ? localStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY) : null;
  if (!isWorkbenchStorageJsonComplete(raw)) {
    try {
      localStorage.setItem(WORKBENCH_SESSION_STORAGE_KEY, JSON.stringify(complete));
    } catch (err) {
      console.warn("[web] Failed to clear legacy workbench storage key", err);
    }
  }
  return complete;
}

export function patchWorkbenchColors(next: ColorToolPersistedV2): void {
  const s = getWorkbenchSession();
  try {
    localStorage.removeItem(COLOR_TOOL_LEGACY_STORAGE_KEY);
  } catch (err) {
    console.warn("[web] Failed to clear legacy workbench storage key", err);
  }
  saveWorkbenchSession({ ...s, colors: next });
}

export function clearWorkbenchColors(): void {
  const s = getWorkbenchSession();
  const d = getDefaultWorkbenchSession();
  try {
    localStorage.removeItem(COLOR_TOOL_LEGACY_STORAGE_KEY);
  } catch (err) {
    console.warn("[web] Failed to clear legacy workbench storage key", err);
  }
  saveWorkbenchSession({ ...s, colors: d.colors });
}

export function patchWorkbenchStyle(next: StyleToolPersistedV3): void {
  const s = getWorkbenchSession();
  try {
    localStorage.removeItem(STYLE_TOOL_LEGACY_STORAGE_KEY_V1);
    localStorage.removeItem(STYLE_TOOL_LEGACY_STORAGE_KEY_V2);
  } catch (err) {
    console.warn("[web] Failed to clear legacy workbench storage key", err);
  }
  saveWorkbenchSession({ ...s, style: next });
}

export function clearWorkbenchStyle(): void {
  const s = getWorkbenchSession();
  const d = getDefaultWorkbenchSession();
  try {
    localStorage.removeItem(STYLE_TOOL_LEGACY_STORAGE_KEY_V2);
    localStorage.removeItem(STYLE_TOOL_LEGACY_STORAGE_KEY_V1);
  } catch (err) {
    console.warn("[web] Failed to clear legacy workbench storage key", err);
  }
  saveWorkbenchSession({ ...s, style: d.style });
}

export function patchWorkbenchFonts(payload: unknown): void {
  const s = getWorkbenchSession();
  try {
    localStorage.removeItem(FONT_DEV_LEGACY_STORAGE_KEY);
  } catch (err) {
    console.warn("[web] Failed to clear legacy workbench storage key", err);
  }
  saveWorkbenchSession({ ...s, fonts: payload as WorkbenchSessionV2["fonts"] });
}

export function clearWorkbenchFonts(): void {
  const s = getWorkbenchSession();
  const d = getDefaultWorkbenchSession();
  try {
    localStorage.removeItem(FONT_DEV_LEGACY_STORAGE_KEY);
  } catch (err) {
    console.warn("[web] Failed to clear legacy workbench storage key", err);
  }
  saveWorkbenchSession({ ...s, fonts: d.fonts });
}

const ELEMENT_LEGACY_KEYS: Record<WorkbenchElementKey, string> = {
  image: IMAGE_ELEMENT_LEGACY_KEY,
  body: BODY_ELEMENT_LEGACY_KEY,
  heading: HEADING_ELEMENT_LEGACY_KEY,
  link: LINK_ELEMENT_LEGACY_KEY,
  button: BUTTON_ELEMENT_LEGACY_KEY,
  richText: RICH_TEXT_ELEMENT_LEGACY_KEY,
  input: INPUT_ELEMENT_LEGACY_KEY,
  range: RANGE_ELEMENT_LEGACY_KEY,
  video: VIDEO_ELEMENT_LEGACY_KEY,
  videoTime: VIDEO_TIME_ELEMENT_LEGACY_KEY,
  vector: VECTOR_ELEMENT_LEGACY_KEY,
  svg: SVG_ELEMENT_LEGACY_KEY,
  model3d: MODEL3D_ELEMENT_LEGACY_KEY,
  rive: RIVE_ELEMENT_LEGACY_KEY,
  spacer: SPACER_ELEMENT_LEGACY_KEY,
  scrollProgressBar: SCROLL_PROGRESS_BAR_ELEMENT_LEGACY_KEY,
};

export function patchWorkbenchElement<K extends WorkbenchElementKey>(
  key: K,
  value: WorkbenchSessionV2["elements"][K]
): void {
  const s = getWorkbenchSession();
  try {
    localStorage.removeItem(ELEMENT_LEGACY_KEYS[key]);
  } catch (err) {
    console.warn("[web] Failed to clear legacy workbench storage key", err);
  }
  saveWorkbenchSession({
    ...s,
    elements: { ...s.elements, [key]: value },
  });
}

export function clearWorkbenchElement<K extends WorkbenchElementKey>(key: K): void {
  const s = getWorkbenchSession();
  const d = getDefaultWorkbenchSession();
  try {
    localStorage.removeItem(ELEMENT_LEGACY_KEYS[key]);
  } catch (err) {
    console.warn("[web] Failed to clear legacy workbench storage key", err);
  }
  saveWorkbenchSession({
    ...s,
    elements: { ...s.elements, [key]: d.elements[key] },
  });
}
