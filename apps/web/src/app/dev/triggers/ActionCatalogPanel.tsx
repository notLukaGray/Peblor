"use client";

import type { WorkbenchAction, ActionGroupKey } from "./trigger-action-catalog";
import { ACTION_GROUPS, buildAction } from "./trigger-action-catalog";

type Props = {
  selectedGroup: ActionGroupKey;
  selectedType: string;
  onGroupChange: (group: ActionGroupKey) => void;
  onReplace: (action: WorkbenchAction) => void;
  onAdd: (action: WorkbenchAction) => void;
};

export function ActionCatalogPanel({
  selectedGroup,
  selectedType,
  onGroupChange,
  onReplace,
  onAdd,
}: Props) {
  const group = ACTION_GROUPS.find((item) => item.key === selectedGroup) ?? ACTION_GROUPS[0];
  if (!group) return null;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Action Catalog
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an action, replace the chain, or append it to compose trigger sequences.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {ACTION_GROUPS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onGroupChange(item.key)}
            className={`rounded border px-2.5 py-1.5 text-[11px] font-mono ${
              item.key === selectedGroup
                ? "border-foreground/40 bg-foreground/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-72 gap-2 overflow-auto pr-1 sm:grid-cols-2">
        {group.actions.map((type) => {
          const selected = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onReplace(buildAction(type))}
              className={`rounded border px-3 py-2 text-left font-mono text-[11px] ${
                selected
                  ? "border-foreground/40 bg-foreground/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onReplace(buildAction(selectedType))}
          className="rounded border border-border px-3 py-2 text-[12px] font-mono hover:bg-muted/60"
        >
          Replace chain
        </button>
        <button
          type="button"
          onClick={() => onAdd(buildAction(selectedType))}
          className="rounded border border-foreground/40 bg-foreground px-3 py-2 text-[12px] font-mono text-background"
        >
          Add to chain
        </button>
      </div>
    </section>
  );
}
