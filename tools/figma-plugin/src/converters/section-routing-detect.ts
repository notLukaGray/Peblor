/**
 * Heuristics for inferring section block types from Figma frames (minimal annotations).
 */

import { stripAnnotations } from "./annotations-parse";

export function isScrollContainerFrame(frame: FrameNode): boolean {
  if (frame.overflowDirection === "NONE") return false;
  const n = frame.children.length;
  return n > 0;
}

export function isDividerFrame(frame: FrameNode): boolean {
  const w = frame.width;
  const h = frame.height;
  const thinVertical = w > 0 && w <= 16 && h >= 24 && h <= 4096;
  const thinHorizontal = h > 0 && h <= 16 && w >= 24 && w <= 4096;
  if (thinVertical || thinHorizontal) return true;

  const fills = frame.fills as Paint[] | undefined;
  const hasVisibleFill =
    Array.isArray(fills) && fills.some((f) => f.visible !== false && f.type !== "IMAGE");
  if (hasVisibleFill) return false;

  const strokes = "strokes" in frame ? (frame.strokes as Paint[]) : [];
  return strokes.length > 0 && strokes.some((s) => s.visible !== false);
}

const INPUT_NAME_RE =
  /(input|field|textfield|text-field|textarea|search|email|password|tel|phone|otp|pin|combobox|combo-?box)\b/i;

export async function isInputLikeInstance(node: InstanceNode): Promise<boolean> {
  let main: ComponentNode | null = null;
  try {
    const getMainComponent = (
      node as InstanceNode & { getMainComponentAsync?: () => Promise<ComponentNode | null> }
    ).getMainComponentAsync;
    if (typeof getMainComponent === "function") {
      main = (await getMainComponent.call(node)) ?? null;
    }
  } catch {
    // Library/main-component metadata can be unavailable in some contexts.
    // Fall back to node name only instead of failing conversion.
  }
  const name = (main?.name ?? node.name ?? "").toLowerCase();
  return INPUT_NAME_RE.test(name);
}

/** Exporter `meta.figma.inference` when routing an INSTANCE to `elementInput` without element-level annotations. */
export function inferElementInputInferenceMeta(): {
  kind: "elementInput";
  confidence: "medium";
  detail: string;
} {
  return { kind: "elementInput", confidence: "medium", detail: "main-component-name" };
}

export async function isLikelyFormFrame(frame: FrameNode): Promise<boolean> {
  const stripped = stripAnnotations(frame.name || "").toLowerCase();
  if (/\bform\b/i.test(stripped)) return true;

  const visible = frame.children.filter((c) => c.visible !== false);
  if (visible.length < 2) return false;

  let inputLike = 0;
  for (const c of visible) {
    if (c.type === "INSTANCE") {
      if (await isInputLikeInstance(c)) inputLike += 1;
    }
  }
  return inputLike >= 2;
}
