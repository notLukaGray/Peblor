import { useRef, useState } from "react";
import { readTextFile } from "@/app/dev/elements/_shared/asset-input-utils";
import type { SvgVariantDefaults } from "../types";
import type { SvgElementDevController } from "../useSvgElementDevController";

export function SvgContentControls({ controller }: { controller: SvgElementDevController }) {
  const { active, activeVariant, setVariantPatch, setVariantExact, normalizeVariant } = controller;
  const svgFileInputRef = useRef<HTMLInputElement | null>(null);
  const [markupDraft, setMarkupDraft] = useState(active.markup ?? "");
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);

  const applyMarkupPatch = (markup: string) => {
    const trimmed = markup.trim();
    if (!trimmed.toLowerCase().startsWith("<svg")) {
      setAssetError("Markup must start with <svg.");
      setAssetMessage(null);
      return;
    }
    const next = normalizeVariant(active, { markup: trimmed } as Partial<SvgVariantDefaults>);
    setVariantExact(activeVariant, next);
    setMarkupDraft(trimmed);
    setAssetError(null);
    setAssetMessage("SVG markup applied.");
  };

  const handleSvgUpload = async (file: File | null) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const valid = lower.endsWith(".svg") || file.type.includes("svg");
    if (!valid) {
      setAssetError("Invalid file type. Upload an .svg file.");
      setAssetMessage(null);
      return;
    }
    try {
      const text = await readTextFile(file);
      applyMarkupPatch(text);
      setAssetMessage(`Uploaded SVG: ${file.name}`);
    } catch {
      setAssetError("Could not read this SVG file.");
      setAssetMessage(null);
    }
  };

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Raw SVG markup and accessibility labeling.
        </p>
      </div>

      <div className="sm:col-span-2 space-y-2 rounded border border-border/60 bg-muted/10 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Asset Input
        </p>

        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Upload
          </span>
          <div className="flex flex-wrap gap-2">
            <input
              ref={svgFileInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="sr-only"
              onChange={(event) => {
                void handleSvgUpload(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => svgFileInputRef.current?.click()}
              className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
            >
              Upload SVG
            </button>
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Paste
          </span>
          <textarea
            className="min-h-[8rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={markupDraft}
            onChange={(event) => {
              setMarkupDraft(event.target.value);
              setAssetError(null);
              setAssetMessage(null);
            }}
            placeholder='<svg viewBox="0 0 64 64" ...>…</svg>'
            spellCheck={false}
          />
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Apply
          </span>
          <button
            type="button"
            onClick={() => applyMarkupPatch(markupDraft)}
            className="w-fit rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Apply Markup
          </button>
        </label>

        {assetError ? <p className="text-[10px] text-rose-300">{assetError}</p> : null}
        {assetMessage ? <p className="text-[10px] text-muted-foreground">{assetMessage}</p> : null}
      </div>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Markup
        </span>
        <textarea
          className="min-h-[10rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={active.markup ?? ""}
          onChange={(e) => {
            setVariantPatch(activeVariant, { markup: e.target.value });
            setMarkupDraft(e.target.value);
          }}
          placeholder='<svg viewBox="0 0 64 64" ...>…</svg>'
          spellCheck={false}
        />
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Aria label
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.ariaLabel ?? ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, { ariaLabel: e.target.value || undefined })
          }
          placeholder="Vector graphic"
        />
      </label>
    </>
  );
}
