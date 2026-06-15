import { ElementAdvancedPanel } from "@/app/dev/elements/_shared/ElementAdvancedPanel";
import { HandoffSnippetPanel } from "@/app/dev/elements/_shared/HandoffSnippetPanel";
import { ScrollProgressBarCustomJsonPanel } from "./ScrollProgressBarCustomJsonPanel";
import { VARIANT_LABELS } from "./constants";
import type { ScrollProgressBarElementDevController } from "./useScrollProgressBarElementDevController";

export function ScrollProgressBarSidebar({
  controller,
}: {
  controller: ScrollProgressBarElementDevController;
}) {
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];
  return (
    <div className="space-y-6 md:sticky md:top-8">
      {controller.isCustomVariant ? (
        <ScrollProgressBarCustomJsonPanel controller={controller} />
      ) : (
        <HandoffSnippetPanel
          exportJson={controller.exportJson}
          onCopy={() => void controller.copyExport()}
          copied={controller.copied}
          hydrated={controller.hydrated}
          variantLabel={variantLabel}
          elementName="scroll progress bar"
        />
      )}
      <ElementAdvancedPanel
        meta={{
          activeVariant: String(controller.activeVariant),
          variantLabel,
          schemaType: "elementScrollProgressBar",
          hydrated: controller.hydrated,
          isCustomVariant: controller.isCustomVariant,
          rawBlockJson: controller.exportJson,
        }}
        schemaDocs="element-content-schemas.ts"
      />
    </div>
  );
}
