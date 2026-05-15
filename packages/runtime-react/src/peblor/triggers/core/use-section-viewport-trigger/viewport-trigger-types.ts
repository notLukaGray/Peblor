import type { TriggerAction } from "@pb/contracts/types";

/** Sentinel used internally by viewport trigger when a trigger is "present" but the real action comes from section props. */
export type ViewportSentinelAction = { type: "__present__"; payload?: unknown };

export type ViewportTriggerAction = TriggerAction | ViewportSentinelAction;

export type SectionViewportTriggerOptions = {
  onVisible?: TriggerAction;
  onInvisible?: TriggerAction;
  onProgress?: TriggerAction;
  onViewportProgress?: TriggerAction;
  threshold?: number;
  triggerOnce?: boolean;
  rootMargin?: string;
  delay?: number;
};

export type NormalizedTriggerConfig = {
  onVisible?: ViewportTriggerAction;
  onInvisible?: ViewportTriggerAction;
  onProgress?: ViewportTriggerAction;
  onViewportProgress?: ViewportTriggerAction;
  threshold: number;
  triggerOnce: boolean;
  rootMargin?: string;
  delay: number;
};

export type ViewportTriggerState = {
  lastFiredState: boolean | null;
  hasFiredVisibleOnce: boolean;
  hasFiredInvisibleOnce: boolean;
};
