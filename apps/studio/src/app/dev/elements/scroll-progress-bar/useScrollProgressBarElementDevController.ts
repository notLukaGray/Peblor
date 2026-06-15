"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildScrollProgressBarElementSnippet } from "./build-snippet";
import {
  normalizeScrollProgressBarVariant,
  readPersistedScrollProgressBar,
  toScrollProgressBarExportJson,
  toScrollProgressBarPersisted,
} from "./normalization";
import type {
  ScrollProgressBarVariantDefaults,
  ScrollProgressBarVariantKey,
  PersistedScrollProgressBarDefaults,
} from "./types";

const useBaseScrollProgressBarController = createSimpleElementDevController<
  ScrollProgressBarVariantKey,
  ScrollProgressBarVariantDefaults,
  PersistedScrollProgressBarDefaults
>({
  elementKey: "scrollProgressBar",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedScrollProgressBar,
  normalizeVariant: normalizeScrollProgressBarVariant,
  buildSnippet: buildScrollProgressBarElementSnippet,
  toExportJson: toScrollProgressBarExportJson,
  toPersisted: toScrollProgressBarPersisted,
});

export function useScrollProgressBarElementDevController() {
  const controller = useBaseScrollProgressBarController();
  return {
    ...controller,
    resetScrollProgressBarDefaults: controller.resetDefaults,
  };
}

export type ScrollProgressBarElementDevController = ReturnType<
  typeof useScrollProgressBarElementDevController
>;
