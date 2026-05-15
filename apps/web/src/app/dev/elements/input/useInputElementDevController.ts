"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildInputElementSnippet } from "./build-snippet";
import { normalizeInputVariant, readPersistedInput, toInputExportJson } from "./normalization";
import type { InputVariantDefaults, InputVariantKey, PersistedInputDefaults } from "./types";

const useBaseInputController = createSimpleElementDevController<
  InputVariantKey,
  InputVariantDefaults,
  PersistedInputDefaults
>({
  elementKey: "input",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedInput,
  normalizeVariant: normalizeInputVariant,
  buildSnippet: buildInputElementSnippet,
  toExportJson: toInputExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useInputElementDevController() {
  const controller = useBaseInputController();
  return {
    ...controller,
    resetInputDefaults: controller.resetDefaults,
  };
}

export type InputElementDevController = ReturnType<typeof useInputElementDevController>;
