import { clampGamut, converter, formatCss, parse, wcagContrast } from "culori";
import type { M1TokenId } from "@/app/theme/pb-color-tokens";

type ThemeMode = "light" | "dark";

type Oklch = { mode: "oklch"; l: number; c: number; h?: number };

const toOklch = converter("oklch");

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const clampChroma = (n: number) => Math.min(0.37, Math.max(0, n));

function normalizeHue(h: number): number {
  let out = h;
  while (out < 0) out += 360;
  while (out >= 360) out -= 360;
  return out;
}

function clampOklch(o: Oklch): Oklch {
  const clipped = toOklch(clampGamut("rgb")(o));
  if (!clipped || clipped.mode !== "oklch") {
    return {
      mode: "oklch",
      l: clamp01(o.l),
      c: clampChroma(o.c),
      h: o.h == null ? undefined : normalizeHue(o.h),
    };
  }
  return {
    mode: "oklch",
    l: clamp01(clipped.l ?? o.l),
    c: clampChroma(clipped.c ?? o.c),
    h: clipped.h == null ? undefined : normalizeHue(clipped.h),
  };
}

function formatPbColor(o: Oklch): string {
  return formatCss(clampOklch(o)) ?? "oklch(0.5 0 0)";
}

function asOklch(css: string, fallback: Oklch): Oklch {
  const parsed = parse(css);
  if (!parsed) return fallback;
  const o = toOklch(parsed);
  if (!o || o.mode !== "oklch") return fallback;
  return clampOklch({
    mode: "oklch",
    l: o.l ?? fallback.l,
    c: o.c ?? fallback.c,
    h: o.h ?? fallback.h,
  });
}

function withAdjustments(base: Oklch, dl: number, dc: number, dh: number): Oklch {
  return clampOklch({
    mode: "oklch",
    l: base.l + dl,
    c: base.c + dc,
    h: base.h == null ? undefined : normalizeHue(base.h + dh),
  });
}

function withLc(base: Oklch, l: number, c: number): Oklch {
  return clampOklch({
    mode: "oklch",
    l,
    c,
    h: base.h,
  });
}

function pickReadableInk(fill: Oklch): Oklch {
  const darkInk: Oklch = {
    mode: "oklch",
    l: 0.13,
    c: Math.min(0.02, fill.c * 0.2),
    h: fill.h,
  };
  const lightInk: Oklch = { mode: "oklch", l: 0.985, c: 0, h: fill.h };
  const darkRatio = wcagContrast(darkInk, fill) ?? 0;
  const lightRatio = wcagContrast(lightInk, fill) ?? 0;
  return darkRatio >= lightRatio ? darkInk : lightInk;
}

function statusFill(mode: ThemeMode, h: number): Oklch {
  return clampOklch({
    mode: "oklch",
    l: mode === "light" ? 0.58 : 0.7,
    c: mode === "light" ? 0.19 : 0.165,
    h,
  });
}

export const PB_DERIVED_TOKEN_IDS = [
  "--pb-surface-root",
  "--pb-surface-raised",
  "--pb-surface-overlay",
  "--pb-surface-sunken",
  "--pb-surface-muted",
  "--pb-text-primary",
  "--pb-text-secondary",
  "--pb-text-muted",
  "--pb-text-inverse",
  "--pb-border",
  "--pb-border-strong",
  "--pb-input",
  "--pb-ring",
  "--pb-danger",
  "--pb-on-danger",
  "--pb-success",
  "--pb-on-success",
  "--pb-warning",
  "--pb-on-warning",
  "--pb-info",
  "--pb-on-info",
  "--pb-chart-1",
  "--pb-chart-2",
  "--pb-chart-3",
  "--pb-chart-4",
  "--pb-chart-5",
  "--pb-sidebar-surface",
  "--pb-sidebar-foreground",
  "--pb-sidebar-primary",
  "--pb-on-sidebar-primary",
  "--pb-sidebar-accent",
  "--pb-on-sidebar-accent",
  "--pb-sidebar-border",
  "--pb-sidebar-ring",
] as const;

export type PbDerivedTokenId = (typeof PB_DERIVED_TOKEN_IDS)[number];

export type PbDerivedTokens = Record<PbDerivedTokenId, string>;

