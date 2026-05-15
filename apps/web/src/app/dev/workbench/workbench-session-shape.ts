type WorkbenchElementsShape = {
  image: unknown;
  body: unknown;
  heading: unknown;
  link: unknown;
  button: unknown;
  richText: unknown;
  input: unknown;
  range: unknown;
  video: unknown;
  videoTime: unknown;
  vector: unknown;
  svg: unknown;
  model3d: unknown;
  rive: unknown;
  spacer: unknown;
  scrollProgressBar: unknown;
};

type WorkbenchShape = {
  v: 2;
  colors: unknown;
  fonts: unknown;
  style: unknown;
  elements: WorkbenchElementsShape;
};

type WorkbenchInFlight = Partial<Omit<WorkbenchShape, "elements">> & {
  v?: 2;
  elements?: Partial<WorkbenchShape["elements"]>;
};

const WORKBENCH_ELEMENT_KEYS = [
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function deepMergeRecord(defaults: unknown, patch: unknown): unknown {
  if (!isRecord(defaults) || !isRecord(patch)) return patch ?? defaults;
  const out: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    out[key] = deepMergeRecord(out[key], value);
  }
  return out;
}

function mergeElements(
  elements: WorkbenchInFlight["elements"],
  defaults: WorkbenchShape["elements"]
): WorkbenchShape["elements"] {
  const merged = { ...defaults };
  if (!elements) return merged;
  for (const key of WORKBENCH_ELEMENT_KEYS) {
    if (elements[key] != null) merged[key] = elements[key];
  }
  return merged;
}

export function mergeWorkbenchSessionShape(
  session: WorkbenchInFlight,
  defaults: WorkbenchShape
): WorkbenchShape {
  return {
    v: 2,
    colors: deepMergeRecord(defaults.colors, session.colors),
    fonts: deepMergeRecord(defaults.fonts, session.fonts),
    style: deepMergeRecord(defaults.style, session.style),
    elements: mergeElements(session.elements, defaults.elements),
  };
}

function hasRequiredElements(elements: unknown): boolean {
  if (!isRecord(elements)) return false;
  return WORKBENCH_ELEMENT_KEYS.every((key) => elements[key] != null);
}

export function hasCompleteWorkbenchStorageShape(raw: string | null): boolean {
  if (!raw || raw.trim() === "") return false;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (
      parsed.v === 2 &&
      parsed.colors != null &&
      parsed.fonts != null &&
      parsed.style != null &&
      hasRequiredElements(parsed.elements)
    );
  } catch {
    return false;
  }
}
