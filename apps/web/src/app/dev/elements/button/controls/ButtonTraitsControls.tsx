import { SharedVisualTraitsFields } from "@/app/dev/elements/_shared/dev-controls";
import type { ButtonVariantDefaults } from "../types";
import type { ButtonElementDevController } from "../useButtonElementDevController";

export function ButtonTraitsControls({ controller }: { controller: ButtonElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Traits
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Visual and placement traits. Optional mobile overrides apply where fields support
          responsive tuples.
        </p>
      </div>

      <SharedVisualTraitsFields<ButtonVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
        showPriorityLoading={false}
      />
    </>
  );
}
