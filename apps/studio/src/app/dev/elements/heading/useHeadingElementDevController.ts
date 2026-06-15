"use client";

import { createTypographyElementDevController } from "@/app/dev/elements/_shared/createTypographyElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildHeadingElementSnippet } from "./build-snippet";
import {
  normalizeHeadingVariant,
  readPersistedHeading,
  toHeadingExportJson,
} from "./normalization";
import type { HeadingVariantDefaults, HeadingVariantKey, PersistedHeadingDefaults } from "./types";

const useBaseHeadingController = createTypographyElementDevController<
  HeadingVariantKey,
  HeadingVariantDefaults,
  PersistedHeadingDefaults
>({
  elementKey: "heading",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedHeading,
  normalizeVariant: normalizeHeadingVariant,
  buildSnippet: buildHeadingElementSnippet,
  toExportJson: toHeadingExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useHeadingElementDevController() {
  const controller = useBaseHeadingController();
  return {
    ...controller,
    resetHeadingDefaults: controller.resetDefaults,
  };
}

export type HeadingElementDevController = ReturnType<typeof useHeadingElementDevController>;
