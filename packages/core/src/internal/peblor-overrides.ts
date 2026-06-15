import type { bgBlock, ElementBlock, SectionBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { BG_BLOCK_TYPE_STRINGS } from "@pb/contracts";

const KNOWN_BG_TYPES = new Set(BG_BLOCK_TYPE_STRINGS);

export type OverridesMap = Record<string, unknown>;

/** Type guard: value has object shape with string `type` (element-like). */
export function looksLikeElementBlock(value: unknown): value is ElementBlock {
  return (
    value != null &&
    typeof value === "object" &&
    "type" in value &&
    typeof (value as ElementBlock).type === "string"
  );
}

/** Apply per-element overrides to sections by element id. Sections without elements are unchanged. */
export function applyElementOverrides(
  sections: SectionBlock[],
  overrides: OverridesMap
): SectionBlock[] {
  if (Object.keys(overrides).length === 0) return sections;
  return sections.map((section) => {
    const s = section as SectionBlock & { elements?: ElementBlock[] };
    if (!Array.isArray(s.elements)) return section;
    const elements = s.elements.map((el) => {
      const id = (el as ElementBlock & { id?: string }).id;
      if (id && overrides[id] != null && looksLikeElementBlock(overrides[id])) {
        return { ...(overrides[id] as ElementBlock) } as ElementBlock;
      }
      return el;
    });
    return { ...section, elements } as SectionBlock;
  });
}

/** Type guard: payload is a valid bgBlock (has known type). */
export function isBgBlockPayload(payload: unknown): payload is bgBlock {
  return (
    payload != null &&
    typeof payload === "object" &&
    "type" in payload &&
    typeof (payload as bgBlock).type === "string" &&
    KNOWN_BG_TYPES.has((payload as bgBlock).type)
  );
}
