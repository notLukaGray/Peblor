"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import {
  buildModel3dElementSnippet,
  normalizeModel3dVariant,
  readPersistedModel3d,
  toModel3dExportJson,
} from "./normalization";
import type { Model3dVariantDefaults, Model3dVariantKey, PersistedModel3dDefaults } from "./types";

const useBaseController = createSimpleElementDevController<
  Model3dVariantKey,
  Model3dVariantDefaults,
  PersistedModel3dDefaults
>({
  elementKey: "model3d",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedModel3d,
  normalizeVariant: normalizeModel3dVariant,
  buildSnippet: buildModel3dElementSnippet,
  toExportJson: toModel3dExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useModel3dElementDevController() {
  const c = useBaseController();
  return {
    ...c,
    resetModel3dDefaults: c.resetDefaults,
  };
}

export type Model3dElementDevController = ReturnType<typeof useModel3dElementDevController>;
