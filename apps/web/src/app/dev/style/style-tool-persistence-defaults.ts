import {
  pbContentGuidelines as COMMITTED_DEFAULTS,
  type PbContentGuidelines,
} from "@/app/theme/pb-content-guidelines-config";
import { emptyLocks, proposePbContentGuidelines } from "@/app/theme/pb-style-suggest";
import {
  createNeutralStyleGuidelines,
  DEV_NEUTRAL_STYLE_SEEDS,
} from "@/app/dev/style/style-tool-baseline";
import {
  coerceStyleToolV2toV3,
  fillRequiredGuidelineDefaults,
} from "@/app/dev/style/style-tool-persistence-coercion";
import type {
  StyleToolPersistedV2,
  StyleToolPersistedV3,
} from "@/app/dev/style/style-tool-persistence-types";

/** Style tool snapshot equivalent to first load of `/dev/style` with no saved prefs. */
export function getDefaultStyleToolPersistedV3(): StyleToolPersistedV3 {
  const seeds = { ...DEV_NEUTRAL_STYLE_SEEDS };
  const locks = emptyLocks();
  const guidelines = fillRequiredGuidelineDefaults(proposePbContentGuidelines(seeds));
  const v2: StyleToolPersistedV2 = { v: 2, seeds, locks, guidelines };
  return coerceStyleToolV2toV3(v2);
}

export function getProductionStyleToolPersistedV3(): StyleToolPersistedV3 {
  const seeds = { ...DEV_NEUTRAL_STYLE_SEEDS };
  const locks = emptyLocks();
  const v2: StyleToolPersistedV2 = {
    v: 2,
    seeds,
    locks,
    guidelines: fillRequiredGuidelineDefaults({
      ...createNeutralStyleGuidelines(),
      ...COMMITTED_DEFAULTS,
    } as PbContentGuidelines),
  };
  return coerceStyleToolV2toV3(v2);
}
