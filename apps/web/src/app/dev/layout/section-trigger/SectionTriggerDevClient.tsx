"use client";

import { useEffect, useMemo, useState } from "react";
import type { PeblorAction, SectionBlock } from "@pb/contracts";
import { PEBLOR_TRIGGER_EVENT, type PeblorTriggerDetail } from "@/peblor/triggers";
import {
  BooleanField,
  Field,
  SectionPreview,
  SectionWorkbenchLayout,
  controlClassName,
} from "@/app/dev/layout/_shared/section-type-workbench";

type TriggerKey =
  | "visible"
  | "invisible"
  | "progress"
  | "keyboard"
  | "timer"
  | "cursor"
  | "scrollDirection"
  | "idle"
  | "visibleWhen";

const ACTION: PeblorAction = {
  type: "setVariable",
  payload: { key: "sectionTriggerWorkbench", value: true },
};

const DEFAULT_ENABLED: Record<TriggerKey, boolean> = {
  visible: true,
  invisible: true,
  progress: true,
  keyboard: false,
  timer: false,
  cursor: false,
  scrollDirection: false,
  idle: false,
  visibleWhen: false,
};

function viewportTriggers(enabled: Record<TriggerKey, boolean>): Partial<SectionBlock> {
  return {
    ...(enabled.visible ? { onVisible: ACTION } : {}),
    ...(enabled.invisible ? { onInvisible: ACTION } : {}),
    ...(enabled.progress ? { onProgress: ACTION } : {}),
  };
}

function customTriggers(enabled: Record<TriggerKey, boolean>): Partial<SectionBlock> {
  return {
    ...(enabled.keyboard
      ? { keyboardTriggers: [{ key: "k", onKeyDown: ACTION, preventDefault: true }] }
      : {}),
    ...(enabled.timer ? { timerTriggers: [{ delay: 1200, maxFires: 1, action: ACTION }] } : {}),
    ...(enabled.cursor ? { cursorTriggers: [{ axis: "x", action: ACTION, throttleMs: 120 }] } : {}),
    ...(enabled.scrollDirection
      ? { scrollDirectionTriggers: [{ onScrollDown: ACTION, onScrollUp: ACTION, threshold: 8 }] }
      : {}),
    ...(enabled.idle
      ? { idleTriggers: [{ idleAfterMs: 1800, onIdle: ACTION, onActive: ACTION }] }
      : {}),
  };
}

function visibleWhenConfig(enabled: Record<TriggerKey, boolean>): Partial<SectionBlock> {
  return enabled.visibleWhen
    ? { visibleWhen: { variable: "sectionTriggerWorkbench", operator: "equals", value: true } }
    : {};
}

function buildSection(
  enabled: Record<TriggerKey, boolean>,
  threshold: number,
  delay: number,
  triggerOnce: boolean,
  rootMargin: string
): SectionBlock {
  return {
    type: "sectionTrigger",
    id: "section_trigger_workbench",
    ariaLabel: "Workbench section trigger sentinel",
    width: "100%",
    height: "2px",
    marginTop: "8rem",
    marginBottom: "8rem",
    threshold,
    delay,
    triggerOnce,
    rootMargin,
    ...viewportTriggers(enabled),
    ...customTriggers(enabled),
    ...visibleWhenConfig(enabled),
  } as SectionBlock;
}

function useTriggerLog() {
  const [events, setEvents] = useState<string[]>([]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PeblorTriggerDetail>).detail;
      const kind =
        detail.progress != null
          ? `progress ${detail.progress.toFixed(2)}`
          : detail.visible != null
            ? detail.visible
              ? "visible"
              : "invisible"
            : (detail.source ?? "action");
      setEvents((prev) => [`${kind} -> ${detail.action.type}`, ...prev].slice(0, 6));
    };
    window.addEventListener(PEBLOR_TRIGGER_EVENT, handler);
    return () => window.removeEventListener(PEBLOR_TRIGGER_EVENT, handler);
  }, []);
  return events;
}

export function SectionTriggerDevClient() {
  const [enabled, setEnabled] = useState(DEFAULT_ENABLED);
  const [threshold, setThreshold] = useState(0.2);
  const [delay, setDelay] = useState(0);
  const [triggerOnce, setTriggerOnce] = useState(false);
  const [rootMargin, setRootMargin] = useState("0px");
  const events = useTriggerLog();
  const section = useMemo(
    () => buildSection(enabled, threshold, delay, triggerOnce, rootMargin),
    [enabled, threshold, delay, triggerOnce, rootMargin]
  );

  const setEnabledKey = (key: TriggerKey, checked: boolean) => {
    setEnabled((prev) => ({ ...prev, [key]: checked }));
  };

  return (
    <SectionWorkbenchLayout
      eyebrow="Dev · Layout"
      title="Section Trigger"
      description="Wire section-level triggers and watch their production events fire from a sentinel section."
      affects="sectionTrigger blocks, trigger actions, viewport thresholds, keyboard/timer/cursor/idle hooks, and visibleWhen config"
      section={section}
      onReset={() => {
        setEnabled(DEFAULT_ENABLED);
        setThreshold(0.2);
        setDelay(0);
        setTriggerOnce(false);
        setRootMargin("0px");
      }}
      preview={
        <SectionPreview section={section}>
          <div className="pointer-events-none absolute inset-x-5 top-5 z-20 rounded border border-border bg-background/90 p-3 text-[11px] text-muted-foreground">
            <p className="font-mono uppercase tracking-wide">Scroll this panel or press K</p>
            <div className="mt-2 min-h-20 space-y-1 font-mono">
              {events.length ? (
                events.map((entry, i) => <p key={`${i}-${entry}`}>{entry}</p>)
              ) : (
                <p>No events yet</p>
              )}
            </div>
          </div>
        </SectionPreview>
      }
      controls={
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(enabled) as TriggerKey[]).map((key) => (
              <BooleanField
                key={key}
                label={key}
                checked={enabled[key]}
                onChange={(checked) => setEnabledKey(key, checked)}
              />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Threshold">
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                className={controlClassName()}
              />
            </Field>
            <Field label="Delay ms">
              <input
                type="number"
                min={0}
                value={delay}
                onChange={(event) => setDelay(Number(event.target.value))}
                className={controlClassName()}
              />
            </Field>
            <Field label="Root margin">
              <input
                value={rootMargin}
                onChange={(event) => setRootMargin(event.target.value)}
                className={controlClassName()}
              />
            </Field>
            <BooleanField label="Trigger once" checked={triggerOnce} onChange={setTriggerOnce} />
          </div>
        </div>
      }
    />
  );
}
