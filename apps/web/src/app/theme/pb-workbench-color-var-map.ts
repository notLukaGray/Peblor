import type { ColorToolPersistedV2 } from "@/app/dev/colors/color-tool-persistence";
import { proposeM1Values } from "@/app/theme/palette-suggest";
import { M1_TOKEN_IDS } from "@/app/theme/pb-color-tokens";
import { derivePbThemeTokens, PB_DERIVED_TOKEN_IDS } from "@/app/theme/pb-color-derived-tokens";

/**
 * Flat map of `--pb-*` color custom properties for a theme mode, derived from the
 * same persisted shape as `/dev/colors` (M1 seeds + rows).
 */
export function buildWorkbenchThemeColorVarMap(
  colors: ColorToolPersistedV2,
  mode: "light" | "dark"
): Record<string, string> {
  const seeds = mode === "light" ? colors.seedsLight : colors.seedsDark;
  const rows = mode === "light" ? colors.rowsLight : colors.rowsDark;
  const m1 = proposeM1Values(seeds, rows, mode);
  const derived = derivePbThemeTokens(m1, mode);
  const out: Record<string, string> = {};
  for (const id of M1_TOKEN_IDS) out[id] = m1[id];
  for (const id of PB_DERIVED_TOKEN_IDS) out[id] = derived[id];
  return out;
}
