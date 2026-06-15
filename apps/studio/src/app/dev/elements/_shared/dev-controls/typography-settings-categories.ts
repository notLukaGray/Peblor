export const TYPOGRAPHY_SETTINGS_CATEGORY_ORDER = [
  "content",
  "layout",
  "traits",
  "animation",
  "runtime",
] as const;

/** Button workbench: interaction = wrapper / link state vars (not shown on other elements). */
export const BUTTON_DEV_SETTINGS_CATEGORY_ORDER = [
  "content",
  "interaction",
  "layout",
  "traits",
  "animation",
  "runtime",
] as const;

export type TypographySettingsCategoryKey =
  | (typeof TYPOGRAPHY_SETTINGS_CATEGORY_ORDER)[number]
  | "interaction";

export type TypographyVisibleCategories = Record<TypographySettingsCategoryKey, boolean>;

export const TYPOGRAPHY_CATEGORY_LABELS: Record<TypographySettingsCategoryKey, string> = {
  content: "Content",
  interaction: "Interaction",
  layout: "Layout",
  traits: "Traits",
  animation: "Animation",
  runtime: "Runtime",
};

export const DEFAULT_TYPOGRAPHY_VISIBLE_CATEGORIES: TypographyVisibleCategories = {
  content: true,
  interaction: false,
  layout: false,
  traits: false,
  animation: false,
  runtime: false,
};
