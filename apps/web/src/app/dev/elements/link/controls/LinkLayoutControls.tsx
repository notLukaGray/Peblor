import {
  SharedFoundationLayoutFields,
  SharedTypographySizingFields,
} from "@/app/dev/elements/_shared/dev-controls";
import type { LinkVariantDefaults } from "../types";
import type { LinkElementDevController } from "../useLinkElementDevController";

export function LinkLayoutControls({ controller }: { controller: LinkElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Margins, radius, width/height, alignment, text align, and z-index. Same foundation as
          other elements.
        </p>
      </div>

      <SharedFoundationLayoutFields<LinkVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
      <SharedTypographySizingFields<LinkVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
