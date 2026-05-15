import type { AnalyticsEventKey } from "../../analytics/events";
import type { bgBlock } from "./peblor-schemas";
import type {
  ConditionOperator,
  VariableCondition,
  VisibleWhenConfig,
} from "./peblor-condition-evaluator";
import type { JsonValue, JsonPrimitive } from "../../core/lib/json-value";

export type { ConditionOperator, VariableCondition, VisibleWhenConfig };

export const OVERRIDE_KEY_BG = "bg" as const;

export type ContentOverrideAction = {
  type: "contentOverride";
  payload: { key: string; value: JsonValue };
};

export type BackgroundSwitchAction = {
  type: "backgroundSwitch";
  payload: bgBlock | string | Record<string, unknown>;
};

export type StartTransitionAction = {
  type: "startTransition";
  payload: { id: string };
};

export type StopTransitionAction = {
  type: "stopTransition";
  payload: { id: string };
};

export type UpdateTransitionProgressAction = {
  type: "updateTransitionProgress";
  payload: { id: string; progress?: number; invert?: boolean };
};

export interface BackAction {
  type: "back";
  payload?: Record<string, never>;
}

// --- Navigation & Scroll ---
type ScrollToBlock = "start" | "center" | "end" | "nearest";

/** payload.href: string; payload.replace?: boolean — uses Next.js router push/replace */
export type NavigateAction = { type: "navigate"; payload: { href: string; replace?: boolean } };
/** payload.id?: string (element id); payload.offset?: number (px); payload.behavior?: "smooth"|"instant"; payload.block?: "start"|"center"|"end"|"nearest" */
export type ScrollToAction = {
  type: "scrollTo";
  payload?: {
    id?: string;
    offset?: number;
    behavior?: "smooth" | "instant";
    block?: ScrollToBlock;
  };
};
/** Locks body scroll (overflow: hidden) */
export type ScrollLockAction = { type: "scrollLock"; payload?: Record<string, never> };
/** Restores body scroll */
export type ScrollUnlockAction = { type: "scrollUnlock"; payload?: Record<string, never> };

// --- Modal ---
/** payload.id: string — opens modal by id */
export type ModalOpenAction = { type: "modalOpen"; payload: { id: string } };
/** payload.id?: string — closes specific modal or topmost if omitted */
export type ModalCloseAction = { type: "modalClose"; payload?: { id?: string } };
/** payload.id: string — toggles modal by id */
export type ModalToggleAction = { type: "modalToggle"; payload: { id: string } };

// --- State & Logic ---
/** payload.key: string; payload.value: JsonValue — sets a named runtime variable */
export type SetVariableAction = { type: "setVariable"; payload: { key: string; value: JsonValue } };
/** payload.actions: TriggerAction[]; payload.mode?: "parallel"|"sequence"; payload.delayBetween?: number (ms, sequence only) */
export type FireMultipleAction = {
  type: "fireMultiple";
  payload: { actions: PeblorAction[]; mode?: "parallel" | "sequence"; delayBetween?: number };
};
export interface ConditionalBranch {
  conditions: VariableCondition[];
  logic?: "and" | "or";
  then: PeblorAction;
}

export interface ConditionalActionPayload {
  // Shorthand: single condition — backward-compatible with the old schema
  variable?: string;
  operator?: ConditionOperator;
  value?: JsonPrimitive;
  // Multi-condition alternative to shorthand
  conditions?: VariableCondition[];
  logic?: "and" | "or";

  then: PeblorAction;
  elseIf?: ConditionalBranch[];
  else?: PeblorAction;
}

export type ConditionalAction = {
  type: "conditionalAction";
  payload: ConditionalActionPayload;
};

// --- Element Visibility ---
/** payload.id: string — shows a 2D element by id */
export type ElementShowAction = { type: "elementShow"; payload: { id: string } };
/** payload.id: string — hides a 2D element by id */
export type ElementHideAction = { type: "elementHide"; payload: { id: string } };
/** payload.id: string — toggles 2D element visibility */
export type ElementToggleAction = { type: "elementToggle"; payload: { id: string } };

// --- Media ---
/** payload.src: string (url); payload.volume?: number 0–1; payload.loop?: boolean */
export type PlaySoundAction = {
  type: "playSound";
  payload: { src: string; volume?: number; loop?: boolean };
};
/** payload.src?: string — stops specific src or all if omitted */
export type StopSoundAction = { type: "stopSound"; payload?: { src?: string } };
/** payload.id?: string (element id); payload.volume: number 0–1 */
export type SetVolumeAction = { type: "setVolume"; payload: { volume: number; id?: string } };

