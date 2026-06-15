"use client";

import { createSimpleElementDevController } from "@/app/dev/elements/_shared/createSimpleElementDevController";
import { BASE_DEFAULTS, VARIANT_ORDER } from "./constants";
import { buildVideoElementSnippet } from "./build-snippet";
import {
  normalizeVideoVariant,
  readPersistedVideo,
  toVideoExportJson,
  toVideoPersisted,
} from "./normalization";
import type { VideoVariantDefaults, VideoVariantKey, PersistedVideoDefaults } from "./types";

const useBaseVideoController = createSimpleElementDevController<
  VideoVariantKey,
  VideoVariantDefaults,
  PersistedVideoDefaults
>({
  elementKey: "video",
  defaults: BASE_DEFAULTS,
  variantOrder: VARIANT_ORDER,
  readPersisted: readPersistedVideo,
  normalizeVariant: normalizeVideoVariant,
  buildSnippet: buildVideoElementSnippet,
  toExportJson: toVideoExportJson,
  toPersisted: toVideoPersisted,
});

export function useVideoElementDevController() {
  const controller = useBaseVideoController();
  return {
    ...controller,
    resetVideoDefaults: controller.resetDefaults,
  };
}

export type VideoElementDevController = ReturnType<typeof useVideoElementDevController>;
