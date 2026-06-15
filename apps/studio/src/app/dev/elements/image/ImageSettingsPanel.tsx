import { VARIANT_LABELS } from "./constants";
import { ImageCategoryTabs } from "./ImageCategoryTabs";
import type { ImageElementDevController } from "./useImageElementDevController";
import { ImageAnimationControls } from "./controls/ImageAnimationControls";
import { ImageContentControls } from "./controls/ImageContentControls";
import { ImageLayoutControls } from "./controls/ImageLayoutControls";
import { ImageRuntimeControls } from "./controls/ImageRuntimeControls";
import { ImageTraitsControls } from "./controls/ImageTraitsControls";

export function ImageSettingsPanel({ controller }: { controller: ImageElementDevController }) {
  const settingsLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];
  const hasAnyCategoryVisible = Object.values(controller.visibleCategories).some(Boolean);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Image Settings
        </p>
        <span className="rounded bg-foreground/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {settingsLabel}
        </span>
      </div>
      <ImageCategoryTabs controller={controller} />
      {hasAnyCategoryVisible ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {controller.visibleCategories.content ? (
            <ImageContentControls controller={controller} />
          ) : null}
          {controller.visibleCategories.layout ? (
            <ImageLayoutControls controller={controller} />
          ) : null}
          {controller.visibleCategories.traits ? (
            <ImageTraitsControls controller={controller} />
          ) : null}
          {controller.visibleCategories.animation ? (
            <ImageAnimationControls controller={controller} />
          ) : null}
          {controller.visibleCategories.runtime ? (
            <ImageRuntimeControls controller={controller} />
          ) : null}
        </div>
      ) : (
        <div className="rounded border border-border/60 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
          Content, Layout, Traits, Animation, and Runtime start minimized. Use the section toggles
          above to expand what you want to edit.
        </div>
      )}
    </section>
  );
}
