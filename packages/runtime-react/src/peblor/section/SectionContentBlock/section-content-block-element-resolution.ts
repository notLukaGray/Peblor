import type {
  ElementBlock,
  SectionDefinitionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";

export function resolveSectionContentBlockElements(args: {
  elementsProp?: ElementBlock[];
  elementOrder?: string[] | { mobile?: string[]; desktop?: string[] };
  sectionDefinitions?: Record<string, SectionDefinitionBlock>;
}): ElementBlock[] {
  const { elementsProp = [], elementOrder, sectionDefinitions } = args;
  const withUniqueIds = (elements: ElementBlock[], fallbackPrefix: string): ElementBlock[] => {
    const idCounts = new Map<string, number>();
    return elements.map((element, index) => {
      const candidate = element as ElementBlock & { id?: string };
      const baseId =
        typeof candidate.id === "string" && candidate.id.trim().length > 0
          ? candidate.id
          : `${fallbackPrefix}_${index}`;
      const nextCount = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, nextCount);
      const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
      return { ...candidate, id: uniqueId } as ElementBlock;
    });
  };

  if (elementsProp.length) return withUniqueIds(elementsProp, "element");

  const order = Array.isArray(elementOrder) ? elementOrder : null;
  if (!order?.length || !sectionDefinitions || typeof sectionDefinitions !== "object") return [];

  const resolved: ElementBlock[] = [];
  const idCounts = new Map<string, number>();
  for (const key of order) {
    const def = (sectionDefinitions as Record<string, unknown>)[key];
    if (def && typeof def === "object" && "type" in def) {
      const element = def as ElementBlock & { id?: string };
      const baseId =
        typeof element.id === "string" && element.id.trim().length > 0 ? element.id : key;
      const nextCount = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, nextCount);
      const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
      resolved.push({ ...element, id: uniqueId } as ElementBlock);
    }
  }
  return withUniqueIds(resolved, "definition");
}