// --- Browser / Device ---
/** payload.text: string — copies to clipboard */
export type CopyToClipboardAction = { type: "copyToClipboard"; payload: { text: string } };
/** payload.pattern?: number | number[] — navigator.vibrate pattern */
export type VibrateAction = { type: "vibrate"; payload?: { pattern?: number | number[] } };
/** payload.title: string */
export type SetDocumentTitleAction = { type: "setDocumentTitle"; payload: { title: string } };
/** payload.url: string; payload.target?: string (default "_blank") */
export type OpenExternalUrlAction = {
  type: "openExternalUrl";
  payload: { url: string; target?: string };
};

// --- Analytics ---
/** payload.event: AnalyticsEventKey; payload.properties?: Record<string, JsonValue> */
export type TrackEventAction = {
  type: "trackEvent";
  payload: { event: AnalyticsEventKey; properties?: Record<string, JsonValue> };
};

// --- Storage ---
/** payload.key: string; payload.value: JsonValue — JSON.stringify'd */
export type SetLocalStorageAction = {
  type: "setLocalStorage";
  payload: { key: string; value: JsonValue };
};
/** payload.key: string; payload.value: JsonValue */
export type SetSessionStorageAction = {
  type: "setSessionStorage";
  payload: { key: string; value: JsonValue };
};

// --- Theme ---
/** payload.mode: "light" | "dark" | "toggle" — updates document theme and persists to localStorage("theme"). */
export type SetThemeAction = {
  type: "setTheme";
  payload: { mode: "light" | "dark" | "toggle" };
};

// 3D element actions — discriminated union by type.
// All payload fields are optional. id targets a specific element; omit to broadcast.
// Zod validates field types at parse time; TypeScript enforces them at author time.

type Vec3 = [number, number, number];
type ThreeBasePayload = { id?: string };

export type ThreeLoadAction = { type: "three.load"; payload?: ThreeBasePayload };
export type ThreeUnloadAction = { type: "three.unload"; payload?: ThreeBasePayload };
export type ThreeToggleLoadedAction = { type: "three.toggleLoaded"; payload?: ThreeBasePayload };
export type ThreeSetVisibilityAction = {
  type: "three.setVisibility";
  payload?: ThreeBasePayload & { visible?: boolean };
};
export type ThreeFadeInAction = {
  type: "three.fadeIn";
  payload?: ThreeBasePayload & { durationMs?: number };
};
export type ThreeFadeOutAction = {
  type: "three.fadeOut";
  payload?: ThreeBasePayload & { durationMs?: number };
};
export type ThreePlayAnimationAction = {
  type: "three.playAnimation";
  payload?: ThreeBasePayload & { name?: string };
};
export type ThreePauseAnimationAction = {
  type: "three.pauseAnimation";
  payload?: ThreeBasePayload & { name?: string };
};
export type ThreeToggleAnimationAction = {
  type: "three.toggleAnimation";
  payload?: ThreeBasePayload & { name?: string };
};
export type ThreeSetAnimationAction = {
  type: "three.setAnimation";
  payload?: ThreeBasePayload & { name?: string };
};
export type ThreeSetCameraPresetAction = {
  type: "three.setCameraPreset";
  payload?: ThreeBasePayload & { preset?: string };
};
export type ThreeNextCameraPresetAction = {
  type: "three.nextCameraPreset";
  payload?: ThreeBasePayload & { preset?: string };
};
export type ThreeResetCameraAction = { type: "three.resetCamera"; payload?: ThreeBasePayload };
export type ThreePlayVideoTextureAction = {
  type: "three.playVideoTexture";
  payload?: ThreeBasePayload;
};
export type ThreePauseVideoTextureAction = {
  type: "three.pauseVideoTexture";
  payload?: ThreeBasePayload;
};
export type ThreeToggleVideoTextureAction = {
  type: "three.toggleVideoTexture";
  payload?: ThreeBasePayload;
};
export type ThreeSetCameraEffectsPresetAction = {
  type: "three.setCameraEffectsPreset";
  payload?: ThreeBasePayload & { preset?: string };
};
export type ThreeCrossFadeAnimationAction = {
  type: "three.crossFadeAnimation";
  payload?: ThreeBasePayload & { name?: string; durationMs?: number; warp?: boolean };
};
export type ThreeScrubAnimationAction = {
  type: "three.scrubAnimation";
  payload?: ThreeBasePayload & { clip?: string; progress?: number };
};

