import { converter, formatCss, parse, wcagContrast, clampGamut } from "culori";
import { type M1TokenId, M1_ON_PAIR, M1_TOKEN_IDS } from "@/app/theme/pb-color-tokens";

const toOklch = converter("oklch");

// ── Public types ───────────────────────────────────────────────────────────────

export type M1ColorSeeds = {
  /** Primary / brand fill for this theme. */
  primary: string;
  /** Secondary / muted surface fill. */
  secondary: string;
  /** Accent surface fill. */
  accent: string;
  /** Hover / emphasis for links (often higher chroma). */
  linkAccent: string;
};

/** Defaults aligned with current `globals.css` `:root` brand + links. */
export const DEFAULT_M1_SEEDS_LIGHT: M1ColorSeeds = {
  primary: "oklch(0.205 0 0)",
  secondary: "oklch(0.97 0 0)",
  accent: "oklch(0.97 0 0)",
  linkAccent: "#f000b8",
};

/** Defaults aligned with current `globals.css` `.dark` brand + links. */
export const DEFAULT_M1_SEEDS_DARK: M1ColorSeeds = {
  primary: "oklch(0.922 0 0)",
  secondary: "oklch(0.269 0 0)",
  accent: "oklch(0.269 0 0)",
  linkAccent: "#f000b8",
};

export type M1RowState = {
  value: string;
  confirmed: boolean;
  rowVariant: number;
};

/** Light vs dark maps to `globals.css` `:root` / `.dark` heuristics. */
export type M1ThemeMode = "light" | "dark";

/**
 * Inferred harmony between primary and other locked fill hues.
 * Detected automatically — never picked by the user.
 */
export type InferredHarmony =
  | "monochromatic"
  | "analogous"
  | "complementary"
  | "split-complementary"
  | "triadic"
  | "tetradic"
  | "unknown";

export type HarmonyFit = {
  harmony: InferredHarmony;
  /** 0 = no signal (nothing locked), 1 = perfect match. */
  confidence: number;
};

// ── Utility ────────────────────────────────────────────────────────────────────

/** True when every token row is unlocked — fully-fluid mode. */
export function isFullyFluidPalette(rows: Record<M1TokenId, M1RowState>): boolean {
  return M1_TOKEN_IDS.every((id) => !rows[id]?.confirmed);
}

function mix32(a: number, b: number): number {
  return Math.imul(a ^ b, 2654435761) >>> 0;
}

/** Deterministic 32-bit mixer for token id + variant (refresh jitter). */
export function tokenVariantHash(tokenId: string, variant: number): number {
  let h = variant >>> 0;
  for (let i = 0; i < tokenId.length; i++) {
    h = mix32(h, tokenId.charCodeAt(i));
  }
  return h >>> 0;
}

// ── Color math ─────────────────────────────────────────────────────────────────

type Oklch = { mode: "oklch"; l: number; c: number; h?: number };

function asOklch(color: string): Oklch {
  const parsed = parse(color);
  if (!parsed) return { mode: "oklch", l: 0.5, c: 0, h: 0 };
  const o = toOklch(parsed);
  if (!o || o.mode !== "oklch") return { mode: "oklch", l: 0.5, c: 0, h: 0 };
  return { mode: "oklch", l: o.l ?? 0.5, c: o.c ?? 0, h: o.h };
}

function clampOklch(o: Oklch): Oklch {
  const clipped = toOklch(clampGamut("rgb")(o));
  if (!clipped || clipped.mode !== "oklch") {
    return { mode: "oklch", l: o.l, c: o.c, h: o.h };
  }
  return {
    mode: "oklch",
    l: Math.min(1, Math.max(0, clipped.l)),
    c: Math.min(0.37, Math.max(0, clipped.c)),
    h: clipped.h,
  };
}

export function formatPbColor(o: Oklch): string {
  const s = formatCss(clampOklch(o));
  return s ?? "oklch(0.5 0 0)";
}

// ── Harmony inference ──────────────────────────────────────────────────────────

