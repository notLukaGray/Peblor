"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildRichTextElementSnippet } from "./build-snippet";
import {
  normalizeRichTextVariant,
  readPersistedRichText,
  toRichTextExportJson,
  toRichTextPersisted,
} from "./normalization";
import type {
  PersistedRichTextDefaults,
  RichTextVariantDefaults,
  RichTextVariantKey,
} from "./types";

const useBaseRichTextController = createSimpleElementDevController<
  RichTextVariantKey,
  RichTextVariantDefaults,
  PersistedRichTextDefaults
>({
  elementKey: "richText",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedRichText,
  normalizeVariant: normalizeRichTextVariant,
  buildSnippet: buildRichTextElementSnippet,
  toExportJson: toRichTextExportJson,
  toPersisted: toRichTextPersisted,
});

export function useRichTextElementDevController() {
  const controller = useBaseRichTextController();
  return {
    ...controller,
    resetRichTextDefaults: controller.resetDefaults,
  };
}

export type RichTextElementDevController = ReturnType<typeof useRichTextElementDevController>;
