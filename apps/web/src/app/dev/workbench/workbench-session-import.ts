import { coerceColorToolPersisted } from "@/app/dev/colors/color-tool-persistence";
import { coerceStyleToolPersisted } from "@/app/dev/style/style-tool-persistence";
import type {
  FontWorkbenchPrefsV2,
  WorkbenchSessionV2,
} from "@/app/dev/workbench/workbench-defaults";

export type WorkbenchSessionV2InFlight = Partial<Omit<WorkbenchSessionV2, "elements">> & {
  v: 2;
  elements?: Partial<WorkbenchSessionV2["elements"]>;
};

type ParseResult = { ok: true; session: WorkbenchSessionV2InFlight } | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJsonObject(
  raw: string
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) return { ok: false, error: "Root must be an object" };
    if (parsed.v !== 2) return { ok: false, error: 'Expected "v": 2' };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

function applyColors(
  session: WorkbenchSessionV2InFlight,
  data: Record<string, unknown>
): ParseResult | null {
  if (!("colors" in data) || data.colors === undefined) return null;
  const coerced = coerceColorToolPersisted(data.colors);
  if (!coerced) return { ok: false, error: "Invalid colors payload" };
  session.colors = coerced;
  return { ok: true, session };
}

function applyFonts(
  session: WorkbenchSessionV2InFlight,
  data: Record<string, unknown>
): ParseResult | null {
  if (!("fonts" in data) || data.fonts === undefined) return null;
  if (!isPlainObject(data.fonts)) return { ok: false, error: "fonts must be an object" };
  const fonts = data.fonts as {
    v?: unknown;
    configs?: unknown;
    lineHeightScale?: unknown;
    letterSpacingScale?: unknown;
  };
  if (fonts.v !== 2) return { ok: false, error: "fonts must have v: 2" };
  if (!isPlainObject(fonts.configs)) return { ok: false, error: "fonts.configs must be an object" };
  if (!isPlainObject(fonts.lineHeightScale)) {
    return { ok: false, error: "fonts.lineHeightScale must be an object" };
  }
  if (!isPlainObject(fonts.letterSpacingScale)) {
    return { ok: false, error: "fonts.letterSpacingScale must be an object" };
  }
  session.fonts = data.fonts as FontWorkbenchPrefsV2;
  return { ok: true, session };
}

function applyStyle(
  session: WorkbenchSessionV2InFlight,
  data: Record<string, unknown>
): ParseResult | null {
  if (!("style" in data) || data.style === undefined) return null;
  const coerced = coerceStyleToolPersisted(data.style);
  if (!coerced) return { ok: false, error: "Invalid style payload" };
  session.style = coerced;
  return { ok: true, session };
}

const ELEMENT_IMPORT_KEYS = [
  "image",
  "body",
  "heading",
  "link",
  "button",
  "richText",
  "input",
  "range",
  "video",
  "videoTime",
  "vector",
  "svg",
  "model3d",
  "rive",
  "spacer",
  "scrollProgressBar",
] as const;

function applyElements(
  session: WorkbenchSessionV2InFlight,
  data: Record<string, unknown>
): ParseResult | null {
  if (!("elements" in data) || data.elements === undefined) return null;
  if (!isPlainObject(data.elements)) return { ok: false, error: "elements must be an object" };
  const incoming = data.elements as Record<string, unknown>;
  const elements: Partial<WorkbenchSessionV2["elements"]> = {};
  for (const key of ELEMENT_IMPORT_KEYS) {
    const value = incoming[key];
    if (value === undefined) continue;
    if (!isPlainObject(value)) return { ok: false, error: `elements.${key} must be an object` };
    (elements as Record<string, unknown>)[key] = value;
  }
  if (Object.keys(elements).length > 0) session.elements = elements;
  return { ok: true, session };
}

export function parseImportedWorkbenchSessionJson(raw: string): ParseResult {
  const root = parseJsonObject(raw);
  if (!root.ok) return root;
  const session: WorkbenchSessionV2InFlight = { v: 2 };
  const checks = [applyColors, applyFonts, applyStyle, applyElements];
  for (const apply of checks) {
    const result = apply(session, root.data);
    if (result && !result.ok) return result;
  }
  return { ok: true, session };
}
