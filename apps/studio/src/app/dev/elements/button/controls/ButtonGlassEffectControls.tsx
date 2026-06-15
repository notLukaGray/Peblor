import type { SectionEffect } from "@pb/contracts";
import type { ButtonVariantDefaults, ButtonVariantKey } from "../types";
import type { ButtonElementDevController } from "../useButtonElementDevController";

type GlassEffect = Extract<SectionEffect, { type: "glass" }>;

function readGlass(variant: ButtonVariantDefaults): GlassEffect | null {
  const list = variant.effects;
  if (!Array.isArray(list)) return null;
  const g = list.find((e): e is GlassEffect => e?.type === "glass");
  return g ?? null;
}

function patchGlassVariant(
  variant: ButtonVariantDefaults,
  patch: Partial<GlassEffect>,
  setVariantPatch: (variant: ButtonVariantKey, p: Partial<ButtonVariantDefaults>) => void,
  variantKey: ButtonVariantKey
) {
  const list = Array.isArray(variant.effects) ? [...variant.effects] : [];
  const idx = list.findIndex((e): e is GlassEffect => e?.type === "glass");
  const at = idx >= 0 ? list[idx] : undefined;
  const prev: GlassEffect = at && at.type === "glass" ? (at as GlassEffect) : { type: "glass" };
  const next: GlassEffect = { ...prev, ...patch, type: "glass" };
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  setVariantPatch(variantKey, { effects: list });
}

export function ButtonGlassEffectControls({
  controller,
}: {
  controller: ButtonElementDevController;
}) {
  const { active, activeVariant, setVariantPatch } = controller;
  const glass = readGlass(active);
  if (!glass) {
    return (
      <p className="sm:col-span-2 text-[10px] text-muted-foreground">
        No <span className="font-mono">glass</span> entry in{" "}
        <span className="font-mono">effects</span>. Reset button defaults or paste a glass effect in
        custom JSON to restore tuning.
      </p>
    );
  }

  const patch = (p: Partial<GlassEffect>) =>
    patchGlassVariant(active, p, setVariantPatch, activeVariant);

  const num = (value: number | undefined, onChange: (n: number | undefined) => void) => (
    <input
      type="number"
      className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
      value={value ?? ""}
      placeholder="—"
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || raw === "-") {
          onChange(undefined);
          return;
        }
        const n = Number(raw);
        onChange(Number.isFinite(n) ? n : undefined);
      }}
    />
  );

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Glass effect (this variant only)
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Tunes the physics layer for the glass preset. Wrapper radius still lives in wrapper sizing
          above; these values persist only on the <span className="font-mono">glass</span> variant.
        </p>
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Light intensity (0–1)
        </span>
        {num(glass.lightIntensity, (v) => patch({ lightIntensity: v }))}
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Light angle (deg)
        </span>
        {num(glass.lightAngle, (v) => patch({ lightAngle: v }))}
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Refraction (0–1)
        </span>
        {num(glass.refraction, (v) => patch({ refraction: v }))}
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Depth
        </span>
        {num(glass.depth, (v) => patch({ depth: v }))}
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Frost (blur length, e.g. 4px)
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={glass.frost ?? ""}
          placeholder="e.g. 4px"
          onChange={(e) => patch({ frost: e.target.value.trim() || undefined })}
        />
      </label>
    </>
  );
}
