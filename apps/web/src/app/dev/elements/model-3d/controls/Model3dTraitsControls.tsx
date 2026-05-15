import { SharedVisualTraitsFields } from "@/app/dev/elements/_shared/dev-controls";
import type { Model3dElementDevController } from "../useModel3dElementDevController";

export function Model3dTraitsControls({ controller }: { controller: Model3dElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Traits
        </p>
      </div>
      <SharedVisualTraitsFields
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
        showPriorityLoading={false}
      />
    </>
  );
}
