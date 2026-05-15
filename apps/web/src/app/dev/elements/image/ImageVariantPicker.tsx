import type { ImageElementDevController } from "./useImageElementDevController";
import { VARIANT_LABELS, VARIANT_ORDER } from "./constants";

export function ImageVariantPicker({ controller }: { controller: ImageElementDevController }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Variant Picker
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {VARIANT_ORDER.map((key) => {
          const isActive = !controller.isCustomVariant && key === controller.activeVariant;
          const isDefault = key === controller.defaultVariant;
          return (
            <div
              key={key}
              className={`rounded border p-3 transition-colors ${isActive ? "border-foreground/40 bg-foreground/10" : "border-border bg-background"}`}
            >
              <button
                type="button"
                onClick={() => controller.selectVariant(key)}
                className="w-full text-left"
              >
                <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {isDefault ? "Default" : "Variant"}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{VARIANT_LABELS[key]}</p>
              </button>
              {isActive && !isDefault ? (
                <button
                  type="button"
                  onClick={() => controller.setDefaultVariant(key)}
                  className="mt-2 font-mono text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Make default
                </button>
              ) : null}
            </div>
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
