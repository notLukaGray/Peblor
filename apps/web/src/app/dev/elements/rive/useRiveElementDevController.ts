"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import {
  buildRiveElementSnippet,
  normalizeRiveVariant,
  readPersistedRive,
  toRiveExportJson,
} from "./normalization";
import type { PersistedRiveDefaults, RiveVariantDefaults, RiveVariantKey } from "./types";

const useBaseController = createSimpleElementDevController<
  RiveVariantKey,
  RiveVariantDefaults,
  PersistedRiveDefaults
>({
  elementKey: "rive",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedRive,
  normalizeVariant: normalizeRiveVariant,
  buildSnippet: buildRiveElementSnippet,
  toExportJson: toRiveExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useRiveElementDevController() {
  const c = useBaseController();
  return {
    ...c,
    resetRiveDefaults: c.resetDefaults,
  };
}

export type RiveElementDevController = ReturnType<typeof useRiveElementDevController>;
