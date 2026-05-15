import type { ElementBlock, Peblor } from "@pb/contracts";
import type { DefinitionsMap, SectionWithElements } from "./section-shapes";

export function buildDisplayOrder(page: Peblor): string[] {
  return [...(page.sectionOrder ?? []), ...(page.triggers ?? [])];
}

export function getUnionElementOrder(section: SectionWithElements): string[] | null {
  if (Array.isArray(section.elementOrder)) return section.elementOrder;
  const eo = section.elementOrder;
  if (eo && typeof eo === "object" && ("mobile" in eo || "desktop" in eo)) {
    const desktop = eo.desktop ?? [];
    const mobile = eo.mobile ?? [];
    const seen = new Set<string>();
    const union: string[] = [];
    for (const ref of [...desktop, ...mobile]) {
      if (!seen.has(ref)) {
        seen.add(ref);
        union.push(ref);
      }
    }
    return union.length > 0 ? union : null;
  }
  if (
    Array.isArray(section.elements) &&
    section.elements.length > 0 &&
    typeof section.elements[0] === "string"
  ) {
    return section.elements as string[];
  }
  return null;
}

export function getElementOrder(
  section: SectionWithElements,
  isMobile: boolean | undefined
): string[] | null {
  if (Array.isArray(section.elementOrder)) return section.elementOrder;
  const eo = section.elementOrder;
  if (eo && typeof eo === "object" && ("mobile" in eo || "desktop" in eo)) {
    return isMobile === true
      ? (eo.mobile ?? eo.desktop ?? null)
      : (eo.desktop ?? eo.mobile ?? null);
  }
  if (
    Array.isArray(section.elements) &&
    section.elements.length > 0 &&
    typeof section.elements[0] === "string"
  ) {
    return section.elements as string[];
  }
  return null;
}

export function resolveElements(order: string[], defs: DefinitionsMap): ElementBlock[] {
  const idCounts = new Map<string, number>();
  return order
    .map((k) => {
      const element = defs[k];
      if (element && typeof element === "object" && "type" in element) {
        const candidate = element as ElementBlock & { id?: unknown };
        const baseId =
          typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : k;
        const nextCount = (idCounts.get(baseId) ?? 0) + 1;
        idCounts.set(baseId, nextCount);
        const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
        return { ...candidate, id: uniqueId } as ElementBlock;
      }
      return null;
    })
    .filter(
      (x): x is ElementBlock =>
        x != null &&
        typeof x === "object" &&
        "type" in x &&
        typeof (x as { type: string }).type === "string"
    );
}

export function applyElementIdsAndModules(
  section: SectionWithElements,
  defs: DefinitionsMap,
  namespacePrefix: string
): void {
  if (!Array.isArray(section.elements)) return;
  for (const element of section.elements) {
    if (
      element &&
      typeof element === "object" &&
      "id" in element &&
      typeof element.id === "string" &&
      element.id
    ) {
      element.id = `${namespacePrefix}:${element.id}`;
    }
    const el = element as ElementBlock & { module?: string; moduleConfig?: unknown };
    if (el.module && typeof el.module === "string") {
      const moduleBlock = defs[el.module];
      if (
        moduleBlock &&
        typeof moduleBlock === "object" &&
        "type" in moduleBlock &&
        (moduleBlock as { type: string }).type === "module"
      ) {
        el.moduleConfig = { ...(moduleBlock as Record<string, unknown>) };
      }
    }
  }
}
