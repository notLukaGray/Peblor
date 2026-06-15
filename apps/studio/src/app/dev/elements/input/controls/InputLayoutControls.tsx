import { SharedFoundationLayoutFields } from "@/app/dev/elements/_shared/dev-controls";
import type { InputVariantDefaults } from "../types";
import type { InputElementDevController } from "../useInputElementDevController";

export function InputLayoutControls({ controller }: { controller: InputElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Foundation layout controls for input placement. Margins, radius, width/height, and
          z-index.
        </p>
      </div>

      <SharedFoundationLayoutFields<InputVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
