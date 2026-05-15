"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildSvgElementSnippet } from "./build-snippet";
import { normalizeSvgVariant, readPersistedSvg, toSvgExportJson } from "./normalization";
import type { SvgVariantDefaults, SvgVariantKey, PersistedSvgDefaults } from "./types";

const useBaseSvgController = createSimpleElementDevController<
  SvgVariantKey,
  SvgVariantDefaults,
  PersistedSvgDefaults
>({
  elementKey: "svg",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedSvg,
  normalizeVariant: normalizeSvgVariant,
  buildSnippet: buildSvgElementSnippet,
  toExportJson: toSvgExportJson,
  toPersisted: (defaultVariant, variants) => ({ v: 1, defaultVariant, variants }),
});

export function useSvgElementDevController() {
  const c = useBaseSvgController();
  return {
    ...c,
    resetSvgDefaults: c.resetDefaults,
  };
}

export type SvgElementDevController = ReturnType<typeof useSvgElementDevController>;
