import { useMemo, useState } from "react";
import {
  createVariantDiff,
  parseVariantJson,
  stringifyJson,
} from "@/app/dev/elements/image/custom-json";
import { BASE_DEFAULTS } from "./constants";
import type { ScrollProgressBarVariantDefaults } from "./types";
import type { ScrollProgressBarElementDevController } from "./useScrollProgressBarElementDevController";

export function ScrollProgressBarCustomJsonPanel({
  controller,
}: {
  controller: ScrollProgressBarElementDevController;
}) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseVariant = BASE_DEFAULTS.variants[controller.activeVariant];
  const fullCurrentJson = useMemo(() => stringifyJson(controller.active), [controller.active]);
  const diffJson = useMemo(
    () => stringifyJson(createVariantDiff(baseVariant, controller.active)),
    [baseVariant, controller.active]
  );

  const loadCurrent = () => {
    setText(fullCurrentJson);
    setError(null);
    setMessage("Loaded current variant JSON.");
  };

  const formatJson = () => {
    const parsed = parseVariantJson(text);
    if (!parsed.value) {
      setError(parsed.error ?? "Invalid JSON.");
      setMessage(null);
      return;
    }
    setText(stringifyJson(parsed.value));
    setError(null);
    setMessage("Formatted JSON.");
  };

  const applyJson = () => {
    const parsed = parseVariantJson(text);
    if (!parsed.value) {
      setError(parsed.error ?? "Invalid JSON.");
      setMessage(null);
      return;
    }
    const next = controller.normalizeVariant(
      controller.active,
      parsed.value as Partial<ScrollProgressBarVariantDefaults>
    );
    controller.setVariantExact(controller.activeVariant, next);
    setError(null);
    setMessage("Applied JSON to create-custom draft.");
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Custom JSON
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Custom JSON edits only the Create Custom draft. Built-in variants remain unchanged.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[14rem] w-full rounded border border-border bg-background p-3 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Paste scroll progress bar variant JSON object here…"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={loadCurrent}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Load Current
        </button>
        <button
          type="button"
          onClick={formatJson}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Format
        </button>
        <button
          type="button"
          onClick={applyJson}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Apply To Draft
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(fullCurrentJson)}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Copy Full
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(diffJson)}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Copy Diff
        </button>
      </div>
      {error ? <p className="text-[10px] text-rose-300">{error}</p> : null}
      {message ? <p className="text-[10px] text-muted-foreground">{message}</p> : null}
    </section>
  );
}
