"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildButtonElementSnippet } from "./build-snippet";
import {
  normalizeButtonVariant,
  readPersistedButton,
  toButtonExportJson,
  toButtonPersisted,
} from "./normalization";
import type { ButtonVariantDefaults, ButtonVariantKey, PersistedButtonDefaults } from "./types";

const useBaseButtonController = createSimpleElementDevController<
  ButtonVariantKey,
  ButtonVariantDefaults,
  PersistedButtonDefaults
>({
  elementKey: "button",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedButton,
  normalizeVariant: normalizeButtonVariant,
  buildSnippet: buildButtonElementSnippet,
  toExportJson: toButtonExportJson,
  toPersisted: toButtonPersisted,
});

export function useButtonElementDevController() {
  const controller = useBaseButtonController();
  return {
    ...controller,
    resetButtonDefaults: controller.resetDefaults,
  };
}

export type ButtonElementDevController = ReturnType<typeof useButtonElementDevController>;
