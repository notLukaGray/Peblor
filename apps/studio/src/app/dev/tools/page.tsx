import type { Metadata } from "next";
import Link from "next/link";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";

export const metadata: Metadata = {
  title: "Tools (dev)",
};

export default function DevToolsPage() {
  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Tools"
        title="Tools"
        description="Choose a local development utility."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dev/tools/hls"
          className="rounded-lg border border-border bg-card/20 p-4 transition-colors hover:bg-muted/50"
        >
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Video
          </p>
          <h2 className="mt-2 text-base font-semibold text-foreground">HLS Converter</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Convert local source video into streaming outputs and extract a poster still.
          </p>
        </Link>
      </section>
    </DevWorkbenchPageShell>
  );
}
