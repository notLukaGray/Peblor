import { useState } from "react";
import { stringifyJson } from "@/app/dev/elements/image/custom-json";

type Model3dJsonRecordEditorProps = {
  label: string;
  description: string;
  value: unknown;
  starter: Record<string, unknown>;
  placeholder: string;
  applyLabel: string;
  keysLabel?: string;
  requireCamera?: boolean;
  onApply: (value: Record<string, unknown>) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringifyRecord(value: unknown): string {
  if (!isRecord(value)) return "{}";
  return stringifyJson(value);
}

function parseRecordDraft(
  label: string,
  draft: string
): { value?: Record<string, unknown>; error?: string } {
  try {
    const parsed = JSON.parse(draft) as unknown;
    if (!isRecord(parsed)) return { error: `${label} must be a JSON object.` };
    return { value: parsed };
  } catch {
    return { error: `${label} must be valid JSON.` };
  }
}

export function Model3dJsonRecordEditor({
  label,
  description,
  value,
  starter,
  placeholder,
  applyLabel,
  keysLabel,
  requireCamera = false,
  onApply,
}: Model3dJsonRecordEditorProps) {
  const [draft, setDraft] = useState(() => stringifyRecord(value));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="sm:col-span-2 rounded border border-border/60 bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(stringifyJson(starter));
            setError(null);
            setMessage("Starter inserted.");
          }}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Insert starter
        </button>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{description}</p>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
          setMessage(null);
        }}
        className="mt-2 min-h-[7rem] w-full rounded border border-border bg-background p-2 font-mono text-[10px] text-foreground"
        placeholder={placeholder}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">{keysLabel ?? " "}</p>
        <button
          type="button"
          onClick={() => {
            const parsed = parseRecordDraft(label, draft);
            if (!parsed.value) {
              setError(parsed.error ?? `${label} must be valid JSON.`);
              setMessage(null);
              return;
            }
            if (requireCamera && !isRecord(parsed.value.camera)) {
              setError("Scene requires a camera object.");
              setMessage(null);
              return;
            }
            onApply(parsed.value);
            setDraft(stringifyJson(parsed.value));
            setError(null);
            setMessage("Updated.");
          }}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          {applyLabel}
        </button>
      </div>
      {error ? <p className="mt-1 text-[10px] text-rose-300">{error}</p> : null}
      {message ? <p className="mt-1 text-[10px] text-muted-foreground">{message}</p> : null}
    </div>
  );
}
