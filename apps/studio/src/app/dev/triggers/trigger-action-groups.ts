export type TriggerWorkbenchKey =
  | "onVisible"
  | "onInvisible"
  | "onProgress"
  | "onKeyboard"
  | "onTimer"
  | "onCursor"
  | "onScrollDirection"
  | "onIdle";

export type WorkbenchAction = {
  type: string;
  payload?: unknown;
};

export type ActionGroupKey =
  | "core"
  | "navigation"
  | "modal"
  | "state"
  | "visibility"
  | "media"
  | "browser"
  | "analytics"
  | "three"
  | "asset"
  | "rive";

type ActionGroup = {
  key: ActionGroupKey;
  label: string;
  actions: string[];
};

export const TRIGGER_TYPES: {
  key: TriggerWorkbenchKey;
  label: string;
  description: string;
}[] = [
  { key: "onVisible", label: "onVisible", description: "Intersection enters the viewport." },
  { key: "onInvisible", label: "onInvisible", description: "Intersection leaves the viewport." },
  { key: "onProgress", label: "onProgress", description: "Scroll progress updates from 0 to 1." },
  { key: "onKeyboard", label: "onKeyboard", description: "Key K fires while mounted." },
  { key: "onTimer", label: "onTimer", description: "Delay or interval fires while mounted." },
  { key: "onCursor", label: "onCursor", description: "Pointer position becomes trigger progress." },
  {
    key: "onScrollDirection",
    label: "onScrollDirection",
    description: "Scroll up or down fires direction actions.",
  },
  { key: "onIdle", label: "onIdle", description: "Inactivity and return-to-active actions." },
];

export const ACTION_GROUPS: ActionGroup[] = [
  {
    key: "core",
    label: "Core",
    actions: [
      "contentOverride",
      "backgroundSwitch",
      "startTransition",
      "stopTransition",
      "updateTransitionProgress",
    ],
  },
  {
    key: "navigation",
    label: "Navigation / scroll",
    actions: ["back", "navigate", "scrollTo", "scrollLock", "scrollUnlock"],
  },
  { key: "modal", label: "Modal", actions: ["modalOpen", "modalClose", "modalToggle"] },
  {
    key: "state",
    label: "State / logic",
    actions: ["setVariable", "fireMultiple", "conditionalAction"],
  },
  {
    key: "visibility",
    label: "Element visibility",
    actions: ["elementShow", "elementHide", "elementToggle"],
  },
  { key: "media", label: "Media", actions: ["playSound", "stopSound", "setVolume"] },
  {
    key: "browser",
    label: "Clipboard / device / external",
    actions: ["copyToClipboard", "vibrate", "setDocumentTitle", "openExternalUrl"],
  },
  {
    key: "analytics",
    label: "Analytics / storage",
    actions: ["trackEvent", "setLocalStorage", "setSessionStorage"],
  },
  {
    key: "three",
    label: "3D",
    actions: [
      "three.load",
      "three.unload",
      "three.toggleLoaded",
      "three.setVisibility",
      "three.fadeIn",
      "three.fadeOut",
      "three.playAnimation",
      "three.pauseAnimation",
      "three.toggleAnimation",
      "three.setAnimation",
      "three.crossFadeAnimation",
      "three.scrubAnimation",
      "three.setCameraPreset",
      "three.nextCameraPreset",
      "three.resetCamera",
      "three.playVideoTexture",
      "three.pauseVideoTexture",
      "three.toggleVideoTexture",
      "three.setCameraEffectsPreset",
      "three.setPosition",
      "three.translateBy",
      "three.setRotation",
      "three.rotateBy",
      "three.setScale",
      "three.scaleBy",
      "three.resetTransform",
      "three.animateTo",
      "three.startContinuousRotate",
      "three.stopContinuousRotate",
      "three.startContinuousFloat",
      "three.stopContinuousFloat",
      "three.startContinuousScale",
      "three.stopContinuousScale",
      "three.animateCamera",
      "three.orbitEnable",
      "three.orbitDisable",
      "three.setMaterialColor",
      "three.setMaterialOpacity",
      "three.setEmissiveIntensity",
      "three.setLightIntensity",
      "three.setLightColor",
      "three.setPostProcessingParam",
      "three.togglePostEffect",
    ],
  },
  {
    key: "asset",
    label: "Asset / video",
    actions: [
      "assetPlay",
      "assetPause",
      "assetTogglePlay",
      "assetSeek",
      "assetMute",
      "videoFullscreen",
    ],
  },
  {
    key: "rive",
    label: "Rive",
    actions: ["rive.setInput", "rive.fireTrigger", "rive.play", "rive.pause", "rive.reset"],
  },
];
