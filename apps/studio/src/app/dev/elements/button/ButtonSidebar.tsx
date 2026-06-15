import { ElementAdvancedPanel } from "@/app/dev/elements/_shared/ElementAdvancedPanel";
import { HandoffSnippetPanel } from "@/app/dev/elements/_shared/HandoffSnippetPanel";
import { ButtonCustomJsonPanel } from "./ButtonCustomJsonPanel";
import { VARIANT_LABELS } from "./constants";
import type { ButtonElementDevController } from "./useButtonElementDevController";

export function ButtonSidebar({ controller }: { controller: ButtonElementDevController }) {
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];
  return (
    <div className="space-y-6 md:sticky md:top-8">
      {controller.isCustomVariant ? (
        <ButtonCustomJsonPanel controller={controller} />
      ) : (
        <HandoffSnippetPanel
          exportJson={controller.exportJson}
          onCopy={() => void controller.copyExport()}
          copied={controller.copied}
          hydrated={controller.hydrated}
          variantLabel={variantLabel}
          elementName="button"
        />
      )}
      <ElementAdvancedPanel
        meta={{
          activeVariant: String(controller.activeVariant),
          variantLabel,
          schemaType: "elementButton",
          hydrated: controller.hydrated,
          isCustomVariant: controller.isCustomVariant,
          rawBlockJson: controller.exportJson,
        }}
        schemaDocs="element-button-schemas.ts"
      />
    </div>
  );
}
