"use client";

import { useRef, type ReactNode } from "react";
import type { SectionBlock } from "@pb/contracts";
import { sectionSchema } from "@pb/contracts";
import { SectionRenderer } from "@pb/runtime-react/renderers";
import { ScrollContainerProvider } from "@pb/runtime-react/scroll";
import { DeviceTypeProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";

export function controlClassName(): string {
  return "rounded border border-border bg-background px-2.5 py-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-mono uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

export function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function SectionSchemaBadge({ section }: { section: SectionBlock }) {
  const parsed = sectionSchema.safeParse(section);
  return (
    <span
      className={`rounded border px-2 py-1 text-[10px] font-mono ${
        parsed.success
          ? "border-emerald-500/30 text-emerald-300"
          : "border-destructive/40 text-destructive"
      }`}
    >
      {parsed.success ? "schema valid" : "schema error"}
    </span>
  );
}

export function SectionPreview({
  section,
  children,
}: {
  section: SectionBlock;
  children?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="rounded-lg border border-border bg-card/20 p-4">
      <div
        ref={containerRef}
        className="relative min-h-64 overflow-hidden rounded border border-dashed border-border/70 bg-background/60 p-5"
      >
        {children}
        <ScrollContainerProvider containerRef={containerRef}>
          <DeviceTypeProvider>
            <SectionRenderer section={section} isFirstSection />
          </DeviceTypeProvider>
        </ScrollContainerProvider>
      </div>
    </div>
  );
}

export function SectionWorkbenchLayout({
  eyebrow,
  title,
  description,
  affects,
  section,
  controls,
  preview,
  onReset,
}: {
  eyebrow: string;
  title: string;
  description: string;
  affects: string;
  section: SectionBlock;
  controls: ReactNode;
  preview: ReactNode;
  onReset: () => void;
}) {
  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav onResetSection={onReset} />}>
      <DevWorkbenchPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        affects={affects}
        showSessionBadge
      />
      <div className="mb-4 flex justify-end">
        <SectionSchemaBadge section={section} />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]">
        <section className="space-y-5">
          {preview}
          <section className="rounded-lg border border-border bg-card/20 p-4">{controls}</section>
        </section>
        <aside className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Section JSON
          </p>
          <pre className="max-h-[42rem] overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
            {JSON.stringify(section, null, 2)}
          </pre>
        </aside>
      </div>
    </DevWorkbenchPageShell>
  );
}
