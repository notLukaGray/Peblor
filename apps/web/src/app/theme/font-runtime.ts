/**
 * CSS custom properties used for typography. `primaryFont` sets `--font-primary` on `<html>`
 * via Next.js; `--font-sans` / `--font-mono` default to that in globals.css.
 */
export const FONT_CSS_VARS = {
  primary: "--font-primary",
  secondary: "--font-secondary",
  sans: "--font-sans",
  serif: "--font-serif",
  /** Monospace stack from `monoFont` */
  monoFace: "--font-mono-face",
  /** Tailwind `font-mono` token maps here in globals.css */
  mono: "--font-mono",
} as const;

/** Override the stack used by `font-sans` and typography utilities (e.g. after loading another face). */
export function setRootFontSans(value: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(FONT_CSS_VARS.sans, value);
}

/** Clear a runtime `--font-sans` override so theme defaults apply again. */
export function resetRootFontSans(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty(FONT_CSS_VARS.sans);
}
