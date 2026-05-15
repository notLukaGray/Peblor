import { type TypeScaleConfig } from "@/app/fonts/type-scale";

const HEADING_TO_VAR: Record<
  keyof Pick<
    TypeScaleConfig,
    "heading2xl" | "headingXl" | "headingLg" | "headingMd" | "headingSm" | "headingXs"
  >,
  string
> = {
  heading2xl: "--pb-text-h1",
  headingXl: "--pb-text-h2",
  headingLg: "--pb-text-h3",
  headingMd: "--pb-text-h4",
  headingSm: "--pb-text-h5",
  headingXs: "--pb-text-h6",
};

const BODY_TO_VAR: Record<
  keyof Pick<TypeScaleConfig, "body2xl" | "bodyXl" | "bodyLg" | "bodyMd" | "bodySm" | "bodyXs">,
  string
> = {
  body2xl: "--pb-text-body-1",
  bodyXl: "--pb-text-body-2",
  bodyLg: "--pb-text-body-3",
  bodyMd: "--pb-text-body-4",
  bodySm: "--pb-text-body-5",
  bodyXs: "--pb-text-body-6",
};

function toClampPx(minPx: number, maxPx: number): string {
  const min = Math.min(minPx, maxPx);
  const max = Math.max(minPx, maxPx);
  const viewportMin = 375;
  const viewportMax = 1280;
  const slope = ((max - min) / (viewportMax - viewportMin)) * 100;
  const intercept = min - (slope * viewportMin) / 100;
  return `clamp(${Number(min.toFixed(3))}px, ${Number(intercept.toFixed(3))}px + ${Number(slope.toFixed(3))}vw, ${Number(max.toFixed(3))}px)`;
}

export function typeScaleToCssVars(scale: TypeScaleConfig): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, cssVar] of Object.entries(HEADING_TO_VAR) as [
    keyof typeof HEADING_TO_VAR,
    string,
  ][]) {
    const entry = scale[key];
    vars[cssVar] =
      key === "heading2xl" || key === "headingXl" || key === "headingLg"
        ? toClampPx(entry.sizeMobile, entry.sizeDesktop)
        : `${entry.sizeDesktop}px`;
  }

  for (const [key, cssVar] of Object.entries(BODY_TO_VAR) as [keyof typeof BODY_TO_VAR, string][]) {
    vars[cssVar] = `${scale[key].sizeDesktop}px`;
  }

  return vars;
}
