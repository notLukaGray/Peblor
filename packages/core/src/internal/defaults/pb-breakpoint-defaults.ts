export type BreakpointDefinitions = {
  mobile: number;
  desktop: number;
};

export const DEFAULT_BREAKPOINTS: BreakpointDefinitions = {
  mobile: 767,
  desktop: 768,
};

export function resolveBreakpointDefinitions(
  breakpoints: Partial<BreakpointDefinitions> | undefined
): BreakpointDefinitions {
  const mobile =
    typeof breakpoints?.mobile === "number" && Number.isFinite(breakpoints.mobile)
      ? Math.max(0, Math.round(breakpoints.mobile))
      : DEFAULT_BREAKPOINTS.mobile;
  const desktop =
    typeof breakpoints?.desktop === "number" && Number.isFinite(breakpoints.desktop)
      ? Math.max(0, Math.round(breakpoints.desktop))
      : DEFAULT_BREAKPOINTS.desktop;
  return { mobile, desktop };
}

export function isMobileViewportWidth(
  viewportWidthPx: number,
  breakpoints: Partial<BreakpointDefinitions> | undefined
): boolean {
  const resolved = resolveBreakpointDefinitions(breakpoints);
  const width = Number.isFinite(viewportWidthPx) ? viewportWidthPx : resolved.desktop;
  return width < resolved.desktop;
}