/** Circular hue distance, normalized to [0, 180]. */
function hueDist(a: number, b: number): number {
  const d = (((b - a) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/** Gaussian score: 1.0 when d equals target, falls off with sigma. */
function gScore(d: number, target: number, sigma: number): number {
  const diff = d - target;
  return Math.exp(-(diff * diff) / (2 * sigma * sigma));
}

/**
 * Given the primary hue and any other chromatic locked fill hues, infer the
 * most likely harmony and return a confidence score [0, 1].
 * Confidence is always 0 when no other fills are locked.
 */
export function inferHarmony(primaryHue: number, otherHues: number[]): HarmonyFit {
  if (otherHues.length === 0) return { harmony: "unknown", confidence: 0 };

  const dists = otherHues.map((h) => hueDist(primaryHue, h));

  // Score each harmony by how well locked hue distances match expected offsets.
  // Uses the average best-match score across all locked hues.
  const score = (targets: number[], sigma: number): number => {
    const perHue = dists.map((d) => Math.max(...targets.map((t) => gScore(d, t, sigma))));
    return perHue.reduce((a, b) => a + b, 0) / perHue.length;
  };

  const candidates: [InferredHarmony, number][] = [
    ["monochromatic", score([0], 12)],
    ["analogous", score([30, 45, 60], 20)],
    ["triadic", score([120, 240], 22)],
    ["split-complementary", score([150, 210], 22)],
    ["complementary", score([180], 25)],
    ["tetradic", score([90, 180, 270], 22)],
  ];

  const [harmony, confidence] = candidates.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { harmony, confidence };
}

/** Expected secondary and accent hues for a given primary hue and harmony. */
function harmonyTargetHues(
  primaryHue: number,
  harmony: InferredHarmony
): { secondary: number; accent: number } {
  const h = primaryHue;
  switch (harmony) {
    case "complementary":
      // Secondary stays near primary family; accent is the opposite
      return { secondary: h, accent: (h + 180) % 360 };
    case "split-complementary":
      return { secondary: (h + 150) % 360, accent: (h + 210) % 360 };
    case "triadic":
      return { secondary: (h + 120) % 360, accent: (h + 240) % 360 };
    case "tetradic":
      return { secondary: (h + 90) % 360, accent: (h + 180) % 360 };
    case "analogous":
      return { secondary: (h + 30 + 360) % 360, accent: (h - 30 + 360) % 360 };
    case "monochromatic":
    case "unknown":
    default:
      return { secondary: h, accent: h };
  }
}

/** Shortest arc blend between two hues on the color wheel. */
function blendHue(from: number, to: number, t: number): number {
  const arc = ((to - from + 540) % 360) - 180;
  return (((from + arc * t) % 360) + 360) % 360;
}

// ── Jitter ─────────────────────────────────────────────────────────────────────

/**
 * Jitter scale: higher = wider lottery.
 * Starts wide when few fills are locked and harmony is uncertain;
 * narrows as the user locks colors and the harmony becomes clear.
 */
function computeJitterScale(confidence: number, lockedFillCount: number): number {
  const base = Math.max(0.5, 4.5 - lockedFillCount * 1.0);
  return Math.max(0.4, base * (1 - confidence * 0.55));
}

/**
 * Deterministic jitter around a base OKLCH color.
 * `scale` controls the exploration width:
 *   1.0 → ±15° hue, ±0.04 chroma, ±0.02 lightness
 *   4.5 → ±67° hue, ±0.18 chroma, ±0.09 lightness  (initial wide lottery)
 *   0.4 → fine-tuning mode
 */
export function jitterOklch(base: Oklch, tokenId: string, rowVariant: number, scale = 1.0): Oklch {
  const h = tokenVariantHash(tokenId, rowVariant);
  const dH = ((h & 0xff) / 255 - 0.5) * 30 * scale;
  const dC = (((h >> 8) & 0xff) / 255 - 0.5) * 0.08 * scale;
  const dL = (((h >> 16) & 0xff) / 255 - 0.5) * 0.04 * scale;

  const chroma = base.c ?? 0;
  const rawH = base.h ?? 0;
  // Keep hue stable for near-neutral colors (grays) to avoid random hue drift
  const nh = chroma < 0.02 ? rawH : (((rawH + dH) % 360) + 360) % 360;

  return clampOklch({
    mode: "oklch",
    l: Math.min(1, Math.max(0, base.l + dL)),
    c: Math.min(0.37, Math.max(0, chroma + dC)),
    h: nh,
  });
}

// ── WCAG AA ────────────────────────────────────────────────────────────────────

const WCAG_AA_RATIO = 4.5;

/**
 * Neutral foreground OKLCH on `fill` meeting WCAG AA (4.5:1), via binary
 * search on lightness. Always targets AA — no user-facing level picker needed.
 */
export function fitOnFill(fill: Oklch): Oklch {
  const fillO = clampOklch(fill);
  const lightFill = fillO.l >= 0.55;
  let lo = lightFill ? 0 : 0.52;
  let hi = lightFill ? 0.48 : 1;

  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const cand: Oklch = { mode: "oklch", l: mid, c: 0, h: 0 };
    const ratio = wcagContrast(cand, fillO);
    if (lightFill) {
      if (ratio >= WCAG_AA_RATIO) lo = mid;
      else hi = mid;
    } else {
      if (ratio >= WCAG_AA_RATIO) hi = mid;
      else lo = mid;
    }
  }

  return clampOklch({ mode: "oklch", l: lightFill ? lo : hi, c: 0, h: 0 });
}

// ── Seed-fill helpers ──────────────────────────────────────────────────────────

/**
 * Propose a fill from a seed.
 * At rowVariant 0 the seed is returned exactly — the token equals what you typed.
 * After Refresh (rowVariant > 0) jitter explores variations around the seed.
 */
function proposeSeedFill(
  seedCss: string,
  tokenId: M1TokenId,
  rowVariant: number,
  scale: number
): Oklch {
  const base = asOklch(seedCss);
  return rowVariant === 0 ? clampOklch(base) : jitterOklch(base, tokenId, rowVariant, scale);
}

/**
 * Derive the secondary surface from the relationship between primary and accent.
 * Secondary is always generated — it's the only token the user never sets directly.
 * Blends toward harmony-appropriate hues as confidence in the detected harmony grows.
 */
function deriveSecondary(
  primary: Oklch,
  accent: Oklch,
  rows: Record<M1TokenId, M1RowState>,
  theme: M1ThemeMode,
  jitterScale: number
): Oklch {
  const primaryHue = primary.h ?? 0;
  const harmonyFit =
    (accent.c ?? 0) > 0.03
      ? inferHarmony(primaryHue, [accent.h ?? primaryHue])
      : { harmony: "unknown" as InferredHarmony, confidence: 0 };

  const { secondary: hS } = harmonyTargetHues(primaryHue, harmonyFit.harmony);
  const secHue = blendHue(primaryHue, hS, harmonyFit.confidence);
  const chromaBoost = harmonyFit.confidence * 0.02;

  if (theme === "light") {
    return jitterOklch(
      {
        mode: "oklch",
        l: primary.l > 0.55 ? Math.min(0.99, primary.l + 0.035) : 0.965,
        c: 0.022 + chromaBoost,
        h: secHue,
      },
      "--pb-secondary",
      rows["--pb-secondary"].rowVariant,
      jitterScale
    );
  }
  return jitterOklch(
    { mode: "oklch", l: 0.26, c: 0.028 + chromaBoost, h: secHue },
    "--pb-secondary",
    rows["--pb-secondary"].rowVariant,
    jitterScale
  );
}

/**
 * Returns the detected harmony for the current palette state.
 * Primary and accent always contribute — either from their locked value or their seed.
 * Locked secondary can add a third signal when chromatic.
 */
export function detectHarmony(
  seeds: M1ColorSeeds,
  rows: Record<M1TokenId, M1RowState>
): HarmonyFit {
  const effPrimary = rows["--pb-primary"].confirmed
    ? asOklch(rows["--pb-primary"].value)
    : asOklch(seeds.primary);
  const effAccent = rows["--pb-accent"].confirmed
    ? asOklch(rows["--pb-accent"].value)
    : asOklch(seeds.accent);

  const primaryHue = effPrimary.h ?? 0;
  const otherHues: number[] = [];

  if ((effAccent.c ?? 0) > 0.03) otherHues.push(effAccent.h ?? primaryHue);

  if (rows["--pb-secondary"].confirmed) {
    const secO = asOklch(rows["--pb-secondary"].value);
    if ((secO.c ?? 0) > 0.04) otherHues.push(secO.h ?? primaryHue);
  }

  return inferHarmony(primaryHue, otherHues);
}

// ── Link hue helper ────────────────────────────────────────────────────────────

function normalizeHue(primary: Oklch, linkAccentCss: string): number {
  if ((primary.c ?? 0) > 0.02) return primary.h ?? 0;
  const a = asOklch(linkAccentCss);
  if ((a.c ?? 0) > 0.04) return a.h ?? 320;
  return 85;
}

// ── Link proposals ─────────────────────────────────────────────────────────────

/**
 * Binary-search lightness on a chromatic color to hit WCAG AA (4.5:1) against
 * a given surface. Hue and chroma are fixed; only L is adjusted.
 */
function fitLinkOnSurface(surface: Oklch, hue: number, chroma: number): Oklch {
  const s = clampOklch(surface);
  const lightSurface = s.l >= 0.55;
  let lo = lightSurface ? 0.0 : 0.52;
  let hi = lightSurface ? 0.48 : 1.0;

  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const cand: Oklch = { mode: "oklch", l: mid, c: chroma, h: hue };
    const ratio = wcagContrast(cand, s);
    if (lightSurface) {
      if (ratio >= WCAG_AA_RATIO) lo = mid;
      else hi = mid;
    } else {
      if (ratio >= WCAG_AA_RATIO) hi = mid;
      else lo = mid;
    }
  }

  return clampOklch({ mode: "oklch", l: lightSurface ? lo : hi, c: chroma, h: hue });
}

/**
 * Link default: primary hue, meaningful chroma, lightness fitted to AA on secondary.
 * Jitter explores hue ± and chroma range on Refresh — L stays contrast-safe.
 */
function proposeLinkDefault(
  primaryFill: Oklch,
  secondaryFill: Oklch,
  tokenId: M1TokenId,
  rowVariant: number,
  scale: number
): Oklch {
  const hash = tokenVariantHash(tokenId, rowVariant);
  const baseHue = (primaryFill.c ?? 0) > 0.02 ? (primaryFill.h ?? 0) : 40;
  const dH = ((hash & 0xff) / 255 - 0.5) * 40 * Math.min(scale, 2.0);
  const hue = (((baseHue + dH) % 360) + 360) % 360;
  const chroma = 0.13 + (((hash >> 8) & 0xff) / 255) * 0.1; // 0.13–0.23
  return fitLinkOnSurface(secondaryFill, hue, chroma);
}

/**
 * Link hover: linkAccent hue, higher chroma, fitted to AA on secondary.
 */
function proposeLinkHover(
  linkAccentSeed: string,
  secondaryFill: Oklch,
  tokenId: M1TokenId,
  rowVariant: number,
  scale: number
): Oklch {
  const hash = tokenVariantHash(tokenId, rowVariant);
  const base = asOklch(linkAccentSeed);
  const dH = ((hash & 0xff) / 255 - 0.5) * 20 * Math.min(scale, 1.5);
  const hue = ((((base.h ?? 0) + dH) % 360) + 360) % 360;
  const chroma = Math.max(base.c ?? 0, 0.18) + (((hash >> 8) & 0xff) / 255) * 0.06;
  return fitLinkOnSurface(secondaryFill, hue, chroma);
}

/**
 * Link active: same hue as default, pushed to max contrast extreme on secondary.
 */
function proposeLinkActive(
  linkDefault: Oklch,
  secondaryFill: Oklch,
  tokenId: M1TokenId,
  rowVariant: number
): Oklch {
  const hash = tokenVariantHash(tokenId, rowVariant);
  const dH = ((hash & 0xff) / 255 - 0.5) * 10;
  const hue = ((((linkDefault.h ?? 0) + dH) % 360) + 360) % 360;
  // Push chroma up for a more saturated pressed state
  const chroma = Math.min(0.3, (linkDefault.c ?? 0.15) * 1.3);
  return fitLinkOnSurface(secondaryFill, hue, chroma);
}

/**
 * Coherent link hover for fully-fluid mode: blends primary and linkAccent hues,
 * fitted to AA on secondary.
 */
function proposeCoherentLinkHover(
  primary: Oklch,
  linkAccentCss: string,
  secondaryFill: Oklch,
  tokenId: M1TokenId,
  rowVariant: number,
  scale: number
): Oklch {
  const pop = asOklch(linkAccentCss);
  const hP = normalizeHue(primary, linkAccentCss);
  const hA = (pop.c ?? 0) > 0.03 ? (pop.h ?? hP) : hP;
  const blendedHue = (((hA * 0.52 + hP * 0.48) % 360) + 360) % 360;
  const hash = tokenVariantHash(tokenId, rowVariant);
  const dH = ((hash & 0xff) / 255 - 0.5) * 20 * Math.min(scale, 1.5);
  const hue = (((blendedHue + dH) % 360) + 360) % 360;
  const chroma = Math.max(pop.c ?? 0, 0.18);
  return fitLinkOnSurface(secondaryFill, hue, chroma);
}

// ── Proposal helpers ───────────────────────────────────────────────────────────

/**
 * Given the effective primary and accent (from lock or seed), infer harmony
 * and compute a jitter scale for unlocked rows.
 */
function paletteContext(
  effPrimary: Oklch,
  effAccent: Oklch,
  lockedFillCount: number
): { harmony: HarmonyFit; scale: number } {
  const primaryHue = effPrimary.h ?? 0;
  const harmony =
    (effAccent.c ?? 0) > 0.03
      ? inferHarmony(primaryHue, [effAccent.h ?? primaryHue])
      : { harmony: "unknown" as InferredHarmony, confidence: 0 };
  return { harmony, scale: computeJitterScale(harmony.confidence, lockedFillCount) };
}

// ── Full-fluid proposal ────────────────────────────────────────────────────────

/**
 * All rows unlocked.
 * Primary and accent equal their seeds exactly (until Refresh is hit).
 * Secondary derives from the primary ↔ accent relationship — it's the "magic" surface.
 */
function proposeM1ValuesFullyFluid(
  seeds: M1ColorSeeds,
  rows: Record<M1TokenId, M1RowState>,
  theme: M1ThemeMode
): Record<M1TokenId, string> {
  const primaryOklch = asOklch(seeds.primary);
  const accentOklch = asOklch(seeds.accent);
  const { scale } = paletteContext(primaryOklch, accentOklch, 0);

  const primaryFill = proposeSeedFill(
    seeds.primary,
    "--pb-primary",
    rows["--pb-primary"].rowVariant,
    scale
  );
  const accentFill = proposeSeedFill(
    seeds.accent,
    "--pb-accent",
    rows["--pb-accent"].rowVariant,
    scale
  );
  const secondaryFill = deriveSecondary(primaryFill, accentFill, rows, theme, scale);
  const linkDefault = proposeLinkDefault(
    primaryFill,
    secondaryFill,
    "--pb-link",
    rows["--pb-link"].rowVariant,
    scale
  );

  const out = {} as Record<M1TokenId, string>;
  for (const id of M1_TOKEN_IDS) {
    switch (id) {
      case "--pb-primary":
        out[id] = formatPbColor(primaryFill);
        break;
      case "--pb-secondary":
        out[id] = formatPbColor(secondaryFill);
        break;
      case "--pb-accent":
        out[id] = formatPbColor(accentFill);
        break;
      case "--pb-on-primary":
        out[id] = formatPbColor(fitOnFill(primaryFill));
        break;
      case "--pb-on-secondary":
        out[id] = formatPbColor(fitOnFill(secondaryFill));
        break;
      case "--pb-on-accent":
        out[id] = formatPbColor(fitOnFill(accentFill));
        break;
      case "--pb-link":
        out[id] = formatPbColor(linkDefault);
        break;
      case "--pb-link-hover":
        out[id] = formatPbColor(
          proposeCoherentLinkHover(
            primaryFill,
            seeds.linkAccent,
            secondaryFill,
            id,
            rows[id].rowVariant,
            scale
          )
        );
        break;
      case "--pb-link-active":
        out[id] = formatPbColor(
          proposeLinkActive(linkDefault, secondaryFill, id, rows[id].rowVariant)
        );
        break;
      default:
        break;
    }
  }
  return out;
}

// ── Main proposal ──────────────────────────────────────────────────────────────

/**
 * Given seeds and per-row state, compute the CSS color string for every M1 token.
 *
 * Seeds are anchors: at rowVariant 0 each unlocked fill equals its seed exactly.
 * Refresh (rowVariant > 0) explores variations around the seed using lottery jitter.
 * Secondary is always derived from the primary ↔ accent relationship.
 * Locked rows keep their pinned value regardless.
 */
export function proposeM1Values(
  seeds: M1ColorSeeds,
  rows: Record<M1TokenId, M1RowState>,
  theme: M1ThemeMode
): Record<M1TokenId, string> {
  if (isFullyFluidPalette(rows)) {
    return proposeM1ValuesFullyFluid(seeds, rows, theme);
  }

  // Effective primary+accent for context (locked value takes priority over seed)
  const effPrimary = rows["--pb-primary"].confirmed
    ? asOklch(rows["--pb-primary"].value)
    : asOklch(seeds.primary);
  const effAccent = rows["--pb-accent"].confirmed
    ? asOklch(rows["--pb-accent"].value)
    : asOklch(seeds.accent);

  const lockedFillCount = (["--pb-primary", "--pb-secondary", "--pb-accent"] as const).filter(
    (id) => rows[id].confirmed
  ).length;
  const { scale } = paletteContext(effPrimary, effAccent, lockedFillCount);

  const primaryFill = rows["--pb-primary"].confirmed
    ? effPrimary
    : proposeSeedFill(seeds.primary, "--pb-primary", rows["--pb-primary"].rowVariant, scale);
  const accentFill = rows["--pb-accent"].confirmed
    ? effAccent
    : proposeSeedFill(seeds.accent, "--pb-accent", rows["--pb-accent"].rowVariant, scale);
  const secondaryFill = rows["--pb-secondary"].confirmed
    ? asOklch(rows["--pb-secondary"].value)
    : deriveSecondary(primaryFill, accentFill, rows, theme, scale);
  const linkDefault = rows["--pb-link"].confirmed
    ? asOklch(rows["--pb-link"].value)
    : proposeLinkDefault(
        primaryFill,
        secondaryFill,
        "--pb-link",
        rows["--pb-link"].rowVariant,
        scale
      );

  const out = {} as Record<M1TokenId, string>;
  for (const id of M1_TOKEN_IDS) {
    if (rows[id].confirmed) {
      out[id] = rows[id].value;
      continue;
    }
    switch (id) {
      case "--pb-primary":
        out[id] = formatPbColor(primaryFill);
        break;
      case "--pb-secondary":
        out[id] = formatPbColor(secondaryFill);
        break;
      case "--pb-accent":
        out[id] = formatPbColor(accentFill);
        break;
      case "--pb-on-primary":
        out[id] = formatPbColor(fitOnFill(primaryFill));
        break;
      case "--pb-on-secondary":
        out[id] = formatPbColor(fitOnFill(secondaryFill));
        break;
      case "--pb-on-accent":
        out[id] = formatPbColor(fitOnFill(accentFill));
        break;
      case "--pb-link":
        out[id] = formatPbColor(linkDefault);
        break;
      case "--pb-link-hover":
        out[id] = formatPbColor(
          proposeLinkHover(seeds.linkAccent, secondaryFill, id, rows[id].rowVariant, scale)
        );
        break;
      case "--pb-link-active":
        out[id] = formatPbColor(
          proposeLinkActive(linkDefault, secondaryFill, id, rows[id].rowVariant)
        );
        break;
      default:
        break;
    }
  }
  return out;
}

// ── Contrast helpers ───────────────────────────────────────────────────────────

/** Contrast ratio for UI hint; returns undefined if parsing fails. */
export function contrastPair(foregroundCss: string, backgroundCss: string): number | undefined {
  try {
    const a = parse(foregroundCss);
    const b = parse(backgroundCss);
    if (!a || !b) return undefined;
    return wcagContrast(a, b);
  } catch {
    return undefined;
  }
}

export function contrastHintForToken(
  tokenId: M1TokenId,
  values: Record<M1TokenId, string>
): number | undefined {
  const pair = M1_ON_PAIR[tokenId];
  if (!pair) return undefined;
  return contrastPair(values[tokenId], values[pair]);
}

/** Lines for UI tooltips: ratio, normal-text WCAG bucket, large-text bucket. */
export function wcagContrastTooltipLines(ratio: number | undefined): string[] | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  const n = ratio.toFixed(2);
  const normal =
    ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "A (large text only)" : "Below AA";
  const large = ratio >= 4.5 ? "AAA" : ratio >= 3 ? "AA" : "Below AA";
  return [`${n}∶1`, `Normal text: ${normal}`, `Large text: ${large}`];
}

