/**
 * Shared handoff/export panel used in every element sidebar.
 *
 * Shows the exportable JSON payload with a provenance stamp so recipients know
 * the values come from the live workbench session, not from a production build
 * or a stale snapshot.
 */
export function HandoffSnippetPanel({
  exportJson,
  onCopy,
  copied,
  hydrated,
  /** Label for the variant currently being exported (shown in the provenance stamp). */
  variantLabel,
  /** Human-readable element name for the loading message, e.g. "heading". */
  elementName,
}: {
  exportJson: string;
  onCopy: () => void;
  copied: boolean;
  hydrated: boolean;
  variantLabel: string;
  elementName: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Handoff snippet
        </p>
        <span className="font-mono text-[10px] text-muted-foreground/60">{variantLabel}</span>
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Exported from the current workbench session — not a production snapshot. Share with
        engineering to wire these {elementName} variant defaults into runtime.
      </p>
      <pre className="max-h-96 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
        {exportJson}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="w-full rounded border border-border px-3 py-2 text-sm font-mono text-foreground transition-colors hover:bg-muted"
      >
        {copied ? "Copied!" : "Copy JSON"}
      </button>
      {!hydrated ? (
        <p className="text-[10px] text-muted-foreground">Loading saved {elementName} defaults…</p>
      ) : null}
    </div>
  );
}
