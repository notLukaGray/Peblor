/**
 * Parses annotation keys into peblor section trigger and effect props.
 */

import { parseTriggerShorthand } from "./annotations-trigger";
import { parseAnnotationValue, annotationFlag, annotationNumber } from "./annotations-parse";
import {
  collectKeyedValues,
  parseTimerShorthand,
  parseTimerIntervalShorthand,
  parseKeyShorthand,
  parseEffectShorthand,
} from "./section-trigger-parsers";

/** All trigger/effect/behavioural props that can be expressed via annotations. */
export interface SectionTriggerProps {
  timerTriggers?: unknown[];
  keyboardTriggers?: unknown[];
  scrollDirectionTriggers?: unknown[];
  idleTriggers?: unknown[];
  cursorTriggers?: unknown[];
  effects?: unknown[];
  sticky?: boolean;
  stickyOffset?: string;
  stickyPosition?: "top" | "bottom";
  visibleWhen?: unknown;
  scrollOpacityRange?: unknown;
  triggerOnce?: boolean;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  ariaLabel?: string;
  scrollSpeed?: number;
}

/**
 * Parses all trigger, effect, and behavioural annotation keys from an annotation
 * map and returns a partial section props object.
 */
export function parseSectionTriggerProps(annotations: Record<string, string>): SectionTriggerProps {
  const props: SectionTriggerProps = {};

  // Timer triggers
  const timerValues = collectKeyedValues(annotations, "timer");
  const timerEntries: unknown[] = [];
  for (const v of timerValues) {
    const entry = parseTimerShorthand(v);
    if (entry) timerEntries.push(entry);
  }
  const timerIntervalValues = collectKeyedValues(annotations, "timerinterval");
  for (const v of timerIntervalValues) {
    const entry = parseTimerIntervalShorthand(v);
    if (entry) timerEntries.push(entry);
  }
  if (timerEntries.length > 0) props.timerTriggers = timerEntries;

  // Keyboard triggers
  const keyValues = collectKeyedValues(annotations, "key");
  const keyEntries: unknown[] = [];
  for (const v of keyValues) {
    const entry = parseKeyShorthand(v);
    if (entry) keyEntries.push(entry);
  }
  if (keyEntries.length > 0) props.keyboardTriggers = keyEntries;

  // Scroll direction triggers
  const onScrollDown = annotations["onscrolldown"];
  const onScrollUp = annotations["onscrollup"];
  if (onScrollDown !== undefined || onScrollUp !== undefined) {
    const entry: Record<string, unknown> = {};
    if (onScrollDown !== undefined) {
      const action = parseTriggerShorthand(onScrollDown);
      if (action) entry.onScrollDown = action;
    }
    if (onScrollUp !== undefined) {
      const action = parseTriggerShorthand(onScrollUp);
      if (action) entry.onScrollUp = action;
    }
    if (Object.keys(entry).length > 0) {
      props.scrollDirectionTriggers = [entry];
    }
  }

  // Idle triggers
  const idleValues = collectKeyedValues(annotations, "idle");
  const idleEntries: unknown[] = [];
  for (const v of idleValues) {
    const colonIdx = v.indexOf(":");
    if (colonIdx === -1) continue;
    const ms = parseFloat(v.slice(0, colonIdx));
    if (isNaN(ms)) continue;
    const rest = v.slice(colonIdx + 1).trim();
    const action = parseTriggerShorthand(rest);
    if (action) idleEntries.push({ idleAfterMs: ms, onIdle: action });
  }
  if (idleEntries.length > 0) props.idleTriggers = idleEntries;

  // Cursor triggers
  const cursorValues = collectKeyedValues(annotations, "cursor");
  const cursorEntries: unknown[] = [];
  for (const v of cursorValues) {
    const colonIdx = v.indexOf(":");
    if (colonIdx === -1) continue;
    const axis = v.slice(0, colonIdx).trim().toLowerCase();
    if (axis !== "x" && axis !== "y") continue;
    const rest = v.slice(colonIdx + 1).trim();
    const action = parseTriggerShorthand(rest);
    if (action) cursorEntries.push({ axis, action });
  }
  if (cursorEntries.length > 0) props.cursorTriggers = cursorEntries;

  // Effects
  const effectValues = collectKeyedValues(annotations, "effect");
  const effectEntries: unknown[] = [];
  for (const v of effectValues) {
    const entry = parseEffectShorthand(v);
    if (entry) effectEntries.push(entry);
  }
  if (effectEntries.length > 0) props.effects = effectEntries;

  // Sticky
  if (annotationFlag(annotations, "sticky")) {
    props.sticky = true;
    if (annotations["stickyoffset"] !== undefined) props.stickyOffset = annotations["stickyoffset"];
    const stickyPos = annotations["stickyposition"];
    if (stickyPos === "top" || stickyPos === "bottom") props.stickyPosition = stickyPos;
  }

  // visibleWhen
  const visibleWhenRaw = annotations["visiblewhen"];
  if (visibleWhenRaw !== undefined) {
    const parts = visibleWhenRaw.split(":");
    if (parts.length >= 3) {
      const variable = parts[0].trim();
      const operator = parts[1].trim();
      const valueStr = parts.slice(2).join(":").trim();
      const validOperators = [
        "equals",
        "notEquals",
        "gt",
        "gte",
        "lt",
        "lte",
        "contains",
        "startsWith",
      ] as const;
      type Operator = (typeof validOperators)[number];
      if (variable && validOperators.includes(operator as Operator)) {
        props.visibleWhen = { variable, operator, value: parseAnnotationValue(valueStr) };
      }
    }
  }

  // scrollOpacityRange
  const scrollOpacityRaw = annotations["scrollopacity"];
  if (scrollOpacityRaw !== undefined) {
    const colon = scrollOpacityRaw.split(":");
    const comma = scrollOpacityRaw.split(",").map((p) => p.trim());
    let is: number | undefined;
    let ie: number | undefined;
    let os: number | undefined;
    let oe: number | undefined;
    if (colon.length === 4) {
      [is, ie, os, oe] = colon.map((p) => parseFloat(p.trim())) as [number, number, number, number];
    } else if (comma.length === 4) {
      [is, ie, os, oe] = comma.map((p) => parseFloat(p)) as [number, number, number, number];
    }
    if (
      is !== undefined &&
      ie !== undefined &&
      os !== undefined &&
      oe !== undefined &&
      ![is, ie, os, oe].some((n) => Number.isNaN(n))
    ) {
      props.scrollOpacityRange = { input: [is, ie], output: [os, oe] };
    }
  }

  // Scalar props
  if (annotationFlag(annotations, "triggeronce")) props.triggerOnce = true;

  const threshold = annotationNumber(annotations, "threshold");
  if (threshold !== undefined) props.threshold = threshold;

  if (annotations["rootmargin"] !== undefined) props.rootMargin = annotations["rootmargin"];

  const delay = annotationNumber(annotations, "delay");
  if (delay !== undefined) props.delay = delay;

  if (annotations["arialabel"] !== undefined) props.ariaLabel = annotations["arialabel"];

  // onVisible / onInvisible
  if (annotations["onvisible"] !== undefined) {
    const action = parseTriggerShorthand(annotations["onvisible"]);
    if (action) (props as Record<string, unknown>)["onVisible"] = action;
  }
  if (annotations["oninvisible"] !== undefined) {
    const action = parseTriggerShorthand(annotations["oninvisible"]);
    if (action) (props as Record<string, unknown>)["onInvisible"] = action;
  }

  // scrollSpeed
  const scrollSpeed = annotationNumber(annotations, "scrollspeed");
  if (scrollSpeed !== undefined) props.scrollSpeed = scrollSpeed;

  return props;
}
