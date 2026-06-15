"use client";

import { createTypographyElementDevController } from "@/app/dev/elements/_shared/createTypographyElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildBodyElementSnippet } from "./build-snippet";
import { normalizeBodyVariant, readPersistedBody, toBodyExportJson } from "./normalization";
import type { BodyVariantDefaults, BodyVariantKey, PersistedBodyDefaults } from "./types";

const useBaseBodyController = createTypographyElementDevController<
  BodyVariantKey,
  BodyVariantDefaults,
  PersistedBodyDefaults
>({
  elementKey: "body",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedBody,
  normalizeVariant: normalizeBodyVariant,
  buildSnippet: buildBodyElementSnippet,
  toExportJson: toBodyExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useBodyElementDevController() {
  const controller = useBaseBodyController();
  return {
    ...controller,
    resetBodyDefaults: controller.resetDefaults,
  };
}

export type BodyElementDevController = ReturnType<typeof useBodyElementDevController>;
