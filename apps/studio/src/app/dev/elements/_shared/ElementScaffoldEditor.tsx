"use client";

import type { ElementDevEntry } from "@/app/dev/elements/element-dev-registry";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { ElementDevWorkspace } from "@/app/dev/elements/_shared/ElementDevWorkspace";

type Props = {
  entry: ElementDevEntry;
};

function PlaceholderCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-background/50 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function ElementScaffoldEditor({ entry }: Props) {
  return (
    <ElementDevWorkspace
      header={
        <DevWorkbenchPageHeader
          eyebrow="Dev · Elements"
          title={entry.title}
          description={entry.description}
          meta={entry.note ?? "This element is scaffolded with the universal editor flow."}
        />
      }
      variantPicker={
        <PlaceholderCard
          label="Variant picker"
          text="Variant management scaffold is ready for this element."
        />
      }
      preview={
        <PlaceholderCard
          label="Preview"
          text="Live preview scaffold is ready and will render through peblor wrappers."
        />
      }
      settings={
        <PlaceholderCard
          label="Settings"
          text="Settings controls scaffold is ready for layout, traits, animation, and runtime."
        />
      }
      sidebar={
        <div className="space-y-6 md:sticky md:top-8">
          <PlaceholderCard
            label="Handoff"
            text="JSON export and custom patch tooling scaffold is ready for this element."
          />
        </div>
      }
    />
  );
}
