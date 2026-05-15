"use client";

import { useEffect, useMemo, useState } from "react";
import { triggerActionSchema } from "@pb/contracts";
import { PEBLOR_TRIGGER_EVENT, type PeblorTriggerDetail } from "@/peblor/triggers";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { ActionCatalogPanel } from "./ActionCatalogPanel";
import { TriggerChainPanel } from "./TriggerChainPanel";
import { TriggerPreviewSandbox } from "./TriggerPreviewSandbox";
import {
  ACTION_GROUPS,
  buildAction,
  buildChainAction,
  buildTriggerExport,
  type ActionGroupKey,
  type TriggerWorkbenchKey,
  type WorkbenchAction,
} from "./trigger-action-catalog";

function eventLabel(detail: PeblorTriggerDetail): string {
  if (detail.progress != null) return `progress ${detail.progress.toFixed(2)}`;
  if (detail.visible != null) return detail.visible ? "visible" : "invisible";
  return detail.source ?? "action";
}

function useTriggerEvents() {
  const [events, setEvents] = useState<string[]>([]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PeblorTriggerDetail>).detail;
      if (!detail?.action?.type) return;
      const stamp = `${Date.now()}-${performance.now().toFixed(1)}`;
      setEvents((prev) =>
        [`${stamp} ${eventLabel(detail)} -> ${detail.action.type}`, ...prev].slice(0, 8)
      );
    };
    window.addEventListener(PEBLOR_TRIGGER_EVENT, handler);
    return () => window.removeEventListener(PEBLOR_TRIGGER_EVENT, handler);
  }, []);
  return [events, setEvents] as const;
}

function SchemaBadge({ action }: { action: WorkbenchAction }) {
  const parsed = triggerActionSchema.safeParse(action);
  return (
    <span
      className={`rounded border px-2 py-1 text-[10px] font-mono ${
        parsed.success
          ? "border-emerald-500/30 text-emerald-300"
          : "border-destructive/40 text-destructive"
      }`}
    >
      {parsed.success ? "action schema valid" : "action schema error"}
    </span>
  );
}

function groupFirstAction(groupKey: ActionGroupKey): string {
  return ACTION_GROUPS.find((group) => group.key === groupKey)?.actions[0] ?? "setVariable";
}

export function TriggersDevIndexClient() {
  const [trigger, setTrigger] = useState<TriggerWorkbenchKey>("onVisible");
  const [selectedGroup, setSelectedGroup] = useState<ActionGroupKey>("state");
  const [selectedType, setSelectedType] = useState("setVariable");
  const [actions, setActions] = useState<WorkbenchAction[]>([buildAction("setVariable")]);
  const [events, setEvents] = useTriggerEvents();
  const chainAction = useMemo(() => buildChainAction(actions), [actions]);
  const exportJson = useMemo(() => buildTriggerExport(trigger, actions), [trigger, actions]);

  const replaceAction = (action: WorkbenchAction) => {
    setSelectedType(action.type);
    setActions([action]);
  };
  const addAction = (action: WorkbenchAction) => {
    setSelectedType(action.type);
    setActions((prev) => [...prev, action]);
  };
  const removeAction = (index: number) => {
    setActions((prev) => (prev.length === 1 ? prev : prev.filter((_, item) => item !== index)));
  };
  const changeGroup = (group: ActionGroupKey) => {
    setSelectedGroup(group);
    setSelectedType(groupFirstAction(group));
  };

  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Builder"
        title="Triggers & Actions"
        description="Compose trigger surfaces with production trigger hooks, action chains, and exportable section JSON."
        affects="section triggers, custom trigger hooks, trigger actions, action chains, and runtime event handling"
        showSessionBadge
      />
      <div className="mb-4 flex justify-end">
        <SchemaBadge action={chainAction} />
      </div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
        <section className="space-y-5">
          <TriggerPreviewSandbox trigger={trigger} actions={actions} />
          <div className="grid gap-5 lg:grid-cols-2">
            <TriggerChainPanel
              trigger={trigger}
              actions={actions}
              eventLog={events}
              onTriggerChange={setTrigger}
              onRemoveAction={removeAction}
              onClearLog={() => setEvents([])}
            />
            <ActionCatalogPanel
              selectedGroup={selectedGroup}
              selectedType={selectedType}
              onGroupChange={changeGroup}
              onReplace={replaceAction}
              onAdd={addAction}
            />
          </div>
        </section>
        <aside className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Trigger JSON
          </p>
          <pre className="max-h-[48rem] overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
            {JSON.stringify(exportJson, null, 2)}
          </pre>
        </aside>
      </div>
    </DevWorkbenchPageShell>
  );
}
