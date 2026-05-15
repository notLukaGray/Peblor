import type { SectionBlock } from "@pb/contracts/types";

/** Normalize a value into a safe key part (alphanumeric + underscores). */
export function normalizeKeyPart(value: string, maxLen = 20): string {
  return value
    .slice(0, maxLen)
    .replace(/\s/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_");
}

function safeHash(value: string, len: number): string {
  return String(value)
    .slice(0, len)
    .replace(/[^a-zA-Z0-9]/g, "_");
}

const sectionKeyMemo = new WeakMap<SectionBlock, Map<number, string>>();

// Elements here are accessed with duck-typing (first.text, first.src) because the function
// reads common text/src fields across many element types without discriminating the union.
function keyFromElements(
  type: string,
  elements: Array<Record<string, unknown>>,
  index: number
): string | null {
  const first = elements[0];
  if (!first) return `${type}_${index}`;
  if (typeof first.text === "string")
    return `${type}_${normalizeKeyPart(first.text, 20)}_${first.text.length}`;
  if (typeof first.src === "string")
    return `${type}_${first.src.slice(-20).replace(/[^a-zA-Z0-9]/g, "_")}`;
  return null;
}

/** Stable key for a section (id when present, else type + content hints, fallback to index). */
export function generateSectionKey(section: SectionBlock, index: number): string {
  const byIndex = sectionKeyMemo.get(section);
  const memoized = byIndex?.get(index);
  if (memoized) return memoized;
  const type = section.type;
  let resolved = `${type}_${index}`;
  if ("id" in section && typeof section.id === "string" && section.id) {
    resolved = `${type}_${section.id}`;
  } else if (
    "elements" in section &&
    Array.isArray(section.elements) &&
    section.elements.length > 0
  ) {
    const k = keyFromElements(type, section.elements, index);
    if (k) resolved = k;
  } else if ("initialX" in section && section.initialX) {
    resolved = `${type}_x_${safeHash(String(section.initialX), 15)}`;
  } else if ("initialY" in section && section.initialY) {
    resolved = `${type}_y_${safeHash(String(section.initialY), 15)}`;
  } else {
    const hasFixed =
      "fixed" in section && section.fixed && "fixedPosition" in section && section.fixedPosition;
    if (hasFixed) {
      resolved = `${type}_fixed_${section.fixedPosition}`;
    } else if (
      type === "sectionTrigger" &&
      "id" in section &&
      typeof section.id === "string" &&
      section.id
    ) {
      resolved = `${type}_${section.id}`;
    } else {
      const hasSticky =
        "sticky" in section && section.sticky && "stickyOffset" in section && section.stickyOffset;
      if (hasSticky && "stickyOffset" in section && section.stickyOffset) {
        resolved = `${type}_offset_${safeHash(String(section.stickyOffset), 10)}`;
      }
    }
  }
  if (byIndex) {
    byIndex.set(index, resolved);
  } else {
    sectionKeyMemo.set(section, new Map([[index, resolved]]));
  }
  return resolved;
}
