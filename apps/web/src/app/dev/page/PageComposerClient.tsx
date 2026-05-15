"use client";

import { useState, useTransition } from "react";
import type { SectionBlock } from "@pb/contracts";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { PageComposerPreview } from "./PageComposerPreview";
import { expandPageDoc, importPageBySlug } from "./page-composer-actions";
import { PAGE_COMPOSER_PLACEHOLDER } from "./page-composer-placeholder";

type Mode = "paste" | "slug";

const cc = {
  tab: (active: boolean) =>
    `rounded border px-3 py-1.5 text-[11px] font-mono transition-colors ${
      active
        ? "border-foreground/40 bg-foreground/10 text-foreground"
        : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`,
  btn: "rounded border border-border bg-background px-3 py-1.5 text-[12px] hover:bg-muted disabled:opacity-50",
  input:
    "rounded border border-border bg-background px-2.5 py-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring",
};

export function PageComposerClient() {
  const [mode, setMode] = useState<Mode>("paste");
  const [jsonText, setJsonText] = useState(PAGE_COMPOSER_PLACEHOLDER);
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<SectionBlock[]>([]);
  const [bgJson, setBgJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onExpand() {
    setError(null);
    startTransition(async () => {
      const result = await expandPageDoc(jsonText);
      if (result.ok) {
        setSections(result.sections);
        setBgJson(result.bgJson);
      } else {
        setError(result.error);
        setSections([]);
      }
    });
  }

  function onImport() {
    if (!slug.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await importPageBySlug(slug.trim());
      if (result.ok) {
        setSections(result.sections);
        setBgJson(result.bgJson);
      } else {
        setError(result.error);
        setSections([]);
      }
    });
  }

  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Builder"
        title="Page Composer"
        description="Expand a page document through the production pipeline and preview the rendered sections."
        affects="sectionOrder, definitions, bgKey, presets, transitions, element defaults"
      />

      <div className="space-y-5">
        {/* Mode tabs */}
        <div className="flex gap-2">
          <button className={cc.tab(mode === "paste")} onClick={() => setMode("paste")}>
            Paste JSON
          </button>
          <button className={cc.tab(mode === "slug")} onClick={() => setMode("slug")}>
            Import by slug
          </button>
        </div>

        {/* Input */}
        {mode === "paste" ? (
          <div className="space-y-3">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={18}
              spellCheck={false}
              className={`${cc.input} w-full resize-y font-mono text-[11px] leading-5`}
            />
            <button onClick={onExpand} disabled={isPending} className={cc.btn}>
              {isPending ? "Expanding…" : "Expand & Preview"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Enter a page slug to load it through the full production pipeline — load, expand,
              asset injection, and element defaults.
            </p>
            <div className="flex gap-2">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="work/case-study-name"
                className={`${cc.input} flex-1`}
                onKeyDown={(e) => e.key === "Enter" && onImport()}
              />
              <button onClick={onImport} disabled={isPending || !slug.trim()} className={cc.btn}>
                {isPending ? "Loading…" : "Import"}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </p>
        )}

        {/* Preview + JSON output */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
          <PageComposerPreview sections={sections} />

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card/20 p-4">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Sections JSON
              </p>
              <pre className="max-h-[28rem] overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
                {sections.length > 0 ? JSON.stringify(sections, null, 2) : "No sections yet."}
              </pre>
            </div>
            {bgJson && (
              <div className="rounded-lg border border-border bg-card/20 p-4">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Background
                </p>
                <pre className="max-h-48 overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
                  {bgJson}
                </pre>
              </div>
            )}
          </aside>
        </div>
      </div>
    </DevWorkbenchPageShell>
  );
}
