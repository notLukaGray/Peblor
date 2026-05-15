export type BreakpointDefinitions = {
  mobile: number;
  desktop: number;
};

export const DEFAULT_BREAKPOINTS: BreakpointDefinitions = {
  mobile: 767,
  desktop: 768,
};

export function breakpointsToCssVars(breakpoints: BreakpointDefinitions): Record<string, string> {
  return {
    "--pb-breakpoint-mobile": `${Math.max(0, Math.round(breakpoints.mobile))}px`,
    "--pb-breakpoint-desktop": `${Math.max(0, Math.round(breakpoints.desktop))}px`,
  };
}
