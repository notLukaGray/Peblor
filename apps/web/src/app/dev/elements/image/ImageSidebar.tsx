import { ElementAdvancedPanel } from "@/app/dev/elements/_shared/ElementAdvancedPanel";
import { HandoffSnippetPanel } from "@/app/dev/elements/_shared/HandoffSnippetPanel";
import { IMAGE_VARIABLES_NOT_SUPPORTED_YET, VARIANT_LABELS } from "./constants";
import { ImageCustomJsonPanel } from "./ImageCustomJsonPanel";
import type { ImageElementDevController } from "./useImageElementDevController";

export function ImageSidebar({ controller }: { controller: ImageElementDevController }) {
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];
  return (
    <div className="space-y-6 md:sticky md:top-8">
      {controller.isCustomVariant ? (
        <ImageCustomJsonPanel controller={controller} />
      ) : (
        <HandoffSnippetPanel
          exportJson={controller.exportJson}
          onCopy={() => void controller.copyExport()}
          copied={controller.copied}
          hydrated={controller.hydrated}
          variantLabel={variantLabel}
          elementName="image"
        />
      )}
      <div className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Variable Coverage
        </p>
        <p className="text-[10px] text-muted-foreground">
          This list is intentionally strict: only hard runtime gaps that are not yet available from
          this tool.
        </p>
        <CoverageList
          title="Hard stops (not supported yet)"
          values={IMAGE_VARIABLES_NOT_SUPPORTED_YET}
        />
      </div>
      <ElementAdvancedPanel
        meta={{
          activeVariant: String(controller.activeVariant),
          variantLabel,
          schemaType: "elementImage",
          hydrated: controller.hydrated,
          isCustomVariant: controller.isCustomVariant,
          rawBlockJson: controller.exportJson,
        }}
        schemaDocs="element-content-schemas.ts"
      />
    </div>
  );
}

function CoverageList({ title, values }: { title: string; values: readonly string[] }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1 text-[11px] text-foreground">
        {values.map((entry) => (
          <li key={entry}>- {entry}</li>
        ))}
      </ul>
    </div>
  );
}
