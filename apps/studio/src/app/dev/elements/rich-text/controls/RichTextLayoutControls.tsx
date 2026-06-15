import { SharedFoundationLayoutFields } from "@/app/dev/elements/_shared/dev-controls";
import type { RichTextVariantDefaults } from "../types";
import type { RichTextElementDevController } from "../useRichTextElementDevController";

export function RichTextLayoutControls({
  controller,
}: {
  controller: RichTextElementDevController;
}) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Shared layout controls for spacing, width/height, and border radius.
        </p>
      </div>

      <SharedFoundationLayoutFields<RichTextVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
