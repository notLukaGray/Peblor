import { ElementAdvancedPanel } from "@/app/dev/elements/_shared/ElementAdvancedPanel";
import { HandoffSnippetPanel } from "@/app/dev/elements/_shared/HandoffSnippetPanel";
import { RichTextCustomJsonPanel } from "./RichTextCustomJsonPanel";
import { VARIANT_LABELS } from "./constants";
import type { RichTextElementDevController } from "./useRichTextElementDevController";

export function RichTextSidebar({ controller }: { controller: RichTextElementDevController }) {
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];
  return (
    <div className="space-y-6 md:sticky md:top-8">
      {controller.isCustomVariant ? (
        <RichTextCustomJsonPanel controller={controller} />
      ) : (
        <HandoffSnippetPanel
          exportJson={controller.exportJson}
          onCopy={() => void controller.copyExport()}
          copied={controller.copied}
          hydrated={controller.hydrated}
          variantLabel={variantLabel}
          elementName="rich text"
        />
      )}
      <ElementAdvancedPanel
        meta={{
          activeVariant: String(controller.activeVariant),
          variantLabel,
          schemaType: "elementRichText",
          hydrated: controller.hydrated,
          isCustomVariant: controller.isCustomVariant,
          rawBlockJson: controller.exportJson,
        }}
        schemaDocs="element-content-schemas.ts"
      />
    </div>
  );
}
