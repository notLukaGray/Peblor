import {
  TYPOGRAPHY_CATEGORY_LABELS,
  TYPOGRAPHY_SETTINGS_CATEGORY_ORDER,
  type TypographySettingsCategoryKey,
  type TypographyVisibleCategories,
} from "./typography-settings-categories";

type Props = {
  categories?: readonly TypographySettingsCategoryKey[];
  visibleCategories: TypographyVisibleCategories;
  toggleCategoryVisibility: (key: TypographySettingsCategoryKey) => void;
};

export function TypographyCategoryTabs({
  categories = TYPOGRAPHY_SETTINGS_CATEGORY_ORDER,
  visibleCategories,
  toggleCategoryVisibility,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => toggleCategoryVisibility(category)}
          className={`rounded border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide transition-colors ${
            visibleCategories[category]
              ? "border-foreground/40 bg-foreground/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          {TYPOGRAPHY_CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  );
}