// --- Transform actions ---
export type ThreeSetPositionAction = {
  type: "three.setPosition";
  payload?: ThreeBasePayload & {
    position?: Vec3;
    x?: number;
    y?: number;
    z?: number;
    durationMs?: number;
  };
};
export type ThreeTranslateByAction = {
  type: "three.translateBy";
  payload?: ThreeBasePayload & { x?: number; y?: number; z?: number; durationMs?: number };
};
export type ThreeSetRotationAction = {
  type: "three.setRotation";
  payload?: ThreeBasePayload & {
    rotation?: Vec3;
    x?: number;
    y?: number;
    z?: number;
    durationMs?: number;
  };
};
export type ThreeRotateByAction = {
  type: "three.rotateBy";
  payload?: ThreeBasePayload & { x?: number; y?: number; z?: number };
};
export type ThreeSetScaleAction = {
  type: "three.setScale";
  payload?: ThreeBasePayload & { scale?: number | Vec3; durationMs?: number };
};
export type ThreeScaleByAction = {
  type: "three.scaleBy";
  payload?: ThreeBasePayload & { factor?: number };
};
export type ThreeResetTransformAction = {
  type: "three.resetTransform";
  payload?: ThreeBasePayload;
};
export type ThreeAnimateToAction = {
  type: "three.animateTo";
  payload?: ThreeBasePayload & {
    position?: Vec3;
    rotation?: Vec3;
    scale?: number | Vec3;
    durationMs?: number;
  };
};

// --- Continuous loop actions ---
export type ThreeStartContinuousRotateAction = {
  type: "three.startContinuousRotate";
  payload?: ThreeBasePayload & { axis?: "x" | "y" | "z"; speed?: number };
};
export type ThreeStopContinuousRotateAction = {
  type: "three.stopContinuousRotate";
  payload?: ThreeBasePayload;
};
export type ThreeStartContinuousFloatAction = {
  type: "three.startContinuousFloat";
  payload?: ThreeBasePayload & { amount?: number; speed?: number };
};
export type ThreeStopContinuousFloatAction = {
  type: "three.stopContinuousFloat";
  payload?: ThreeBasePayload;
};
export type ThreeStartContinuousScaleAction = {
  type: "three.startContinuousScale";
  payload?: ThreeBasePayload & { min?: number; max?: number; speed?: number };
};
export type ThreeStopContinuousScaleAction = {
  type: "three.stopContinuousScale";
  payload?: ThreeBasePayload;
};

// --- Camera extended actions ---
export type ThreeAnimateCameraAction = {
  type: "three.animateCamera";
  payload?: ThreeBasePayload & {
    position?: Vec3;
    lookAt?: Vec3;
    fov?: number;
    durationMs?: number;
  };
};
export type ThreeOrbitEnableAction = {
  type: "three.orbitEnable";
  payload?: ThreeBasePayload & { autoRotate?: boolean; autoRotateSpeed?: number };
};
export type ThreeOrbitDisableAction = { type: "three.orbitDisable"; payload?: ThreeBasePayload };

// --- Material actions ---
export type ThreeSetMaterialColorAction = {
  type: "three.setMaterialColor";
  payload?: ThreeBasePayload & { color?: string; meshName?: string };
};
export type ThreeSetMaterialOpacityAction = {
  type: "three.setMaterialOpacity";
  payload?: ThreeBasePayload & { opacity?: number; meshName?: string; durationMs?: number };
};
export type ThreeSetEmissiveIntensityAction = {
  type: "three.setEmissiveIntensity";
  payload?: ThreeBasePayload & { intensity?: number; meshName?: string };
};

// --- Scene object actions ---
export type ThreeSetLightIntensityAction = {
  type: "three.setLightIntensity";
  payload?: ThreeBasePayload & { intensity?: number; index?: number; name?: string };
};
export type ThreeSetLightColorAction = {
  type: "three.setLightColor";
  payload?: ThreeBasePayload & { color?: string; index?: number; name?: string };
};

// --- Post-processing actions ---
export type ThreeSetPostProcessingParamAction = {
  type: "three.setPostProcessingParam";
  payload?: ThreeBasePayload & { effect?: string; param?: string; value?: number };
};
export type ThreeTogglePostEffectAction = {
  type: "three.togglePostEffect";
  payload?: ThreeBasePayload & { effect?: string; enabled?: boolean };
};

