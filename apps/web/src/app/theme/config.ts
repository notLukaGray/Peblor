import type { M1TokenId } from "@/app/theme/pb-color-tokens";
import { M1_TOKEN_IDS } from "@/app/theme/pb-color-tokens";
import { derivePbThemeTokens, PB_DERIVED_TOKEN_IDS } from "@/app/theme/pb-color-derived-tokens";

export const pbBrandLight = {
  "--pb-primary": "#002c4b",
  "--pb-on-primary": "#dedede",
  "--pb-secondary": "#f6f2f3",
  "--pb-on-secondary": "#14121c",
  "--pb-accent": "#ff5c8d",
  "--pb-on-accent": "#000000",
  "--pb-link": "#005485",
  "--pb-link-hover": "#940056",
  "--pb-link-active": "#004070",
} as const satisfies Record<M1TokenId, string>;

export const pbBrandDark = {
  "--pb-primary": "#00b3d6",
  "--pb-on-primary": "#000000",
  "--pb-secondary": "#0e0b0c",
  "--pb-on-secondary": "#bdbdbd",
  "--pb-accent": "#ff5c8d",
  "--pb-on-accent": "#000000",
  "--pb-link": "#80e1ff",
  "--pb-link-hover": "#ff8fd0",
  "--pb-link-active": "#d1f4ff",
} as const satisfies Record<M1TokenId, string>;

export function pbBrandCssInline(): string {
  const lightDerived = derivePbThemeTokens(pbBrandLight, "light");
  const darkDerived = derivePbThemeTokens(pbBrandDark, "dark");
  const rootLines = [
    ...M1_TOKEN_IDS.map((id) => `  ${id}: ${pbBrandLight[id]};`),
    ...PB_DERIVED_TOKEN_IDS.map((id) => `  ${id}: ${lightDerived[id]};`),
  ].join("\n");
  const darkLines = [
    ...M1_TOKEN_IDS.map((id) => `  ${id}: ${pbBrandDark[id]};`),
    ...PB_DERIVED_TOKEN_IDS.map((id) => `  ${id}: ${darkDerived[id]};`),
  ].join("\n");
  return `:root {\n${rootLines}\n}\n\n.dark {\n${darkLines}\n}`;
}

export type PbPreviewColorScheme = "light" | "dark";

export function getPbPreviewScopeCssVars(mode: PbPreviewColorScheme): Record<string, string> {
  const brand = mode === "light" ? pbBrandLight : pbBrandDark;
  const derived = derivePbThemeTokens(brand, mode);
  const out: Record<string, string> = {};
  for (const id of M1_TOKEN_IDS) out[id] = brand[id];
  for (const id of PB_DERIVED_TOKEN_IDS) out[id] = derived[id];
  return out;
}
