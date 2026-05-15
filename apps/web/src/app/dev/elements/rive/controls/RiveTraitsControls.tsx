import { SharedVisualTraitsFields } from "@/app/dev/elements/_shared/dev-controls";
import type { RiveElementDevController } from "../useRiveElementDevController";

export function RiveTraitsControls({ controller }: { controller: RiveElementDevController }) {
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
