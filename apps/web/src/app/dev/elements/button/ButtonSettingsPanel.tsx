import {
  BUTTON_DEV_SETTINGS_CATEGORY_ORDER,
  TypographyCategoryTabs,
} from "@/app/dev/elements/_shared/dev-controls";
import { VARIANT_LABELS } from "./constants";
import { ButtonAnimationControls } from "./controls/ButtonAnimationControls";
import { ButtonContentControls } from "./controls/ButtonContentControls";
import { ButtonLayoutControls } from "./controls/ButtonLayoutControls";
import { ButtonGlassEffectControls } from "./controls/ButtonGlassEffectControls";
import { ButtonRuntimeControls } from "./controls/ButtonRuntimeControls";
import { ButtonStatesPanel } from "./ButtonStatesPanel";
import { ButtonTraitsControls } from "./controls/ButtonTraitsControls";
import type { ButtonElementDevController } from "./useButtonElementDevController";

function getSettingsLabel(controller: ButtonElementDevController): string {
  return controller.isCustomVariant ? "Create Custom" : VARIANT_LABELS[controller.activeVariant];
}

// eslint-disable-next-line complexity
export function ButtonSettingsPanel({ controller }: { controller: ButtonElementDevController }) {
  const settingsLabel = getSettingsLabel(controller);
  const hasAnyCategoryVisible = Object.values(controller.visibleCategories).some(Boolean);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {settingsLabel} Settings
        </p>
        {!controller.isCustomVariant ? (
          <button
            type="button"
            onClick={() => controller.setDefaultVariant(controller.activeVariant)}
            className="rounded border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            Make Default
          </button>
        ) : null}
      </div>
      <TypographyCategoryTabs
        categories={BUTTON_DEV_SETTINGS_CATEGORY_ORDER}
        visibleCategories={controller.visibleCategories}
        toggleCategoryVisibility={controller.toggleCategoryVisibility}
      />
      {hasAnyCategoryVisible ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {controller.visibleCategories.content ? (
            <ButtonContentControls controller={controller} />
          ) : null}
          {controller.visibleCategories.interaction ? (
            <div className="sm:col-span-2">
              <ButtonStatesPanel controller={controller} />
            </div>
          ) : null}
          {controller.visibleCategories.layout ? (
            <ButtonLayoutControls controller={controller} />
          ) : null}
          {controller.visibleCategories.traits ? (
            <ButtonTraitsControls controller={controller} />
          ) : null}
          {controller.visibleCategories.animation ? (
            <ButtonAnimationControls controller={controller} />
          ) : null}
          {controller.visibleCategories.runtime ? (
            <ButtonRuntimeControls controller={controller} />
          ) : null}
        </div>
      ) : (
        <div className="rounded border border-border/60 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
          Content is visible by default. Use the section toggles above to expand interaction,
          layout, traits, animation, or runtime controls.
        </div>
      )}
      {controller.activeVariant === "glass" ? (
        <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
          <ButtonGlassEffectControls controller={controller} />
        </div>
      ) : null}
    </section>
  );
}