export function derivePbThemeTokens(
  brand: Record<M1TokenId, string>,
  mode: ThemeMode
): PbDerivedTokens {
  const isLight = mode === "light";

  const primary = asOklch(brand["--pb-primary"], {
    mode: "oklch",
    l: isLight ? 0.25 : 0.85,
    c: 0.03,
    h: 250,
  });
  const secondary = asOklch(brand["--pb-secondary"], {
    mode: "oklch",
    l: isLight ? 0.97 : 0.25,
    c: 0.015,
    h: primary.h,
  });
  const accent = asOklch(brand["--pb-accent"], {
    mode: "oklch",
    l: isLight ? 0.94 : 0.3,
    c: 0.05,
    h: primary.h == null ? 280 : normalizeHue(primary.h + 22),
  });

  const surfaceHue = secondary.h ?? accent.h ?? primary.h;
  const neutralBase = clampOklch({
    mode: "oklch",
    l: isLight ? Math.max(0.965, secondary.l) : Math.min(0.18, secondary.l),
    c: Math.min(0.012, Math.max(secondary.c * 0.22, 0)),
    h: surfaceHue,
  });

  const surfaceRoot = neutralBase;
  const surfaceRaised = withAdjustments(neutralBase, isLight ? 0.012 : 0.04, 0, 0);
  const surfaceOverlay = withAdjustments(neutralBase, isLight ? 0.02 : 0.05, 0, 0);
  const surfaceSunken = withAdjustments(neutralBase, isLight ? -0.035 : 0.02, 0.003, 0);
  const surfaceMuted = withAdjustments(neutralBase, isLight ? -0.02 : 0.05, 0.002, 0);

  const textPrimary = pickReadableInk(surfaceRoot);
  const textSecondary = withLc(
    textPrimary,
    textPrimary.l < 0.5 ? textPrimary.l + 0.06 : textPrimary.l - 0.08,
    Math.min(0.03, textPrimary.c + 0.005)
  );
  const textMuted = withLc(
    textPrimary,
    textPrimary.l < 0.5 ? textPrimary.l + 0.38 : textPrimary.l - 0.26,
    Math.min(0.02, textPrimary.c + 0.003)
  );
  const textInverse = pickReadableInk(textPrimary);

  const border = withAdjustments(surfaceRoot, isLight ? -0.09 : 0.08, 0.003, 0);
  const borderStrong = withAdjustments(surfaceRoot, isLight ? -0.15 : 0.14, 0.005, 0);
  const input = withAdjustments(surfaceRoot, isLight ? -0.085 : 0.11, 0.004, 0);
  const ring = clampOklch({
    mode: "oklch",
    l: isLight ? 0.62 : 0.68,
    c: Math.max(0.05, Math.min(0.16, primary.c * 0.75 + 0.02)),
    h: primary.h,
  });

  const danger = statusFill(mode, 24);
  const success = statusFill(mode, 155);
  const warning = statusFill(mode, 88);
  const info = statusFill(mode, 252);

  const chartHue = primary.h ?? accent.h ?? 250;
  const chartBaseL = isLight ? 0.61 : 0.68;
  const chartBaseC = isLight ? 0.15 : 0.17;
  const chart1 = clampOklch({
    mode: "oklch",
    l: chartBaseL,
    c: chartBaseC,
    h: chartHue,
  });
  const chart2 = withAdjustments(chart1, isLight ? -0.01 : 0.01, -0.02, 48);
  const chart3 = withAdjustments(chart1, isLight ? -0.08 : -0.02, -0.035, -42);
  const chart4 = withAdjustments(chart1, isLight ? 0.12 : 0.06, -0.015, 120);
  const chart5 = withAdjustments(chart1, isLight ? 0.06 : 0.03, -0.005, -118);

  const sidebarSurface = isLight
    ? withAdjustments(surfaceRoot, -0.01, 0.002, 0)
    : withAdjustments(surfaceRoot, 0.06, 0.005, 0);
  const sidebarForeground = pickReadableInk(sidebarSurface);
  const sidebarPrimary = isLight
    ? primary
    : withLc(primary, 0.56, Math.max(0.08, primary.c + 0.02));
  const sidebarAccent = isLight
    ? withAdjustments(accent, -0.015, 0, 0)
    : withAdjustments(sidebarSurface, 0.05, 0.01, 24);
  const sidebarBorder = isLight ? border : withAdjustments(sidebarSurface, 0.09, 0.003, 0);
  const sidebarRing = isLight ? ring : withAdjustments(ring, 0.02, 0, 0);

  return {
    "--pb-surface-root": formatPbColor(surfaceRoot),
    "--pb-surface-raised": formatPbColor(surfaceRaised),
    "--pb-surface-overlay": formatPbColor(surfaceOverlay),
    "--pb-surface-sunken": formatPbColor(surfaceSunken),
    "--pb-surface-muted": formatPbColor(surfaceMuted),
    "--pb-text-primary": formatPbColor(textPrimary),
    "--pb-text-secondary": formatPbColor(textSecondary),
    "--pb-text-muted": formatPbColor(textMuted),
    "--pb-text-inverse": formatPbColor(textInverse),
    "--pb-border": formatPbColor(border),
    "--pb-border-strong": formatPbColor(borderStrong),
    "--pb-input": formatPbColor(input),
    "--pb-ring": formatPbColor(ring),
    "--pb-danger": formatPbColor(danger),
    "--pb-on-danger": formatPbColor(pickReadableInk(danger)),
    "--pb-success": formatPbColor(success),
    "--pb-on-success": formatPbColor(pickReadableInk(success)),
    "--pb-warning": formatPbColor(warning),
    "--pb-on-warning": formatPbColor(pickReadableInk(warning)),
    "--pb-info": formatPbColor(info),
    "--pb-on-info": formatPbColor(pickReadableInk(info)),
    "--pb-chart-1": formatPbColor(chart1),
    "--pb-chart-2": formatPbColor(chart2),
    "--pb-chart-3": formatPbColor(chart3),
    "--pb-chart-4": formatPbColor(chart4),
    "--pb-chart-5": formatPbColor(chart5),
    "--pb-sidebar-surface": formatPbColor(sidebarSurface),
    "--pb-sidebar-foreground": formatPbColor(sidebarForeground),
    "--pb-sidebar-primary": formatPbColor(sidebarPrimary),
    "--pb-on-sidebar-primary": formatPbColor(pickReadableInk(sidebarPrimary)),
    "--pb-sidebar-accent": formatPbColor(sidebarAccent),
    "--pb-on-sidebar-accent": formatPbColor(pickReadableInk(sidebarAccent)),
    "--pb-sidebar-border": formatPbColor(sidebarBorder),
    "--pb-sidebar-ring": formatPbColor(sidebarRing),
  };
}
