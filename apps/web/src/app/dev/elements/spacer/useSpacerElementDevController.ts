"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildSpacerElementSnippet } from "./build-snippet";
import {
  normalizeSpacerVariant,
  readPersistedSpacer,
  toSpacerExportJson,
  toSpacerPersisted,
} from "./normalization";
import type { SpacerVariantDefaults, SpacerVariantKey, PersistedSpacerDefaults } from "./types";

const useBaseSpacerController = createSimpleElementDevController<
  SpacerVariantKey,
  SpacerVariantDefaults,
  PersistedSpacerDefaults
>({
  elementKey: "spacer",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedSpacer,
  normalizeVariant: normalizeSpacerVariant,
  buildSnippet: buildSpacerElementSnippet,
  toExportJson: toSpacerExportJson,
  toPersisted: toSpacerPersisted,
});

export function useSpacerElementDevController() {
  const controller = useBaseSpacerController();
  return {
    ...controller,
    resetSpacerDefaults: controller.resetDefaults,
  };
}

export type SpacerElementDevController = ReturnType<typeof useSpacerElementDevController>;
