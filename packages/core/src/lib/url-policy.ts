/**
 * Shared URL policy for peblor authored URLs.
 *
 * Modes:
 * - `internal`: paths (`/`, `/work`), fragments (`#ref`), bare refs (plain identifiers)
 * - `external`: `http:`, `https:` only
 * - `contact`: `mailto:`, `tel:`
 * - `any`: all of the above combined
 *
 * Always rejects: `javascript:`, `data:`, `vbscript:`, case-insensitive variants,
 * leading-whitespace obfuscation.
 */

export type UrlPolicyMode = "internal" | "external" | "contact" | "any";

const BLOCKED_SCHEMES = ["javascript:", "data:", "vbscript:"] as const;

function isBlocked(url: string): boolean {
  const lowered = url.trim().toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lowered.startsWith(scheme)) return true;
  }
  if (lowered.startsWith("java\nscript:") || lowered.startsWith("java\tscript:")) return true;
  return false;
}

function isBareRef(url: string): boolean {
  if (url.includes(":") || url.startsWith("/") || url.startsWith("#")) return false;
  return url.length > 0 && /^[a-zA-Z_][\w-]*$/.test(url);
}

function isExternal(url: string): boolean {
  const lowered = url.toLowerCase();
  return lowered.startsWith("http:") || lowered.startsWith("https:");
}

function isContact(url: string): boolean {
  const lowered = url.toLowerCase();
  return lowered.startsWith("mailto:") || lowered.startsWith("tel:");
}

export type ResolvedUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: "blocked" | "disallowed" };

/**
 * Validate and normalize an authored URL against the given policy mode.
 *
 * - Rejects dangerous schemes (`javascript:`, `data:`, `vbscript:`) in all modes.
 * - Bare refs (plain identifiers with no scheme/path) are resolved to `#ref` fragments
 *   when the mode includes `internal`.
 * - `http:` / `https:` URLs are only allowed when mode includes `external`.
 * - `mailto:` / `tel:` URLs are only allowed when mode includes `contact`.
 */
export function resolveAuthoredUrl(
  url: string | undefined | null,
  mode: UrlPolicyMode
): ResolvedUrlResult {
  if (url == null || url === "") return { ok: false, reason: "disallowed" };

  const trimmed = url.trim();
  if (trimmed === "") return { ok: false, reason: "disallowed" };

  if (isBlocked(trimmed)) return { ok: false, reason: "blocked" };

  const allowsInternal = mode === "internal" || mode === "any";
  const allowsExternal = mode === "external" || mode === "any";
  const allowsContact = mode === "contact" || mode === "any";

  if (isContact(trimmed)) {
    if (!allowsContact) return { ok: false, reason: "disallowed" };
    return { ok: true, url: trimmed };
  }

  if (isExternal(trimmed)) {
    if (!allowsExternal) return { ok: false, reason: "disallowed" };
    return { ok: true, url: trimmed };
  }

  if (isBareRef(trimmed)) {
    if (!allowsInternal) return { ok: false, reason: "disallowed" };
    return { ok: true, url: `#${trimmed}` };
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    if (!allowsInternal) return { ok: false, reason: "disallowed" };
    return { ok: true, url: trimmed };
  }

  return { ok: false, reason: "disallowed" };
}

/**
 * Resolve a graphic link ref to a safe href value.
 * Bare identifiers become `#ref`. External URLs pass through if allowed.
 */
export function resolveGraphicLinkHref(
  ref: string | undefined | null,
  external: boolean | undefined | null,
  mode: UrlPolicyMode = "any"
): string | null {
  if (ref == null || ref.trim() === "") return null;

  const result = resolveAuthoredUrl(ref, mode);
  if (!result.ok) return null;

  if (external) return result.url;

  if (result.url.startsWith("#") || result.url.startsWith("/")) return result.url;

  return `#${result.url.replace(/^#/, "")}`;
}
