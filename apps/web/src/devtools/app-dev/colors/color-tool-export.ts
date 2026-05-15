import { M1_TOKEN_IDS, type M1TokenId } from "@/app/theme/pb-color-tokens";

/** Full `config.ts` source for paste-replace of `src/app/theme/config.ts`. */
export function buildThemeConfigFileExport(
  light: Record<M1TokenId, string>,
  dark: Record<M1TokenId, string>
): string {
  const fmtObj = (name: "pbBrandLight" | "pbBrandDark", rec: Record<M1TokenId, string>) => {
    const lines = M1_TOKEN_IDS.map(
      (id) => `  ${JSON.stringify(id)}: ${JSON.stringify(rec[id])},`
    ).join("\n");
    return `export const ${name} = {\n${lines}\n} as const satisfies Record<M1TokenId, string>;`;
  };

  const pbInlineFn = [
    "export function pbBrandCssInline(): string {",
    '  const lightDerived = derivePbThemeTokens(pbBrandLight, "light");',
    '  const darkDerived = derivePbThemeTokens(pbBrandDark, "dark");',
    "  const rootLines = [",
    "    ...M1_TOKEN_IDS.map((id) => `  ${id}: ${pbBrandLight[id]};`),",
    "    ...PB_DERIVED_TOKEN_IDS.map((id) => `  ${id}: ${lightDerived[id]};`),",
    '  ].join("\\n");',
    "  const darkLines = [",
    "    ...M1_TOKEN_IDS.map((id) => `  ${id}: ${pbBrandDark[id]};`),",
    "    ...PB_DERIVED_TOKEN_IDS.map((id) => `  ${id}: ${darkDerived[id]};`),",
    '  ].join("\\n");',
    "  return " + "`" + ":root {\\n${rootLines}\\n}\\n\\n.dark {\\n${darkLines}\\n}" + "`" + ";",
    "}",
  ].join("\n");

  return [
    `import type { M1TokenId } from "@/app/theme/pb-color-tokens";`,
    `import { M1_TOKEN_IDS } from "@/app/theme/pb-color-tokens";`,
    `import { derivePbThemeTokens, PB_DERIVED_TOKEN_IDS } from "@/app/theme/pb-color-derived-tokens";`,
    "",
    "/**",
    " * Brand + link seeds for light UI. Edit via `/dev/colors` → copy replaces this file.",
    " * Extended surfaces/status/chart/sidebar tokens derive from these seeds at runtime.",
    " */",
    fmtObj("pbBrandLight", light),
    "",
    fmtObj("pbBrandDark", dark),
    "",
    "/** Emits `:root` / `.dark` blocks; injected at start of `<body>` so it overrides `globals.css`. */",
    pbInlineFn,
    "",
  ].join("\n");
}
