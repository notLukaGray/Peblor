import type { PbImageLayoutMode } from "@/app/theme/pb-builder-defaults";
import { LAYOUT_MODE_OPTIONS } from "../constants";
import type { ImageElementDevController } from "../useImageElementDevController";
import { MediaGeometryFields } from "@/app/dev/elements/_shared/dev-controls/media-geometry-fields";
import { SharedLayoutSizingFields } from "@/app/dev/elements/_shared/dev-controls/shared-layout-sizing-fields";
import { handleLayoutModeChange } from "./image-layout-field-controls";

export function ImageLayoutControls({ controller }: { controller: ImageElementDevController }) {
  const {
    active,
    activeVariant,
    setVariantPatch,
    showObjectPositionControl,
    showAlignmentControls,
  } = controller;

  const showWidthHeight = active.layoutMode === "fill" || active.layoutMode === "constraints";
  const showConstraintsEditor = active.layoutMode === "constraints";

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Start with how this image occupies space. Width, height, and constraints only appear when
          they matter.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout mode
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={active.layoutMode}
          onChange={(e) => handleLayoutModeChange(controller, e.target.value as PbImageLayoutMode)}
        >
          {LAYOUT_MODE_OPTIONS.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </label>

      <MediaGeometryFields
        variant={active}
        showAspectRatioField={active.layoutMode === "aspectRatio"}
        showObjectPositionField={showObjectPositionControl}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />

      <SharedLayoutSizingFields
        variant={active}
        showWidthHeightFields={showWidthHeight}
        showAlignmentControls={showAlignmentControls}
        showConstraintsEditor={showConstraintsEditor}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
        widthPlaceholderDesktop={active.layoutMode === "constraints" ? "e.g. 70%" : "e.g. 100%"}
        heightPlaceholderDesktop={active.layoutMode === "fill" ? "e.g. 100%" : "optional"}
      />
    </>
  );
}
