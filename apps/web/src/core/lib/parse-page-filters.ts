import type { FilterConfig, PageTags } from "@pb/contracts";

type QueryValue = string | string[] | undefined;
export type FilterQuery = Record<string, QueryValue>;

export function parseFiltersFromQuery(
  query: FilterQuery | undefined,
  filterConfig: FilterConfig | undefined
): PageTags {
  if (!query || !filterConfig) return {};
  const result: PageTags = {};
  for (const category of filterConfig.categories) {
    const values = normalizeQueryValues(query[category.key]);
    if (values.length > 0) result[category.key] = values;
  }
  return result;
}

export function buildFilterQueryString(filters: PageTags): string {
  const params = new URLSearchParams();
  for (const [category, values] of Object.entries(filters)) {
    for (const value of values) params.append(category, value);
  }
  const s = params.toString();
  return s.length > 0 ? `?${s}` : "";
}

function normalizeQueryValues(value: QueryValue): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap(splitCsv);
  }
  return splitCsv(value);
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}
