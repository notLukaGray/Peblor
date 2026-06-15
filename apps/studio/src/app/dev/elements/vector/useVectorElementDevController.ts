"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildVectorElementSnippet } from "./build-snippet";
import { normalizeVectorVariant, readPersistedVector, toVectorExportJson } from "./normalization";
import type { VectorVariantDefaults, VectorVariantKey, PersistedVectorDefaults } from "./types";

const useBaseVectorController = createSimpleElementDevController<
  VectorVariantKey,
  VectorVariantDefaults,
  PersistedVectorDefaults
>({
  elementKey: "vector",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedVector,
  normalizeVariant: normalizeVectorVariant,
  buildSnippet: buildVectorElementSnippet,
  toExportJson: toVectorExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useVectorElementDevController() {
  const c = useBaseVectorController();
  return {
    ...c,
    resetVectorDefaults: c.resetDefaults,
  };
}

export type VectorElementDevController = ReturnType<typeof useVectorElementDevController>;
