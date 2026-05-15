import type { PbImageVariantDefaults } from "@/app/theme/pb-builder-defaults";
import {
  SharedFoundationLayoutFields,
  SharedVisualTraitsFields,
} from "@/app/dev/elements/_shared/dev-controls";
import type { ImageElementDevController } from "../useImageElementDevController";

export function ImageTraitsControls({ controller }: { controller: ImageElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  const intro = (
    <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Traits</p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Visual and placement traits for this image type. Applicable fields can include optional
        mobile overrides.
      </p>
    </div>
  );

  return (
    <>
      <SharedFoundationLayoutFields<PbImageVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
        intro={intro}
      />
      <SharedVisualTraitsFields<PbImageVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
