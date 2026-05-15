import { TypographyCategoryTabs } from "@/app/dev/elements/_shared/dev-controls";
import { VARIANT_LABELS } from "./constants";
import { SvgAnimationControls } from "./controls/SvgAnimationControls";
import { SvgContentControls } from "./controls/SvgContentControls";
import { SvgLayoutControls } from "./controls/SvgLayoutControls";
import { SvgRuntimeControls } from "./controls/SvgRuntimeControls";
import { SvgTraitsControls } from "./controls/SvgTraitsControls";
import type { SvgElementDevController } from "./useSvgElementDevController";

function getSettingsLabel(controller: SvgElementDevController): string {
  return controller.isCustomVariant ? "Create Custom" : VARIANT_LABELS[controller.activeVariant];
}

function getContentScopeKey(controller: SvgElementDevController): string {
  return `${controller.activeVariant}-${controller.isCustomVariant ? "custom" : "variant"}`;
}

export function SvgSettingsPanel({ controller }: { controller: SvgElementDevController }) {
  const settingsLabel = getSettingsLabel(controller);
  const contentScopeKey = getContentScopeKey(controller);
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
            <SvgContentControls key={contentScopeKey} controller={controller} />
          ) : null}
          {controller.visibleCategories.layout ? (
            <SvgLayoutControls controller={controller} />
          ) : null}
          {controller.visibleCategories.traits ? (
            <SvgTraitsControls controller={controller} />
          ) : null}
          {controller.visibleCategories.animation ? (
            <SvgAnimationControls controller={controller} />
          ) : null}
          {controller.visibleCategories.runtime ? (
            <SvgRuntimeControls controller={controller} />
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