/**
 * Generate a random harmonious seed pair (primary + accent) for both themes.
 * Lightness is adapted per theme so primary reads correctly on its background.
 * Always updates both themes — callers should apply both sets regardless of sync toggle.
 */
export function suggestSeeds(): { seedsLight: M1ColorSeeds; seedsDark: M1ColorSeeds } {
  const primaryHue = Math.random() * 360;
  const offsets = [30, 60, 120, 150, 180];
  const accentHue =
    (primaryHue + (offsets[Math.floor(Math.random() * offsets.length)] ?? 60)) % 360;

  const pC = 0.13 + Math.random() * 0.13; // chroma 0.13–0.26
  const aC = 0.14 + Math.random() * 0.13;
  const pL_light = 0.22 + Math.random() * 0.2; // dark enough to read on light bg
  const pL_dark = 0.78 + Math.random() * 0.14; // light enough to read on dark bg
  const aL = 0.5 + Math.random() * 0.2;

  return {
    seedsLight: {
      primary: formatPbColor({ mode: "oklch", l: pL_light, c: pC, h: primaryHue }),
      secondary: DEFAULT_M1_SEEDS_LIGHT.secondary,
      accent: formatPbColor({ mode: "oklch", l: aL, c: aC, h: accentHue }),
      linkAccent: DEFAULT_M1_SEEDS_LIGHT.linkAccent,
    },
    seedsDark: {
      primary: formatPbColor({ mode: "oklch", l: pL_dark, c: pC * 0.85, h: primaryHue }),
      secondary: DEFAULT_M1_SEEDS_DARK.secondary,
      accent: formatPbColor({ mode: "oklch", l: aL, c: aC, h: accentHue }),
      linkAccent: DEFAULT_M1_SEEDS_DARK.linkAccent,
    },
  };
}

/** Fresh row map: all unconfirmed, variant 0. */
export function initialM1Rows(
  seeds: M1ColorSeeds,
  theme: M1ThemeMode
): Record<M1TokenId, M1RowState> {
  const base = Object.fromEntries(
    M1_TOKEN_IDS.map((id) => [
      id,
      { value: "", confirmed: false, rowVariant: 0 } satisfies M1RowState,
    ])
  ) as Record<M1TokenId, M1RowState>;

  const proposed = proposeM1Values(seeds, base, theme);
  const rows = { ...base };
  for (const id of M1_TOKEN_IDS) {
    rows[id] = { ...rows[id], value: proposed[id] };
  }
  return rows;
}
