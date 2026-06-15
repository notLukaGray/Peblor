import { ElementAdvancedPanel } from "@/app/dev/elements/_shared/ElementAdvancedPanel";
import { HandoffSnippetPanel } from "@/app/dev/elements/_shared/HandoffSnippetPanel";
import { VideoTimeCustomJsonPanel } from "./VideoTimeCustomJsonPanel";
import { VARIANT_LABELS } from "./constants";
import type { VideoTimeElementDevController } from "./useVideoTimeElementDevController";

export function VideoTimeSidebar({ controller }: { controller: VideoTimeElementDevController }) {
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];
  return (
    <div className="space-y-6 md:sticky md:top-8">
      {controller.isCustomVariant ? (
        <VideoTimeCustomJsonPanel controller={controller} />
      ) : (
        <HandoffSnippetPanel
          exportJson={controller.exportJson}
          onCopy={() => void controller.copyExport()}
          copied={controller.copied}
          hydrated={controller.hydrated}
          variantLabel={variantLabel}
          elementName="video time"
        />
      )}
      <ElementAdvancedPanel
        meta={{
          activeVariant: String(controller.activeVariant),
          variantLabel,
          schemaType: "elementVideoTime",
          hydrated: controller.hydrated,
          isCustomVariant: controller.isCustomVariant,
          rawBlockJson: controller.exportJson,
        }}
        schemaDocs="element-content-schemas.ts"
      />
    </div>
  );
}
