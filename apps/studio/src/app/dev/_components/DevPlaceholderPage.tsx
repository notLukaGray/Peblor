"use client";

import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";

type Props = {
  title: string;
  description: string;
  note?: string;
};

export function DevPlaceholderPage({ title, description, note }: Props) {
  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Layout"
        title={title}
        description={description}
        meta={note}
      />

      <section className="rounded-lg border border-border bg-card/20 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          In progress
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          This section is scaffolded and ready for implementation. Navigation and reset are live so
          we can ship it incrementally.
        </p>
      </section>
    </DevWorkbenchPageShell>
  );
}
