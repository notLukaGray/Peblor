import { useState } from "react";
import type { JsonValue } from "@pb/contracts";
import type { RangeElementDevController } from "../useRangeElementDevController";

function stringifyActionPayload(value: unknown): string {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export function RangeContentControls({ controller }: { controller: RangeElementDevController }) {
  const { active, activeVariant, setVariantPatch } = controller;
  const [payloadDraft, setPayloadDraft] = useState(() =>
    stringifyActionPayload(active.actionPayload)
  );
  const [payloadError, setPayloadError] = useState<string | null>(null);

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Slider bounds and action wiring. Maps to <code>elementRange</code> content fields.
        </p>
      </div>

      <label className="space-y-1.5">
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
          placeholder="Adjust value"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Action
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.action ?? ""}
          onChange={(e) => setVariantPatch(activeVariant, { action: e.target.value || undefined })}
          placeholder="e.g. seek, volume, or custom trigger key"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Min
        </span>
        <input
          type="number"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.min ?? ""}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVariantPatch(activeVariant, { min: Number.isFinite(v) ? v : undefined });
          }}
          placeholder="0"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Max
        </span>
        <input
          type="number"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.max ?? ""}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVariantPatch(activeVariant, { max: Number.isFinite(v) ? v : undefined });
          }}
          placeholder="100"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Step
        </span>
        <input
          type="number"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.step ?? ""}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVariantPatch(activeVariant, { step: Number.isFinite(v) ? v : undefined });
          }}
          placeholder="1"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Default value
        </span>
        <input
          type="number"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.defaultValue ?? ""}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVariantPatch(activeVariant, { defaultValue: Number.isFinite(v) ? v : undefined });
          }}
          placeholder="50"
        />
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Action payload (JSON)
        </span>
        <textarea
          className="min-h-[4.5rem] w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={payloadDraft}
          onChange={(e) => {
            const next = e.target.value;
            setPayloadDraft(next);
            if (!next.trim()) {
              setPayloadError(null);
              setVariantPatch(activeVariant, { actionPayload: undefined });
              return;
            }
            try {
              const parsed = JSON.parse(next) as JsonValue;
              setPayloadError(null);
              setVariantPatch(activeVariant, { actionPayload: parsed });
            } catch {
              setPayloadError("Action payload must be valid JSON.");
            }
          }}
          placeholder='{"delta": 5}'
        />
        {payloadError ? <p className="text-[10px] text-rose-300">{payloadError}</p> : null}
      </label>
    </>
  );
}
