export type ShadowLevel = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export type ShadowEntry = {
  x: string;
  y: string;
  blur: string;
  spread: string;
  color: string;
  inset: boolean;
};

export type ShadowScale = Record<ShadowLevel, string>;

export const DEFAULT_SHADOW_SCALE: ShadowScale = {
  none: "none",
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
};

export const DEFAULT_SHADOW_SCALE_DARK: ShadowScale = {
  none: "none",
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.2)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.2)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.2)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.35), 0 8px 10px -6px rgb(0 0 0 / 0.2)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.5)",
};

export function shadowScaleToCssVars(light: ShadowScale): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(light)) {
    vars[`--pb-shadow-${k}`] = v;
  }
  return vars;
}

export function shadowScaleDarkToCssVars(dark: ShadowScale): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(dark)) {
    vars[`--pb-shadow-${k}`] = v;
  }
  return vars;
}
