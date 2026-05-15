import type { PeblorAction } from "@pb/contracts";
import type { TriggerWorkbenchKey, WorkbenchAction } from "./trigger-action-groups";
import { THREE_DEFAULTS } from "./trigger-action-three-defaults";

export {
  ACTION_GROUPS,
  TRIGGER_TYPES,
  type ActionGroupKey,
  type TriggerWorkbenchKey,
  type WorkbenchAction,
} from "./trigger-action-groups";

const SIMPLE_SET: PeblorAction = {
  type: "setVariable",
  payload: { key: "triggerWorkbench", value: true },
};

const SECOND_SET: PeblorAction = {
  type: "setVariable",
  payload: { key: "triggerWorkbenchChain", value: "complete" },
};

const ACTION_BUILDERS: Record<string, () => WorkbenchAction> = {
  contentOverride: () => ({
    type: "contentOverride",
    payload: { key: "headline", value: "Triggered" },
  }),
  backgroundSwitch: () => ({ type: "backgroundSwitch", payload: "trigger-background" }),
  startTransition: () => ({ type: "startTransition", payload: { id: "trigger_transition" } }),
  stopTransition: () => ({ type: "stopTransition", payload: { id: "trigger_transition" } }),
  updateTransitionProgress: () => ({
    type: "updateTransitionProgress",
    payload: { id: "trigger_transition", progress: 0.5 },
  }),
  back: () => ({ type: "back" }),
  navigate: () => ({ type: "navigate", payload: { href: "/dev", replace: false } }),
  scrollTo: () => ({
    type: "scrollTo",
    payload: { id: "trigger-demo-element", behavior: "smooth", block: "center" },
  }),
  scrollLock: () => ({ type: "scrollLock" }),
  scrollUnlock: () => ({ type: "scrollUnlock" }),
  modalOpen: () => ({ type: "modalOpen", payload: { id: "trigger_modal" } }),
  modalClose: () => ({ type: "modalClose", payload: { id: "trigger_modal" } }),
  modalToggle: () => ({ type: "modalToggle", payload: { id: "trigger_modal" } }),
  setVariable: () => SIMPLE_SET,
  fireMultiple: () => ({
    type: "fireMultiple",
    payload: { mode: "sequence", delayBetween: 80, actions: [SIMPLE_SET, SECOND_SET] },
  }),
  conditionalAction: () => ({
    type: "conditionalAction",
    payload: {
      variable: "triggerWorkbench",
      operator: "equals",
      value: true,
      then: SIMPLE_SET,
      else: { type: "setVariable", payload: { key: "triggerWorkbench", value: false } },
    },
  }),
  elementShow: () => ({ type: "elementShow", payload: { id: "trigger-demo-element" } }),
  elementHide: () => ({ type: "elementHide", payload: { id: "trigger-demo-element" } }),
  elementToggle: () => ({ type: "elementToggle", payload: { id: "trigger-demo-element" } }),
  playSound: () => ({
    type: "playSound",
    payload: { src: "/dev/trigger-workbench.mp3", volume: 0.35 },
  }),
  stopSound: () => ({ type: "stopSound", payload: { src: "/dev/trigger-workbench.mp3" } }),
  setVolume: () => ({ type: "setVolume", payload: { id: "trigger-demo-video", volume: 0.5 } }),
  copyToClipboard: () => ({
    type: "copyToClipboard",
    payload: { text: "Copied from trigger workbench" },
  }),
  vibrate: () => ({ type: "vibrate", payload: { pattern: 50 } }),
  setDocumentTitle: () => ({ type: "setDocumentTitle", payload: { title: "Trigger Workbench" } }),
  openExternalUrl: () => ({
    type: "openExternalUrl",
    payload: { url: "https://example.com", target: "_blank" },
  }),
  trackEvent: () => ({
    type: "trackEvent",
    payload: { event: "trigger_workbench", properties: { source: "dev" } },
  }),
  setLocalStorage: () => ({
    type: "setLocalStorage",
    payload: { key: "triggerWorkbench", value: true },
  }),
  setSessionStorage: () => ({
    type: "setSessionStorage",
    payload: { key: "triggerWorkbench", value: true },
  }),
  assetPlay: () => ({ type: "assetPlay", payload: { id: "trigger-demo-video" } }),
  assetPause: () => ({ type: "assetPause", payload: { id: "trigger-demo-video" } }),
  assetTogglePlay: () => ({ type: "assetTogglePlay", payload: { id: "trigger-demo-video" } }),
  assetSeek: () => ({ type: "assetSeek", payload: { id: "trigger-demo-video", time: 2 } }),
  assetMute: () => ({ type: "assetMute", payload: { id: "trigger-demo-video" } }),
  videoFullscreen: () => ({ type: "videoFullscreen", payload: { id: "trigger-demo-video" } }),
  "rive.setInput": () => ({
    type: "rive.setInput",
    payload: { id: "rive-demo", input: "active", value: true },
  }),
  "rive.fireTrigger": () => ({
    type: "rive.fireTrigger",
    payload: { id: "rive-demo", input: "tap" },
  }),
  "rive.play": () => ({ type: "rive.play", payload: { id: "rive-demo", animationName: "idle" } }),
  "rive.pause": () => ({ type: "rive.pause", payload: { id: "rive-demo" } }),
  "rive.reset": () => ({ type: "rive.reset", payload: { id: "rive-demo" } }),
};

export function buildAction(type: string): WorkbenchAction {
  if (ACTION_BUILDERS[type]) return ACTION_BUILDERS[type]();
  if (THREE_DEFAULTS[type]) return THREE_DEFAULTS[type];
  if (type.startsWith("three.")) return { type, payload: { id: "model3d-demo" } };
  return SIMPLE_SET;
}

export function buildChainAction(actions: WorkbenchAction[]): WorkbenchAction {
  if (actions.length === 1) return actions[0] ?? SIMPLE_SET;
  return {
    type: "fireMultiple",
    payload: { mode: "sequence", delayBetween: 80, actions: actions as PeblorAction[] },
  };
}

export function buildTriggerExport(trigger: TriggerWorkbenchKey, actions: WorkbenchAction[]) {
  const action = buildChainAction(actions);
  const base = { type: "sectionTrigger", id: "trigger_workbench" };
  if (trigger === "onKeyboard") {
    return { ...base, keyboardTriggers: [{ key: "k", onKeyDown: action, preventDefault: true }] };
  }
  if (trigger === "onTimer")
    return { ...base, timerTriggers: [{ delay: 1000, maxFires: 1, action }] };
  if (trigger === "onCursor") {
    return { ...base, cursorTriggers: [{ axis: "x", action, throttleMs: 100 }] };
  }
  if (trigger === "onScrollDirection") {
    return {
      ...base,
      scrollDirectionTriggers: [{ onScrollDown: action, onScrollUp: action, threshold: 8 }],
    };
  }
  if (trigger === "onIdle") {
    return { ...base, idleTriggers: [{ idleAfterMs: 1500, onIdle: action, onActive: action }] };
  }
  return { ...base, [trigger]: action };
}
