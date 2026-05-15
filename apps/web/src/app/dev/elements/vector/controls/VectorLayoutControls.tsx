import { SharedFoundationLayoutFields } from "@/app/dev/elements/_shared/dev-controls";
import type { VectorVariantDefaults } from "../types";
import type { VectorElementDevController } from "../useVectorElementDevController";

export function VectorLayoutControls({ controller }: { controller: VectorElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;

  const handleColorsChange = (value: string) => {
    try {
      const parsed = JSON.parse(value) as Record<string, string>;
      if (typeof parsed === "object" && parsed !== null) {
        setVariantPatch(activeVariant, { colors: parsed });
      }
    } catch {
      // Invalid JSON — leave colors unchanged until valid
    }
  };

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Layout
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          viewBox, colors map, margins, radius. Same foundation as other elements.
        </p>
      </div>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          viewBox
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.viewBox ?? "0 0 64 64"}
          placeholder="e.g. 0 0 64 64"
          onChange={(e) => setVariantPatch(activeVariant, { viewBox: e.target.value })}
        />
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Colors JSON
        </span>
        <textarea
          className="min-h-[6rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          defaultValue={active.colors ? JSON.stringify(active.colors, null, 2) : ""}
          placeholder={'{"primary": "#fff", "accent": "#a78bfa"}'}
          onBlur={(e) => handleColorsChange(e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          JSON object mapping color keys to CSS color values. Applied on blur.
        </p>
      </label>

      <SharedFoundationLayoutFields<VectorVariantDefaults>
        variant={active}
        onPatch={(patch) => setVariantPatch(activeVariant, patch)}
      />
    </>
  );
}
