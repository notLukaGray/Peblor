import { SharedFoundationLayoutFields } from "@/app/dev/elements/_shared/dev-controls";
import type { SvgVariantDefaults } from "../types";
import type { SvgElementDevController } from "../useSvgElementDevController";

export function SvgLayoutControls({ controller }: { controller: SvgElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Raw SVG markup, margins, and radius. Paste any valid SVG string into the markup field.
        </p>
      </div>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Markup
        </span>
        <textarea
          className="min-h-[10rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={active.markup ?? ""}
          onChange={(e) => setVariantPatch(activeVariant, { markup: e.target.value })}
          placeholder='<svg viewBox="0 0 64 64" ...>…</svg>'
          spellCheck={false}
        />
        <p className="text-[10px] text-muted-foreground">
          Raw SVG string. ElementRenderer will render this directly.
        </p>
      </label>

      <SharedFoundationLayoutFields<SvgVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
