"use client";

import type { WorkbenchAction } from "./trigger-action-catalog";
import { TRIGGER_TYPES, type TriggerWorkbenchKey } from "./trigger-action-catalog";

type Props = {
  trigger: TriggerWorkbenchKey;
  actions: WorkbenchAction[];
  eventLog: string[];
  onTriggerChange: (trigger: TriggerWorkbenchKey) => void;
  onRemoveAction: (index: number) => void;
  onClearLog: () => void;
};

export function TriggerChainPanel({
  trigger,
  actions,
  eventLog,
  onTriggerChange,
  onRemoveAction,
  onClearLog,
}: Props) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Trigger Surfaces
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a trigger surface, then fire it from the preview sandbox.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {TRIGGER_TYPES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onTriggerChange(item.key)}
            className={`rounded border p-3 text-left ${
              item.key === trigger
                ? "border-foreground/40 bg-foreground/10"
                : "border-border bg-background hover:bg-muted/60"
            }`}
          >
            <span className="block font-mono text-[11px] text-foreground">{item.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
          </button>
        ))}
      </div>
      <div className="rounded border border-border bg-background p-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Action Chain
        </p>
        <div className="mt-3 space-y-2">
          {actions.map((action, index) => (
            <div
              key={`${action.type}-${index}`}
              className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2"
            >
              <span className="font-mono text-[11px] text-foreground">
                {index + 1}. {action.type}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAction(index)}
                className="rounded border border-border px-2 py-1 text-[10px] font-mono text-muted-foreground hover:bg-muted/60"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Result Log
          </p>
          <button
            type="button"
            onClick={onClearLog}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-muted-foreground hover:bg-muted/60"
          >
            Clear
          </button>
        </div>
        <div className="mt-3 min-h-24 space-y-1 font-mono text-[11px] text-muted-foreground">
          {eventLog.length ? (
            eventLog.map((entry) => <p key={entry}>{entry}</p>)
          ) : (
            <p>No events yet</p>
          )}
        </div>
      </div>
    </section>
  );
}
