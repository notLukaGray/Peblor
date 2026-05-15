type Props = {
  exportText: string;
  exportCopied: boolean;
  onCopy: () => void;
};

export function StyleHandoffPanel({ exportText, exportCopied, onCopy }: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Handoff snippet
      </p>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Share this with engineering when defaults feel right. It captures your current style
        decisions so implementation stays aligned.
      </p>
      <pre className="max-h-96 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
        {exportText}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="w-full rounded border border-border px-3 py-2 text-sm font-mono text-foreground transition-colors hover:bg-muted"
      >
        {exportCopied ? "Copied!" : "Copy code"}
      </button>
    </div>
  );
}
