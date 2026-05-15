"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SectionKey } from "./ModalsDevIndexClient";

type ModalTriggerType = "modalOpen" | "modalClose" | "modalToggle";

type Props = {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  sectionOrder: SectionKey[];
  setSectionOrder: Dispatch<SetStateAction<SectionKey[]>>;
  enterDurationMs: number;
  setEnterDurationMs: Dispatch<SetStateAction<number>>;
  exitDurationMs: number;
  setExitDurationMs: Dispatch<SetStateAction<number>>;
  easing: string;
  setEasing: Dispatch<SetStateAction<string>>;
  triggerModal: (type: ModalTriggerType) => void;
};

const TRIGGER_BUTTONS = [
  ["modalOpen", "Open trigger"],
  ["modalClose", "Close trigger"],
  ["modalToggle", "Toggle trigger"],
] as const;

function controlClassName(): string {
  return "rounded border border-border bg-background px-2.5 py-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-mono uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

export function ModalsDevControls({
  title,
  setTitle,
  sectionOrder,
  setSectionOrder,
  enterDurationMs,
  setEnterDurationMs,
  exitDurationMs,
  setExitDurationMs,
  easing,
  setEasing,
  triggerModal,
}: Props) {
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {TRIGGER_BUTTONS.map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => triggerModal(type)}
            className="rounded border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={controlClassName()}
          />
        </Field>
        <Field label="Section order">
          <select
            value={sectionOrder.join(",")}
            onChange={(event) => setSectionOrder(event.target.value.split(",") as SectionKey[])}
            className={controlClassName()}
          >
            <option value="intro,form,footer">intro, form, footer</option>
            <option value="form,intro,footer">form, intro, footer</option>
            <option value="intro,footer">intro, footer</option>
          </select>
        </Field>
        <Field label="Enter ms">
          <input
            type="number"
            value={enterDurationMs}
            onChange={(event) => setEnterDurationMs(Number(event.target.value))}
            className={controlClassName()}
          />
        </Field>
        <Field label="Exit ms">
          <input
            type="number"
            value={exitDurationMs}
            onChange={(event) => setExitDurationMs(Number(event.target.value))}
            className={controlClassName()}
          />
        </Field>
        <Field label="Easing">
          <input
            value={easing}
            onChange={(event) => setEasing(event.target.value)}
            className={controlClassName()}
          />
        </Field>
      </div>
    </>
  );
}