// rive.* element actions
// Payloads are typed as optional Record<string, unknown> to stay compatible
// with the Zod-inferred schema (rivePayload). Field-level specifics documented below;
// the dispatcher reads them dynamically.

/** payload.id?: string; payload.input: string; payload.value: boolean | number — set a SM boolean or number input */
export type RiveSetInputAction = { type: "rive.setInput"; payload?: Record<string, unknown> };
/** payload.id?: string; payload.input: string — fire a SM trigger input */
export type RiveFireTriggerAction = { type: "rive.fireTrigger"; payload?: Record<string, unknown> };
/** payload.id?: string; payload.animationName?: string — play a specific animation or activate the SM */
export type RivePlayAction = { type: "rive.play"; payload?: Record<string, unknown> };
/** payload.id?: string */
export type RivePauseAction = { type: "rive.pause"; payload?: Record<string, unknown> };
/** payload.id?: string */
export type RiveResetAction = { type: "rive.reset"; payload?: Record<string, unknown> };

export type RiveAction =
  | RiveSetInputAction
  | RiveFireTriggerAction
  | RivePlayAction
  | RivePauseAction
  | RiveResetAction;

export type Model3DAction =
  | ThreeLoadAction
  | ThreeUnloadAction
  | ThreeToggleLoadedAction
  | ThreeSetVisibilityAction
  | ThreeFadeInAction
  | ThreeFadeOutAction
  | ThreePlayAnimationAction
  | ThreePauseAnimationAction
  | ThreeToggleAnimationAction
  | ThreeSetAnimationAction
  | ThreeSetCameraPresetAction
  | ThreeNextCameraPresetAction
  | ThreeResetCameraAction
  | ThreePlayVideoTextureAction
  | ThreePauseVideoTextureAction
  | ThreeToggleVideoTextureAction
  | ThreeSetCameraEffectsPresetAction
  | ThreeCrossFadeAnimationAction
  | ThreeScrubAnimationAction
  // Transform
  | ThreeSetPositionAction
  | ThreeTranslateByAction
  | ThreeSetRotationAction
  | ThreeRotateByAction
  | ThreeSetScaleAction
  | ThreeScaleByAction
  | ThreeResetTransformAction
  | ThreeAnimateToAction
  // Continuous
  | ThreeStartContinuousRotateAction
  | ThreeStopContinuousRotateAction
  | ThreeStartContinuousFloatAction
  | ThreeStopContinuousFloatAction
  | ThreeStartContinuousScaleAction
  | ThreeStopContinuousScaleAction
  // Camera extended
  | ThreeAnimateCameraAction
  | ThreeOrbitEnableAction
  | ThreeOrbitDisableAction
  // Material
  | ThreeSetMaterialColorAction
  | ThreeSetMaterialOpacityAction
  | ThreeSetEmissiveIntensityAction
  // Scene
  | ThreeSetLightIntensityAction
  | ThreeSetLightColorAction
  // Post-processing
  | ThreeSetPostProcessingParamAction
  | ThreeTogglePostEffectAction;

export type PeblorAction =
  | ContentOverrideAction
  | BackgroundSwitchAction
  | BackAction
  | StartTransitionAction
  | StopTransitionAction
  | UpdateTransitionProgressAction
  // Navigation & Scroll
  | NavigateAction
  | ScrollToAction
  | ScrollLockAction
  | ScrollUnlockAction
  // Modal
  | ModalOpenAction
  | ModalCloseAction
  | ModalToggleAction
  // State & Logic
  | SetVariableAction
  | FireMultipleAction
  | ConditionalAction
  // Element Visibility
  | ElementShowAction
  | ElementHideAction
  | ElementToggleAction
  // Media
  | PlaySoundAction
  | StopSoundAction
  | SetVolumeAction
  // Browser
  | CopyToClipboardAction
  | VibrateAction
  | SetDocumentTitleAction
  | OpenExternalUrlAction
  // Analytics
  | TrackEventAction
  // Storage
  | SetLocalStorageAction
  | SetSessionStorageAction
  // Theme
  | SetThemeAction
  | Model3DAction
  | RiveAction;

/** Alias for the full action union; use in trigger options and handler signatures. */
export type TriggerAction = PeblorAction;

export type SectionTriggerOptions = {
  onVisible?: TriggerAction;
  onInvisible?: TriggerAction;
  onProgress?: TriggerAction;
  onViewportProgress?: TriggerAction;
  threshold?: number;
  triggerOnce?: boolean;
  rootMargin?: string;
  delay?: number;
  sticky?: boolean;
  stickyOffset?: string;
};
