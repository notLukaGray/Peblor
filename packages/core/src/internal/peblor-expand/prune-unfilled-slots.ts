import type { ElementBlock } from "@pb/contracts/types";

/**
 * Given an expanded element tree and the set of slot ids that were actually filled
 * by the callsite, strip any elements whose slotId is not in filledSlotIds.
 *
 * Safe rule: only prune elements with an explicit slotId field that is absent
 * from filledSlotIds. Elements with no slotId are always kept.
 */
export function pruneUnfilledSlotElements(
  elements: ElementBlock[],
  filledSlotIds: Set<string>
): ElementBlock[] {
  return elements
    .filter((el) => {
      const block = el as Record<string, unknown>;
      const slotId = typeof block.slotId === "string" ? block.slotId : null;
      // No slotId → not a slot container → keep unconditionally
      if (!slotId) return true;
      // Has slotId → only keep if the callsite filled that slot
      return filledSlotIds.has(slotId);
    })
    .map((el) => {
      const block = el as Record<string, unknown>;
      if (Array.isArray(block.elements) && (block.elements as unknown[]).length > 0) {
        return {
          ...el,
          elements: pruneUnfilledSlotElements(block.elements as ElementBlock[], filledSlotIds),
        } as unknown as ElementBlock;
      }
      return el;
    });
}

/**
 * Extract the set of slot ids that a module callsite has filled.
 * A slot is filled if `callsite.slots[slotId]` is a non-null value.
 */
export function getFilledSlotIds(callsite: Record<string, unknown>): Set<string> {
  const slots = callsite.slots;
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return new Set();
  const filled = new Set<string>();
  for (const [key, value] of Object.entries(slots as Record<string, unknown>)) {
    if (value != null) filled.add(key);
  }
  return filled;
}

/**
 * Iterates over module slot definitions and prunes elements whose slotId
 * belongs to a slot not filled by the callsite.
 *
 * Module slots have the shape:
 *   slots: { main: { section: { definitions: {...}, elementOrder: [...] } }, ... }
 *
 * Elements inside section.definitions may carry a `slotId` field.
 * Elements whose slotId is not in filledSlotIds are removed from the
 * section's elementOrder, keeping the definitions intact (no-op for data
 * that doesn't participate in the render tree).
 */
export function pruneModuleSlotElements(
  moduleSlots: Record<string, unknown>,
  filledSlotIds: Set<string>
): void {
  for (const slotDef of Object.values(moduleSlots)) {
    if (!slotDef || typeof slotDef !== "object") continue;
    const section = (slotDef as Record<string, unknown>).section;
    if (!section || typeof section !== "object") continue;
    const s = section as Record<string, unknown>;
    const defs = s.definitions;
    if (!defs || typeof defs !== "object" || Array.isArray(defs)) continue;
    const defsMap = defs as Record<string, unknown>;
    const order = Array.isArray(s.elementOrder)
      ? (s.elementOrder as string[])
      : Object.keys(defsMap);
    const elements = order
      .map((key) => defsMap[String(key)])
      .filter((el): el is ElementBlock => typeof el === "object" && el !== null && "type" in el);
    if (elements.length === 0) continue;
    const pruned = pruneUnfilledSlotElements(elements, filledSlotIds);
    // If pruning removed elements, update elementOrder to match
    if (pruned.length !== elements.length) {
      // Match by defs key position rather than element.id (which may differ from the key).
      const keptIndices = new Set(pruned.map((el) => elements.indexOf(el)).filter((i) => i !== -1));
      s.elementOrder = order.filter((_, i) => keptIndices.has(i));
    }
  }
}
