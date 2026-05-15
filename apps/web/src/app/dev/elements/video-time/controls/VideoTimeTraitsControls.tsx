import { SharedVisualTraitsFields } from "@/app/dev/elements/_shared/dev-controls";
import type { VideoTimeVariantDefaults } from "../types";
import type { VideoTimeElementDevController } from "../useVideoTimeElementDevController";

export function VideoTimeTraitsControls({
  controller,
}: {
  controller: VideoTimeElementDevController;
}) {
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

      <SharedVisualTraitsFields<VideoTimeVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
        showPriorityLoading={false}
      />
    </>
  );
}
