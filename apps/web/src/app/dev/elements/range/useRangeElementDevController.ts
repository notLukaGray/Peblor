"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildRangeElementSnippet } from "./build-snippet";
import { normalizeRangeVariant, readPersistedRange, toRangeExportJson } from "./normalization";
import type { RangeVariantDefaults, RangeVariantKey, PersistedRangeDefaults } from "./types";

const useBaseRangeController = createSimpleElementDevController<
  RangeVariantKey,
  RangeVariantDefaults,
  PersistedRangeDefaults
>({
  elementKey: "range",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedRange,
  normalizeVariant: normalizeRangeVariant,
  buildSnippet: buildRangeElementSnippet,
  toExportJson: toRangeExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useRangeElementDevController() {
  const controller = useBaseRangeController();
  return {
    ...controller,
    resetRangeDefaults: controller.resetDefaults,
  };
}

export type RangeElementDevController = ReturnType<typeof useRangeElementDevController>;
