export const MOBILE_UA_REGEX = /iPhone|iPad|iPod|Android/i;

export function splitTopLevelCommaList(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "," && depth === 0) {
      const token = value.slice(start, i).trim();
      if (token) out.push(token);
      start = i + 1;
    }
  }
  const tail = value.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

export function isMobileFromUserAgent(userAgent: string): boolean {
  return MOBILE_UA_REGEX.test(userAgent);
}

export function parseJsonSafe<T = unknown>(
  raw: string
): { ok: true; data: T } | { ok: false; error: unknown } {
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch (error) {
    return { ok: false, error };
  }
}
