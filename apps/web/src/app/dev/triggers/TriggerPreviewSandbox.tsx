"use client";

import { useMemo, useState } from "react";
import type { PeblorAction, SectionBlock } from "@pb/contracts";
import { DeviceTypeProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import {
  PageTrigger,
  firePeblorAction,
  firePeblorProgressTrigger,
  firePeblorTrigger,
} from "@/peblor/triggers";
import {
  buildChainAction,
  buildTriggerExport,
  type TriggerWorkbenchKey,
  type WorkbenchAction,
} from "./trigger-action-catalog";

type Props = {
  trigger: TriggerWorkbenchKey;
  actions: WorkbenchAction[];
};

const SANDBOXED_TYPES = new Set(["back", "navigate", "scrollLock", "openExternalUrl"]);

function previewAction(action: WorkbenchAction): WorkbenchAction {
  if (!SANDBOXED_TYPES.has(action.type)) return action;
  return {
    type: "setVariable",
    payload: { key: `sandboxed.${action.type}`, value: action.payload ?? true },
  };
}

function fireTrigger(trigger: TriggerWorkbenchKey, action: WorkbenchAction, progress: number) {
  const runtimeAction = action as PeblorAction;
  if (trigger === "onVisible") firePeblorTrigger(true, runtimeAction, "trigger_workbench");
  else if (trigger === "onInvisible") firePeblorTrigger(false, runtimeAction, "trigger_workbench");
  else if (trigger === "onProgress" || trigger === "onCursor") {
    firePeblorProgressTrigger(progress, runtimeAction, "trigger_workbench");
  } else firePeblorAction(runtimeAction, "trigger");
}

export function TriggerPreviewSandbox({ trigger, actions }: Props) {
  const [progress, setProgress] = useState(0.5);
  const previewActions = useMemo(() => actions.map(previewAction), [actions]);
  const action = useMemo(() => buildChainAction(previewActions), [previewActions]);
  const section = useMemo(
    () =>
      ({
        ...buildTriggerExport(trigger, previewActions),
        width: "100%",
        height: "4px",
        marginTop: "16rem",
        marginBottom: "16rem",
        threshold: 0.1,
        rootMargin: "0px",
      }) as Extract<SectionBlock, { type: "sectionTrigger" }>,
    [trigger, previewActions]
  );

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Live Preview Sandbox
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The production trigger component is mounted here. Navigation and external URL actions are
          converted to sandbox variables for preview only.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <DeviceTypeProvider>
          <div className="h-80 overflow-y-auto rounded border border-border bg-background p-4">
            <div className="grid h-48 place-items-center rounded border border-dashed border-border/70 text-xs text-muted-foreground">
              Scroll down through this panel
            </div>
            <PageTrigger {...section} />
            <div
              id="trigger-demo-element"
              className="grid h-32 place-items-center rounded border border-foreground/30 bg-foreground/10 text-sm text-foreground"
            >
              Demo element target
            </div>
            <video
              id="trigger-demo-video"
              className="mt-4 h-16 w-full rounded border border-border"
              muted
            />
            <div className="mt-4 grid h-48 place-items-center rounded border border-dashed border-border/70 text-xs text-muted-foreground">
              Keep scrolling for visible, invisible, and progress events
            </div>
          </div>
        </DeviceTypeProvider>
        <div className="space-y-3 rounded border border-border bg-background p-3">
          <label className="grid gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono uppercase tracking-wide">Progress</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
            />
            <span className="font-mono">{progress.toFixed(2)}</span>
          </label>
          <button
            type="button"
            onClick={() => fireTrigger(trigger, action, progress)}
            className="w-full rounded border border-foreground/40 bg-foreground px-3 py-2 text-[12px] font-mono text-background"
          >
            Fire selected trigger
          </button>
          <p className="text-xs leading-5 text-muted-foreground">
            Keyboard uses K. Timer fires once after one second. Cursor maps pointer X to progress.
            Idle fires after 1.5 seconds without input.
          </p>
        </div>
      </div>
    </section>
  );
}
