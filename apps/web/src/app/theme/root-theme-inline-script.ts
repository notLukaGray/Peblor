/**
 * Pre-paint inline script for the root layout — system-preference fallback with cookie override.
 *
 * Runs synchronously in <head> before any CSS is applied. Reads the theme cookie first
 * (returning visitors), falls back to prefers-color-scheme (first visit), and applies
 * .light or .dark to <html> before the browser paints a single pixel. Eliminates the
 * hard theme flash that light-preference users saw when the server unconditionally
 * rendered .dark.
 *
 * The script is injected inline and relies on 'unsafe-inline' in the Content-Security-Policy
 * (required by Next.js 16 RSC streaming). The SHA-256 hash path (nonce-free) was dropped
 * when the CSP moved to 'unsafe-inline'.
 *
 * Cookie name ("theme") and class names ("light"/"dark") must match the constants in
 * apps/web/src/core/providers/theme-provider.tsx (STORAGE_KEY, applyTheme).
 */

// Raw script string — exported as a const so consumers can inline it.
export const ROOT_THEME_SCRIPT_CONTENT: string =
  `(function(){` +
  `var c=document.cookie.match(/(?:^|;\\s*)theme=(light|dark)/);` +
  `var t=c?c[1]:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";` +
  `document.documentElement.classList.remove("light","dark");` +
  `document.documentElement.classList.add(t);` +
  `})()`;

/**
 * NOTE: Preserved for when CSP supports nonce-based inline scripts again.
 * Currently dead because buildCsp() uses 'unsafe-inline' for Next.js RSC streaming compatibility.
 *
 * SHA-256 hash of ROOT_THEME_SCRIPT_CONTENT, base64-encoded for CSP 'sha256-...'.
 * Computed via: crypto.createHash("sha256").update(ROOT_THEME_SCRIPT_CONTENT).digest("base64")
 * If you change ROOT_THEME_SCRIPT_CONTENT, re-compute this value.
 */
// export const ROOT_THEME_SCRIPT_SHA256_BASE64 = "o93tM0h/M7Ahro1q9Ib8unjBQ06FsyENGV5WWpCZhP0=";

export function rootThemeInlineScript(): string {
  return ROOT_THEME_SCRIPT_CONTENT;
}
