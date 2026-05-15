const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

const REDACTED = "[redacted]";

export function sanitizeProps(
  props: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!props) return props;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = sanitizeValue(value);
  }
  return result;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(EMAIL_PATTERN, REDACTED).replace(PHONE_PATTERN, REDACTED);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    return sanitizeProps(value as Record<string, unknown>);
  }
  return value;
}
