// RFC 7396 JSON merge patch
export function mergePatch(target: unknown, patch: Record<string, unknown>): unknown {
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    target = {};
  }
  const result = { ...(target as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergePatch(result[key], value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
