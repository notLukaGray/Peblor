import { SharedRuntimeMetadataFields } from "@/app/dev/elements/_shared/dev-controls";
import type { HeadingElementDevController } from "../useHeadingElementDevController";

export function HeadingRuntimeControls({
  controller,
}: {
  controller: HeadingElementDevController;
}) {
  const { runtimeDraft, runtimePreview, setRuntimePatch } = controller;
  return (
    <SharedRuntimeMetadataFields
      draft={runtimeDraft}
      setDraft={setRuntimePatch}
      visibleWhenMatches={runtimePreview.visibleWhenMatches}
      intro={
        <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Runtime
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Instance-level fields for custom snippets. These do not alter the variant object alone,
            but they do drive preview + copy JSON.
          </p>
        </div>
      }
    />
  );
}
