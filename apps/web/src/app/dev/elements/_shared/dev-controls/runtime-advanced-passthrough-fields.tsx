import type { ElementDevRuntimeDraft } from "./runtime-draft-types";

type Props = {
  draft: ElementDevRuntimeDraft;
  setDraft: (patch: Partial<ElementDevRuntimeDraft>) => void;
};

export function RuntimeAdvancedPassthroughFields({ draft, setDraft }: Props) {
  return (
    <details className="sm:col-span-2 rounded border border-border/60 bg-background/60 p-3">
      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Advanced passthrough
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            figmaConstraints JSON
          </span>
          <textarea
            value={draft.figmaConstraintsJson}
            onChange={(e) => setDraft({ figmaConstraintsJson: e.target.value })}
            placeholder='e.g. {"horizontal":"LEFT_RIGHT","vertical":"TOP"}'
            className="min-h-[5.5rem] w-full rounded border border-border bg-background p-3 font-mono text-[11px] text-foreground"
          />
        </label>
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            motion JSON
          </span>
          <textarea
            value={draft.motionJson}
            onChange={(e) => setDraft({ motionJson: e.target.value })}
            placeholder='e.g. {"whileHover":{"scale":1.02}}'
            className="min-h-[5.5rem] w-full rounded border border-border bg-background p-3 font-mono text-[11px] text-foreground"
          />
        </label>
      </div>
    </details>
  );
}
