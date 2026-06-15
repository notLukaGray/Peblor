import { CATEGORY_LABELS } from "./constants";
import { CATEGORY_ORDER } from "./types";
import type { ImageElementDevController } from "./useImageElementDevController";

export function ImageCategoryTabs({ controller }: { controller: ImageElementDevController }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_ORDER.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => controller.toggleCategoryVisibility(category)}
          className={`rounded border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide transition-colors ${controller.visibleCategories[category] ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  );
}
