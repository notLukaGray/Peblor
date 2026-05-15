export type FontWeightMap = {
  thin?: number;
  light?: number;
  book?: number;
  regular?: number;
  bold?: number;
  black?: number;
};

export const FONT_WEIGHT_ROLES = ["thin", "light", "regular", "book", "bold", "black"] as const;
export type FontWeightRole = (typeof FONT_WEIGHT_ROLES)[number];

export type LocalStaticFile = {
  path: string;
  weight: number;
  style: "normal" | "italic";
};

export type LocalFontConfig =
  | { variable: true; path: string; weightRange: string }
  | { variable: false; files: LocalStaticFile[] };

export type FontSlotConfig = {
  source: "local" | "webfont";
  webfont: { family: string };
  local: LocalFontConfig;
  weights: FontWeightMap;
  italic: boolean;
};

// ─── Slot definitions ─────────────────────────────────────────────────────────
//
// To switch a slot from local files to a webfont (or back):
//   change `source` — that's the only line you need to touch.
//
// To change the webfont family:
//   update `webfont.family` to any name from fonts.bunny.net.
//
// To update local files:
//   1. Drop your font files into public/font/
//   2. Update the `local` config here to reflect them
//   3. Update the matching literal src array in create-fonts.ts
//
// To change weight mappings for a new typeface:
//   update `weights` — the CSS vars and typography classes update automatically.

export const primaryFontConfig: FontSlotConfig = {
  source: "local",

  webfont: { family: "Primary Font" },

  local: {
    variable: true,
    path: "../../../public/font/YourFont[wght].woff2",
    weightRange: "100 900",
  },

  weights: {
    thin: 100,
    light: 300,
    regular: 400,
    book: 500,
    bold: 700,
    black: 900,
  },
  italic: true,
};

export const secondaryFontConfig: FontSlotConfig = {
  source: "local",

  webfont: { family: "Secondary Font" },

  local: {
    variable: true,
    path: "../../../public/font/YourFont[wght].woff2",
    weightRange: "400 900",
  },

  weights: {
    thin: 400,
    light: 400,
    regular: 400,
    book: 500,
    bold: 700,
    black: 900,
  },
  italic: true,
};

export const monoFontConfig: FontSlotConfig = {
  source: "local",

  webfont: { family: "Mono Font" },

  local: {
    variable: true,
    path: "../../../public/font/YourFont[wght].woff2",
    weightRange: "300 700",
  },

  weights: {
    thin: 300,
    light: 300,
    regular: 400,
    book: 500,
    bold: 700,
    black: 700,
  },
  italic: true,
};
