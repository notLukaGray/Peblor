import { ElementAdvancedPanel } from "@/app/dev/elements/_shared/ElementAdvancedPanel";
import { HandoffSnippetPanel } from "@/app/dev/elements/_shared/HandoffSnippetPanel";
import { RangeCustomJsonPanel } from "./RangeCustomJsonPanel";
import { VARIANT_LABELS } from "./constants";
import type { RangeElementDevController } from "./useRangeElementDevController";

export function RangeSidebar({ controller }: { controller: RangeElementDevController }) {
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];
  return (
    <div className="space-y-6 md:sticky md:top-8">
      {controller.isCustomVariant ? (
        <RangeCustomJsonPanel controller={controller} />
      ) : (
        <HandoffSnippetPanel
          exportJson={controller.exportJson}
          onCopy={() => void controller.copyExport()}
          copied={controller.copied}
          hydrated={controller.hydrated}
          variantLabel={variantLabel}
          elementName="range"
        />
      )}
      <ElementAdvancedPanel
        meta={{
          activeVariant: String(controller.activeVariant),
          variantLabel,
          schemaType: "elementRange",
          hydrated: controller.hydrated,
          isCustomVariant: controller.isCustomVariant,
          rawBlockJson: controller.exportJson,
        }}
        schemaDocs="element-range-schemas.ts"
      />
    </div>
  );
}
