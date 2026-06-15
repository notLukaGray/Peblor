import type { PbImageVariantDefaults } from "@/app/theme/pb-builder-defaults";
import {
  SharedFoundationLayoutFields,
  SharedLayoutSizingFields,
} from "@/app/dev/elements/_shared/dev-controls";
import type { SpacerVariantDefaults } from "../types";
import type { SpacerElementDevController } from "../useSpacerElementDevController";

export function SpacerLayoutControls({ controller }: { controller: SpacerElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Shared layout foundation for spacer placement, margins, and responsive sizing behavior.
        </p>
      </div>

      <SharedFoundationLayoutFields<SpacerVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
      <SharedLayoutSizingFields
        variant={active as unknown as PbImageVariantDefaults}
        showWidthHeightFields
        showAlignmentControls={false}
        showConstraintsEditor={false}
        onPatch={(patch) => setVariantPatch(activeVariant, patch as Partial<SpacerVariantDefaults>)}
        heightPlaceholderDesktop="e.g. 3rem"
        widthPlaceholderDesktop="e.g. 100%"
      />
    </>
  );
}
