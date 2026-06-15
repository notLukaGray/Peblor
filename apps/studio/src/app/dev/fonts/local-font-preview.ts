export type FontDevSlotName = "primary" | "secondary" | "mono";

const DB_NAME = "peblor-font-dev-local-preview";
const DB_VERSION = 2;
const STORE = "slotBlobs";

export type StoredLocalFontFile = {
  fileName: string;
  buffer: ArrayBuffer;
};

/** IndexedDB payload for one slot (multiple static files = one CSS family) */
export type StoredLocalFontSlot = {
  files: StoredLocalFontFile[];
};

/** Legacy v1 shape: single file per slot */
type LegacyStoredBlob = {
  fileName: string;
  buffer: ArrayBuffer;
};

export function normalizeStoredSlot(raw: unknown): StoredLocalFontSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (Array.isArray(r.files)) {
    const files = r.files.filter(
      (f): f is StoredLocalFontFile =>
        f !== null &&
        typeof f === "object" &&
        typeof (f as StoredLocalFontFile).fileName === "string" &&
        (f as StoredLocalFontFile).buffer instanceof ArrayBuffer
    );
    return files.length > 0 ? { files } : null;
  }

  const legacy = raw as LegacyStoredBlob;
  if (typeof legacy.fileName === "string" && legacy.buffer instanceof ArrayBuffer) {
    return { files: [{ fileName: legacy.fileName, buffer: legacy.buffer }] };
  }

  return null;
}

const CSS_FAMILY: Record<FontDevSlotName, string> = {
  primary: "FontDevPreviewPrimary",
  secondary: "FontDevPreviewSecondary",
  mono: "FontDevPreviewMono",
};

export function previewCssFamily(slot: FontDevSlotName): string {
  return CSS_FAMILY[slot];
}

export type InferredFontStyle = "normal" | "italic";

/**
 * Weight keywords matched against a **compact** stem (lowercase, letters+digits only) so run-on
 * vendor names work: `SerifExtraBoldItalic` → `...serifextrabolditalic...` → extrabold (800).
 * Longest token wins so `extralight` beats `light`, `extrabold` beats `bold`.
 */
const WEIGHT_KEYWORD_WEIGHT: [string, number][] = (
  [
    ["extralight", 200],
    ["ultralight", 200],
    ["semibold", 600],
    ["demibold", 600],
    ["extrabold", 800],
    ["ultrabold", 800],
    ["hairline", 100],
    ["regular", 400],
    ["normal", 400],
    ["roman", 400],
    ["book", 400],
    ["medium", 500],
    ["thin", 100],
    ["light", 300],
    ["demi", 600],
    ["bold", 700],
    ["heavy", 900],
    ["black", 900],
    ["fat", 900],
  ] as [string, number][]
).sort((a, b) => b[0].length - a[0].length);

function inferWeightFromCompact(compact: string): number | null {
  for (const [kw, wt] of WEIGHT_KEYWORD_WEIGHT) {
    if (compact.includes(kw)) return wt;
  }
  return null;
}

function inferStyleFromStem(stem: string): InferredFontStyle {
  return /italic|oblique|_it\b|-it\b|ital\b/.test(stem) ? "italic" : "normal";
}

function parseSeparatedWeight(stem: string): number | null {
  const match = stem.match(/(?:^|[-_\s])([1-9]\d{2,3})(?=([-_\s]|$))/);
  const numStr = match?.[1];
  if (numStr === undefined) return null;
  const n = parseInt(numStr, 10);
  return n >= 100 && n <= 900 ? n : null;
}

function parseEmbeddedWeight(stem: string): number | null {
  const match = stem.match(/(?:^|[^0-9])([1-9]00|400|500|600|700|800|900)(?![0-9])/);
  const numStr = match?.[1];
  if (numStr === undefined) return null;
  const n = parseInt(numStr, 10);
  return n >= 100 && n <= 900 ? n : null;
}

function inferWeightFromStem(stem: string): number {
  const compact = stem.replace(/[^a-z0-9]+/g, "");
  const fromCompact = inferWeightFromCompact(compact);
  if (fromCompact !== null) return fromCompact;
  return parseSeparatedWeight(stem) ?? parseEmbeddedWeight(stem) ?? 400;
}

/** Best-effort weight/style from common static-font filenames (user can still verify in the weight grid). */
export function inferWeightStyleFromFileName(fileName: string): {
  weight: number;
  style: InferredFontStyle;
} {
  const stem = fileName.replace(/\.[^.]+$/i, "").toLowerCase();
  const style = inferStyleFromStem(stem);

  const forWeight = stem.replace(/\bitalic\b|italic|oblique|_it\b|-it\b|ital\b/gi, " ");
  return { weight: inferWeightFromStem(forWeight), style };
}

