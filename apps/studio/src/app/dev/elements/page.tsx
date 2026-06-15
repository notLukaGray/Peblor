import type { Metadata } from "next";
import Link from "next/link";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import {
  ELEMENT_DEV_BATCH_META,
  ELEMENT_DEV_BATCH_ORDER,
  getElementDevPath,
  groupElementDevEntriesByBatch,
} from "@/app/dev/elements/element-dev-registry";

export const metadata: Metadata = {
  title: "Elements (dev)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ElementsDevPage() {
  const batches = groupElementDevEntriesByBatch();

  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Elements"
        title="Elements Workbench"
        showSessionBadge
        description="Element defaults split by type. Each surface lets you tune defaults, validate representational previews, and export schema payloads that feed directly into the Peblor."
        affects="every elementBlock variant rendered by the Peblor — typography, media, interactive controls, and decorative elements"
        meta="Module/group tooling is intentionally deferred to Builder later."
      />

      <div className="space-y-6">
        {ELEMENT_DEV_BATCH_ORDER.map((batchId) => (
          <section
            key={batchId}
            className="space-y-3 rounded-lg border border-border bg-card/20 p-4"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {ELEMENT_DEV_BATCH_META[batchId].label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ELEMENT_DEV_BATCH_META[batchId].blurb}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batches[batchId].map((entry) => (
                <Link
                  key={entry.slug}
                  href={getElementDevPath(entry.slug)}
                  className="rounded-lg border border-border bg-background/50 p-4 transition-colors hover:bg-muted/30"
                >
                  <p className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span>Element</span>
                    <span>{entry.status === "live" ? "Live" : "Scaffold"}</span>
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">{entry.navLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DevWorkbenchPageShell>
  );
}
