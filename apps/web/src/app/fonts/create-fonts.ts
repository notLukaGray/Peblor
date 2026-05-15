import localFont from "next/font/local";

/**
 * Local font declarations.
 *
 * TURBOPACK REQUIREMENT: All options passed to `localFont()` must be explicit
 * string/boolean literals — no computed values or config references.
 * This is why file paths and options live here as literals rather than being
 * derived from config.ts.
 *
 * KEEPING IN SYNC:
 *   When you add / change local font files, update both:
 *     1. The `src` array below (literal paths — Turbopack static analysis).
 *     2. The matching `local` entry in config.ts (documents the same files).
 *
 * ─── STATIC font (multiple weight files) ─────────────────────────────────────
 *
 *   export const primaryFontLocal = localFont({
 *     src: [
 *       { path: "../../../public/font/Gothica-Book.woff2",  weight: "500", style: "normal" },
 *       { path: "../../../public/font/Gothica-Bold.woff2",  weight: "700", style: "normal" },
 *       { path: "../../../public/font/Gothica-BookOblique.woff2", weight: "500", style: "italic" },
 *       { path: "../../../public/font/Gothica-BoldOblique.woff2", weight: "700", style: "italic" },
 *     ],
 *     variable: "--font-primary",
 *     display: "swap",
 *     preload: true,
 *     adjustFontFallback: "Arial",
 *   });
 *
 * ─── VARIABLE font (single file, full weight axis) ───────────────────────────
 *
 *   export const primaryFontLocal = localFont({
 *     src: [
 *       { path: "../../../public/font/Exo2[wght].woff2", weight: "100 900", style: "normal" },
 *       { path: "../../../public/font/Exo2-Italic[wght].woff2", weight: "100 900", style: "italic" },
 *     ],
 *     variable: "--font-primary",
 *     display: "swap",
 *     preload: true,
 *     adjustFontFallback: "Arial",
 *   });
 *
 *   For italic-in-one-file variable fonts (some support both axes):
 *   src: [{ path: "../../../public/font/Font[wght,ital].woff2", weight: "100 900", style: "oblique 0deg 20deg" }]
 *
 * ─── Current state ────────────────────────────────────────────────────────────
 * Slots below use the stub file until real font files are added to public/font/.
 * Set preload: true once you switch to real files.
 */

export const primaryFontLocal = localFont({
  src: [{ path: "../../../public/font/_local-loader-stub.woff2", weight: "400", style: "normal" }],
  variable: "--font-primary",
  display: "swap",
  preload: false,
  adjustFontFallback: "Arial",
});

export const secondaryFontLocal = localFont({
  src: [{ path: "../../../public/font/_local-loader-stub.woff2", weight: "400", style: "normal" }],
  variable: "--font-secondary",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
});

export const monoFontLocal = localFont({
  src: [{ path: "../../../public/font/_local-loader-stub.woff2", weight: "400", style: "normal" }],
  variable: "--font-mono-face",
  display: "swap",
  preload: false,
  adjustFontFallback: "Arial",
});
