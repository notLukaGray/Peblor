function freezeDeep(value: unknown, seen: WeakSet<object>): void {
  if (value === null || typeof value !== "object") return;
  const objectValue = value as object;
  if (seen.has(objectValue)) return;
  seen.add(objectValue);
  Object.freeze(objectValue);
  for (const nested of Object.values(objectValue)) {
    freezeDeep(nested, seen);
  }
}

export function deepFreezeForDev(value: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  freezeDeep(value, new WeakSet<object>());
}
