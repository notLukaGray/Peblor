const TIER_KEYS = ["base", "sm", "md", "lg", "xl", "2xl"] as const;
type TierKey = (typeof TIER_KEYS)[number];

const collectElementIds = (elements: Array<{ id?: string }>): string[] =>
  elements.map((el) => el.id).filter((id): id is string => !!id);

const validateResponsiveIdMapKeys = (value: unknown, elementIds: Set<string>) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  const recordValue = value as Record<string, unknown>;
  const validateMap = (map: Record<string, unknown> | undefined) =>
    !map || Object.keys(map).every((id) => elementIds.has(id));

  // Tier map { base?, sm?, md?, lg?, xl?, "2xl"? } shape.
  // Only classify as a tier map when at least one tier key exists AND its value
  // is an object (not a primitive like a number or string). This prevents
  // misclassifying a flat record where an element ID happens to match a tier name
  // (e.g. `{ base: 2 }` where "base" is an element ID, not a breakpoint tier).
  const hasTierKey = TIER_KEYS.some(
    (k) => k in recordValue && typeof recordValue[k] === "object" && recordValue[k] !== null
  );
  if (hasTierKey) {
    return TIER_KEYS.every((k) =>
      validateMap(recordValue[k] as Record<string, unknown> | undefined)
    );
  }

  return validateMap(recordValue);
};

export const hasUniqueSectionColumnElementIds = (data: { elements: Array<{ id?: string }> }) => {
  const elementIds = collectElementIds(data.elements);
  if (elementIds.length !== data.elements.length) return false;
  return new Set(elementIds).size === elementIds.length;
};

type TierMap<T> = { [K in TierKey]?: T };

export const hasValidSectionColumnElementOrder = (data: {
  elements: Array<{ id?: string }>;
  elementOrder?: string[] | TierMap<string[]>;
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

  const eo = data.elementOrder as Record<string, string[] | undefined>;

  // Tier map shape
  if (TIER_KEYS.some((k) => k in eo)) {
    return TIER_KEYS.every((k) => validateOrder(eo[k]));
  }

  return true;
};

export const hasValidSectionColumnAssignments = (data: {
  elements: Array<{ id?: string }>;
  columns?: number | TierMap<number>;
  columnAssignments?: Record<string, number> | TierMap<Record<string, number>>;
}) => {
  const elementIds = new Set(collectElementIds(data.elements));

  const resolveColumnCount = (representativeKey: TierKey): number => {
    if (data.columns == null) return 1;
    if (typeof data.columns === "number") return data.columns;
    // tier map shape
    const asTier = data.columns as Record<string, number | undefined>;
    return asTier[representativeKey] ?? asTier["base"] ?? 1;
  };

  const validateAssignments = (
    assignments: Record<string, number> | undefined,
    representativeKey: TierKey
  ) => {
    if (!assignments) return true;
    const maxCol = resolveColumnCount(representativeKey);
    return Object.entries(assignments).every(([id, col]) => elementIds.has(id) && col < maxCol);
  };

  if (typeof data.columnAssignments !== "object" || Array.isArray(data.columnAssignments))
    return true;

  const ca = data.columnAssignments as Record<string, unknown>;

  // Tier map shape
  if (TIER_KEYS.some((k) => k in ca)) {
    const tierCa = ca as TierMap<Record<string, number>>;
    return TIER_KEYS.every((k) => validateAssignments(tierCa[k], k));
  }

  // Flat record shape — assignment must be valid at every configured breakpoint.
  // Use the minimum column count across ALL tiers to ensure no breakpoint is violated
  // (e.g. { lg: 4 } must not reject col=2, and { base: 3, '2xl': 1 } must reject col=2).
  const minColsAcrossTiers = Math.min(...TIER_KEYS.map((k) => resolveColumnCount(k)));
  return Object.entries(data.columnAssignments as Record<string, number>).every(
    ([id, col]) => elementIds.has(id) && col < minColsAcrossTiers
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
