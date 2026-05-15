type CookieAttrs = {
  name: string;
  value: string;
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  /** When set, controls `Secure` instead of inferring from NODE_ENV only (SEC-12). */
  secure?: boolean;
};

export function buildCookieHeader(a: CookieAttrs): string {
  const parts = [`${a.name}=${a.value}`, `Path=${a.path ?? "/"}`];
  if (a.maxAge != null) parts.push(`Max-Age=${a.maxAge}`);
  if (a.httpOnly !== false) parts.push("HttpOnly");
  parts.push(`SameSite=${a.sameSite ?? "Lax"}`);
  const secure = a.secure !== undefined ? a.secure : process.env.NODE_ENV === "production";
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
