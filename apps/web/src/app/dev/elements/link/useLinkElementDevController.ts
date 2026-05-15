"use client";

import { createTypographyElementDevController } from "@/app/dev/elements/_shared/createTypographyElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildLinkElementSnippet } from "./build-snippet";
import { normalizeLinkVariant, readPersistedLink, toLinkExportJson } from "./normalization";
import type { LinkVariantDefaults, LinkVariantKey, PersistedLinkDefaults } from "./types";

const useBaseLinkController = createTypographyElementDevController<
  LinkVariantKey,
  LinkVariantDefaults,
  PersistedLinkDefaults
>({
  elementKey: "link",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedLink,
  normalizeVariant: normalizeLinkVariant,
  buildSnippet: buildLinkElementSnippet,
  toExportJson: toLinkExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useLinkElementDevController() {
  const controller = useBaseLinkController();
  return {
    ...controller,
    resetLinkDefaults: controller.resetDefaults,
  };
}

export type LinkElementDevController = ReturnType<typeof useLinkElementDevController>;
