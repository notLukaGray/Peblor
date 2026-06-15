"use client";

type Props = {
  previewSampleText: string;
  setPreviewSampleText: (value: string) => void;
};

export function FontDevSampleTextPanel({ previewSampleText, setPreviewSampleText }: Props) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-card/20 p-4">
      <label
        htmlFor="font-dev-preview-phrase"
        className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-muted-foreground"
      >
        Sample text
      </label>
      <textarea
        id="font-dev-preview-phrase"
        value={previewSampleText}
        onChange={(event) => setPreviewSampleText(event.target.value)}
        rows={2}
        className="min-h-[3rem] w-full resize-y rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        spellCheck={false}
      />
    </div>
  );
}
