import { VARIANT_LABELS } from "./constants";
import type { HeadingElementDevController } from "./useHeadingElementDevController";

export function HeadingVariantPicker({ controller }: { controller: HeadingElementDevController }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Variant picker
      </p>
      <p className="text-[10px] text-muted-foreground">
        Variants match `elementHeadingSchema` + `elementLayoutSchema`. Variant seeds start from the
        neutral dev foundation baseline.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {controller.variantOrder.map((key) => {
          const isActive = !controller.isCustomVariant && key === controller.activeVariant;
          const isDefault = key === controller.defaultVariant;
          return (
            <button
              key={key}
              type="button"
              onClick={() => controller.selectVariant(key)}
              className={`rounded border p-3 text-left transition-colors ${isActive ? "border-foreground/40 bg-foreground/10" : "border-border bg-background hover:bg-muted/60"}`}
            >
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {isDefault ? "Default" : "Variant"}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{VARIANT_LABELS[key]}</p>
            </button>
          );
        })}
        <button
          type="button"
          onClick={controller.selectCustomVariant}
          className={`rounded border p-3 text-left transition-colors ${
            controller.isCustomVariant
              ? "border-foreground/40 bg-foreground/10"
              : "border-border bg-background hover:bg-muted/60"
          }`}
        >
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Variant
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">Create Custom</p>
        </button>
      </div>
    </section>
  );
}
