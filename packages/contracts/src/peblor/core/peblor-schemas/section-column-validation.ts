const collectElementIds = (elements: Array<{ id?: string }>): string[] =>
  elements.map((el) => el.id).filter((id): id is string => !!id);

const validateResponsiveIdMapKeys = (
  value: unknown,
  elementIds: Set<string>,
  responsiveKeys: Array<"mobile" | "desktop"> = ["mobile", "desktop"]
) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  const recordValue = value as Record<string, unknown>;
  const validateMap = (map: Record<string, unknown> | undefined) =>
    !map || Object.keys(map).every((id) => elementIds.has(id));
  if (responsiveKeys.some((key) => key in recordValue)) {
    return responsiveKeys.every((key) =>
      validateMap(recordValue[key] as Record<string, unknown> | undefined)
    );
  }
  return validateMap(recordValue);
};

export const hasUniqueSectionColumnElementIds = (data: { elements: Array<{ id?: string }> }) => {
  const elementIds = collectElementIds(data.elements);
  if (elementIds.length !== data.elements.length) return false;
  return new Set(elementIds).size === elementIds.length;
};

export const hasValidSectionColumnElementOrder = (data: {
  elements: Array<{ id?: string }>;
  elementOrder?: string[] | { mobile?: string[]; desktop?: string[] };
}) => {
  const elementIds = new Set(collectElementIds(data.elements));
  const validateOrder = (order: string[] | undefined): boolean => {
    if (!order) return true;
    const seen = new Set<string>();
    for (const id of order) {
      if (!elementIds.has(id) || seen.has(id)) return false;
      seen.add(id);
    }
    return true;
  };

  if (Array.isArray(data.elementOrder)) return validateOrder(data.elementOrder);
  if (!data.elementOrder) return true;
  return validateOrder(data.elementOrder.mobile) && validateOrder(data.elementOrder.desktop);
};

export const hasValidSectionColumnAssignments = (data: {
  elements: Array<{ id?: string }>;
  columns?: number | { mobile?: number; desktop?: number };
  columnAssignments?:
    | Record<string, number>
    | { mobile?: Record<string, number>; desktop?: Record<string, number> };
}) => {
  const elementIds = new Set(collectElementIds(data.elements));
  const resolveColumnCount = (breakpoint: "mobile" | "desktop") => {
    if (data.columns == null) return 1;
    if (typeof data.columns === "number") return data.columns;
    return data.columns[breakpoint] ?? data.columns.mobile ?? data.columns.desktop ?? 1;
  };

  const validateAssignments = (
    assignments: Record<string, number> | undefined,
    breakpoint: "mobile" | "desktop"
  ) => {
    if (!assignments) return true;
    const maxCol = resolveColumnCount(breakpoint);
    return Object.entries(assignments).every(([id, col]) => elementIds.has(id) && col < maxCol);
  };

  if (typeof data.columnAssignments !== "object" || Array.isArray(data.columnAssignments))
    return true;
  if ("mobile" in data.columnAssignments || "desktop" in data.columnAssignments) {
    const responsive = data.columnAssignments as {
      mobile?: Record<string, number>;
      desktop?: Record<string, number>;
    };
    return (
      validateAssignments(responsive.mobile, "mobile") &&
      validateAssignments(responsive.desktop, "desktop")
    );
  }

  const maxColFlat = Math.min(resolveColumnCount("mobile"), resolveColumnCount("desktop"));

  return Object.entries(data.columnAssignments).every(
    ([id, col]) => elementIds.has(id) && col < maxColFlat
  );
};

export const hasValidSectionColumnSpanReferences = (data: {
  elements: Array<{ id?: string }>;
  columnSpan?: unknown;
}) => {
  if (!data.columnSpan) return true;
  return validateResponsiveIdMapKeys(data.columnSpan, new Set(collectElementIds(data.elements)));
};

export const hasValidSectionItemStyleReferences = (data: {
  elements: Array<{ id?: string }>;
  itemStyles?: unknown;
}) => {
  if (!data.itemStyles) return true;
  return validateResponsiveIdMapKeys(data.itemStyles, new Set(collectElementIds(data.elements)));
};

export const hasValidSectionItemLayoutReferences = (data: {
  elements: Array<{ id?: string }>;
  itemLayout?: unknown;
}) => {
  if (!data.itemLayout) return true;
  return validateResponsiveIdMapKeys(data.itemLayout, new Set(collectElementIds(data.elements)));
};
