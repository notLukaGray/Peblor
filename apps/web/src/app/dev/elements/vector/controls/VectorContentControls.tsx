import { useState } from "react";
import { isRecord, parseJsonInput } from "@/app/dev/elements/_shared/asset-input-utils";
import type { VectorVariantDefaults } from "../types";
import type { VectorElementDevController } from "../useVectorElementDevController";

function resolvePatchFromVariants(
  variants: Record<string, unknown>,
  preferredKey: string
): Partial<VectorVariantDefaults> | null {
  const fromDefault = variants[preferredKey];
  if (isRecord(fromDefault)) return fromDefault as Partial<VectorVariantDefaults>;
  const first = Object.values(variants).find((entry) => isRecord(entry));
  if (isRecord(first)) return first as Partial<VectorVariantDefaults>;
  return null;
}

function resolvePatchFromVectorContainer(
  vector: Record<string, unknown>,
  activeVariant: string
): { patch?: Partial<VectorVariantDefaults>; error?: string } {
  if (!isRecord(vector.variants)) return { patch: vector as Partial<VectorVariantDefaults> };
  const preferredKey =
    (typeof vector.defaultVariant === "string" ? vector.defaultVariant : activeVariant) ??
    activeVariant;
  const patch = resolvePatchFromVariants(vector.variants as Record<string, unknown>, preferredKey);
  if (patch) return { patch };
  return { error: "vector.variants exists but contains no valid variant object." };
}

function resolvePatchFromInlineSvg(markup: string): {
  patch?: Partial<VectorVariantDefaults>;
  error?: string;
} {
  const viewBoxMatch = markup.match(/<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i);
  const paths = Array.from(markup.matchAll(/<path\b[^>]*\bd\s*=\s*["']([^"']+)["'][^>]*>/gi));
  const shapes = paths
    .map((match) => match[1]?.trim())
    .filter((d): d is string => typeof d === "string" && d.length > 0)
    .map((d) => ({ type: "path" as const, d }));
  if (shapes.length === 0) {
    return { error: "Inline SVG must contain at least one <path>." };
  }
  const patch: Partial<VectorVariantDefaults> = {
    shapes: shapes as VectorVariantDefaults["shapes"],
  };
  if (viewBoxMatch?.[1]) patch.viewBox = viewBoxMatch[1];
  return { patch };
}

export function VectorContentControls({ controller }: { controller: VectorElementDevController }) {
  const { active, activeVariant, setVariantPatch, normalizeVariant, setVariantExact } = controller;
  const [vectorJsonDraft, setVectorJsonDraft] = useState("");
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);

  const handleColorsChange = (value: string) => {
    try {
      const parsed = JSON.parse(value) as Record<string, string>;
      if (typeof parsed === "object" && parsed !== null) {
        setVariantPatch(activeVariant, { colors: parsed });
      }
    } catch {
      // Invalid JSON — keep previous colors until valid.
    }
  };

  const resolveVectorPayload = (
    value: unknown
  ): { patch?: Partial<VectorVariantDefaults>; error?: string } => {
    if (Array.isArray(value))
      return { patch: { shapes: value as VectorVariantDefaults["shapes"] } };
    if (!isRecord(value)) return { error: "Vector JSON must be an object or shape array." };

    if (value.type === "elementVector") {
      const { type: _type, ...rest } = value;
      return { patch: rest as Partial<VectorVariantDefaults> };
    }

    if (isRecord(value.vector)) {
      return resolvePatchFromVectorContainer(value.vector, activeVariant);
    }

    if (Array.isArray(value.shapes)) {
      return { patch: value as Partial<VectorVariantDefaults> };
    }

    return { patch: value as Partial<VectorVariantDefaults> };
  };

  const applyVectorInputDraft = () => {
    const draft = vectorJsonDraft.trim();
    if (!draft) {
      setAssetError("Paste inline SVG or vector JSON first.");
      setAssetMessage(null);
      return;
    }
    const payload = draft.startsWith("<svg")
      ? resolvePatchFromInlineSvg(draft)
      : (() => {
          const parsed = parseJsonInput(draft);
          if (!("value" in parsed) || parsed.value === undefined) {
            return { error: parsed.error ?? "Invalid JSON." };
          }
          return resolveVectorPayload(parsed.value);
        })();
    if (!payload.patch) {
      setAssetError(payload.error ?? "Could not resolve vector payload.");
      setAssetMessage(null);
      return;
    }
    const next = normalizeVariant(active, payload.patch);
    setVariantExact(activeVariant, next);
    setAssetError(null);
    setAssetMessage("Vector content applied.");
  };

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Vector shape source configuration and accessibility labeling.
        </p>
      </div>

      <div className="sm:col-span-2 space-y-2 rounded border border-border/60 bg-muted/10 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Asset Input
        </p>

        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Paste
          </span>
          <textarea
            className="min-h-[8rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={vectorJsonDraft}
            onChange={(event) => {
              setVectorJsonDraft(event.target.value);
              setAssetError(null);
              setAssetMessage(null);
            }}
            placeholder='Paste inline SVG markup or vector JSON, e.g. <svg viewBox="0 0 24 24"><path d="M..." /></svg>'
            spellCheck={false}
          />
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Apply
          </span>
          <button
            type="button"
            onClick={applyVectorInputDraft}
            className="w-fit rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Apply
          </button>
        </label>

        {assetError ? <p className="text-[10px] text-rose-300">{assetError}</p> : null}
        {assetMessage ? <p className="text-[10px] text-muted-foreground">{assetMessage}</p> : null}
      </div>

      <label className="space-y-1.5">
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

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Preserve aspect ratio
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.preserveAspectRatio ?? ""}
          placeholder="xMidYMid meet"
          onChange={(e) =>
            setVariantPatch(activeVariant, { preserveAspectRatio: e.target.value || undefined })
          }
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
      </label>
    </>
  );
}
