import type { M1ColorSeeds, M1RowState } from "@/app/theme/palette-suggest";
import { proposeM1Values } from "@/app/theme/palette-suggest";
import type { M1TokenId } from "@/app/theme/pb-color-tokens";
import { M1_TOKEN_IDS } from "@/app/theme/pb-color-tokens";
import { derivePbThemeTokens, PB_DERIVED_TOKEN_IDS } from "@/app/theme/pb-color-derived-tokens";

/** Minimal structural subset of ColorToolPersistedV2 used by this module. */
export type ColorToolPersistedLike = {
  seedsLight: M1ColorSeeds;
  seedsDark: M1ColorSeeds;
  rowsLight: Record<M1TokenId, M1RowState>;
  rowsDark: Record<M1TokenId, M1RowState>;
};

/**
 * Flat map of `--pb-*` color custom properties for a theme mode, derived from the
 * same persisted shape as `/dev/colors` (M1 seeds + rows).
 */
export function buildWorkbenchThemeColorVarMap(
  colors: ColorToolPersistedLike,
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
