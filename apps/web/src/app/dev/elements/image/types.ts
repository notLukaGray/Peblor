import type {
  ElementDevRuntimeDraft,
  ElementDevVisibleWhenOperator,
} from "@/app/dev/elements/_shared/dev-controls/runtime-draft-types";
import type { PbImageVariantDefaults, PbImageVariantKey } from "@/app/theme/pb-builder-defaults";

export type PersistedImageDefaults = {
  v: 3;
  defaultVariant: PbImageVariantKey;
  variants: Record<PbImageVariantKey, PbImageVariantDefaults>;
};

export type PersistedImageDefaultsLegacyV2 = {
  v: 2;
  defaultVariant: PbImageVariantKey;
  variants: Record<
    PbImageVariantKey,
    Omit<PbImageVariantDefaults, "animation"> & { animation?: unknown }
  >;
};

export type PersistedImageDefaultsLegacyV1 = {
  v: 1;
  defaultVariant: PbImageVariantKey;
  variants: Record<PbImageVariantKey, Omit<PbImageVariantDefaults, "animation">>;
};

export const CATEGORY_ORDER = ["content", "layout", "traits", "animation", "runtime"] as const;

export type SettingsCategoryKey = (typeof CATEGORY_ORDER)[number];

export type VisibleCategories = Record<SettingsCategoryKey, boolean>;

export type VisibleWhenOperator = ElementDevVisibleWhenOperator;

export type ImageRuntimeDraft = ElementDevRuntimeDraft;