/**
 * Display name for the slot when using uploaded files (common prefix of stems, else first file cleaned up).
 */
export function deriveLocalDisplayFamily(fileNames: string[]): string {
  if (fileNames.length === 0) return "Local";
  const stems = fileNames.map((n) => n.replace(/\.[^.]+$/i, ""));
  let prefix = stems[0]!;
  for (const stem of stems.slice(1)) {
    while (prefix.length > 0 && !stem.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  prefix = prefix.replace(/[-_.\s]+$/g, "");
  if (prefix.length >= 2) return prefix;

  const stripTrail = (stem: string) =>
    stem
      .replace(
        /[-_](thin|hairline|extralight|light|regular|book|normal|roman|medium|semibold|demi|bold|extrabold|black|heavy|italic|oblique|[1-9]\d{2,3})$/i,
        ""
      )
      .replace(/[-_.\s]+$/g, "");
  const fallback = stripTrail(stems[0]!) || stems[0]!;
  return fallback.length >= 1 ? fallback : "Local";
}

export function inferFontFormat(fileName: string): "woff2" | "woff" | "truetype" | "opentype" {
  const n = fileName.toLowerCase();
  if (n.endsWith(".woff2")) return "woff2";
  if (n.endsWith(".woff")) return "woff";
  if (n.endsWith(".ttf")) return "truetype";
  if (n.endsWith(".otf")) return "opentype";
  return "woff2";
}

export type LocalFontFaceRule = {
  url: string;
  format: "woff2" | "woff" | "truetype" | "opentype";
  fontWeight: number;
  fontStyle: InferredFontStyle;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
  });
}

export async function loadStoredLocalFont(
  slot: FontDevSlotName
): Promise<StoredLocalFontSlot | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(slot);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(normalizeStoredSlot(req.result));
  });
}

export async function saveStoredLocalFont(
  slot: FontDevSlotName,
  data: StoredLocalFontSlot
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(data, slot);
  });
}

export async function deleteStoredLocalFont(slot: FontDevSlotName): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(slot);
  });
}

const STYLE_ID = "font-dev-local-preview-faces";
const ROLE_STYLE_ID = "font-dev-local-role-preview-faces";

/** Per–semantic-role preview family so each row can bind a different uploaded file (local dev only). */
export function localRolePreviewFamily(slot: FontDevSlotName, role: string): string {
  const safe = role.replace(/[^a-z0-9_-]/gi, "_");
  return `${previewCssFamily(slot)}__${safe}`;
}

export type LocalRoleFaceRule = {
  role: string;
  family: string;
  url: string;
  format: ReturnType<typeof inferFontFormat>;
};

/**
 * One @font-face per enabled semantic row, each with its own CSS family — avoids collisions when
 * many files share the same numeric weight in metadata.
 */
export function applyLocalRolePreviewFontFaces(
  bySlot: Partial<Record<FontDevSlotName, LocalRoleFaceRule[]>>
): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(ROLE_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = ROLE_STYLE_ID;
    document.head.appendChild(el);
  }
  const blocks: string[] = [];
  for (const slot of ["primary", "secondary", "mono"] as FontDevSlotName[]) {
    const rows = bySlot[slot];
    if (!rows?.length) continue;
    for (const r of rows) {
      blocks.push(
        `@font-face{font-family:"${r.family}";src:url("${r.url}") format("${r.format}");font-weight:400;font-style:normal;font-display:swap;}`
      );
    }
  }
  el.textContent = blocks.join("");
}

export function clearLocalRolePreviewFontFaces(): void {
  if (typeof document === "undefined") return;
  document.getElementById(ROLE_STYLE_ID)?.remove();
}

export function applyLocalPreviewFontFaces(
  entries: Partial<Record<FontDevSlotName, LocalFontFaceRule[]>>
): void {
  if (typeof document === "undefined") return;

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }

  const blocks: string[] = [];
  for (const slot of ["primary", "secondary", "mono"] as FontDevSlotName[]) {
    const rules = entries[slot];
    if (!rules?.length) continue;
    const fam = previewCssFamily(slot);
    for (const r of rules) {
      if (!r.url) continue;
      blocks.push(
        `@font-face{font-family:"${fam}";src:url("${r.url}") format("${r.format}");font-weight:${r.fontWeight};font-style:${r.fontStyle};font-display:swap;}`
      );
    }
  }

  el.textContent = blocks.join("");
}

export function clearLocalPreviewFontFaceStyle(): void {
  if (typeof document === "undefined") return;
  document.getElementById(STYLE_ID)?.remove();
}
