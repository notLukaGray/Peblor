import { TypographyCategoryTabs } from "@/app/dev/elements/_shared/dev-controls";
import { VARIANT_LABELS } from "./constants";
import { Model3dAnimationControls } from "./controls/Model3dAnimationControls";
import { Model3dContentControls } from "./controls/Model3dContentControls";
import { Model3dLayoutControls } from "./controls/Model3dLayoutControls";
import { Model3dRuntimeControls } from "./controls/Model3dRuntimeControls";
import { Model3dTraitsControls } from "./controls/Model3dTraitsControls";
import type { Model3dElementDevController } from "./useModel3dElementDevController";

function getSettingsLabel(controller: Model3dElementDevController): string {
  return controller.isCustomVariant ? "Create Custom" : VARIANT_LABELS[controller.activeVariant];
}

export function Model3dSettingsPanel({ controller }: { controller: Model3dElementDevController }) {
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
        visibleCategories={controller.visibleCategories}
        toggleCategoryVisibility={controller.toggleCategoryVisibility}
      />
      {hasAnyCategoryVisible ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {controller.visibleCategories.content ? (
            <Model3dContentControls controller={controller} />
          ) : null}
          {controller.visibleCategories.layout ? (
            <Model3dLayoutControls controller={controller} />
          ) : null}
          {controller.visibleCategories.traits ? (
            <Model3dTraitsControls controller={controller} />
          ) : null}
          {controller.visibleCategories.animation ? (
            <Model3dAnimationControls controller={controller} />
          ) : null}
          {controller.visibleCategories.runtime ? (
            <Model3dRuntimeControls controller={controller} />
          ) : null}
        </div>
      ) : (
        <div className="rounded border border-border/60 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
          Content, Layout, Traits, Animation, and Runtime start minimized. Use the section toggles
          above to expand what you want to edit. Deep model/scene configuration belongs in Custom
          JSON.
        </div>
      )}
    </section>
  );
}
