"use client";

import type { SectionBlock } from "@pb/contracts";
import { SectionRenderer } from "@pb/runtime-react/renderers";
import { DeviceTypeProvider } from "@pb/runtime-react/core/providers/device-type-provider";

export function PageComposerPreview({ sections }: { sections: SectionBlock[] }) {
  if (sections.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border/60 text-[12px] text-muted-foreground">
        No sections — paste a page document or import a slug to preview.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/20">
      <div className="border-b border-border px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Preview — {sections.length} section{sections.length !== 1 ? "s" : ""}
        </span>
      </div>
      <DeviceTypeProvider>
        <div className="relative">
          {sections.map((section, i) => (
            <SectionRenderer key={section.id ?? i} section={section} isFirstSection={i === 0} />
          ))}
        </div>
      </DeviceTypeProvider>
    </div>
  );
}
