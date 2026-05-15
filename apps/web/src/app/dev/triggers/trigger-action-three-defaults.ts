import type { WorkbenchAction } from "./trigger-action-groups";

export const THREE_DEFAULTS: Record<string, WorkbenchAction> = {
  "three.setVisibility": {
    type: "three.setVisibility",
    payload: { id: "model3d-demo", visible: true },
  },
  "three.fadeIn": { type: "three.fadeIn", payload: { id: "model3d-demo", durationMs: 240 } },
  "three.fadeOut": { type: "three.fadeOut", payload: { id: "model3d-demo", durationMs: 240 } },
  "three.crossFadeAnimation": {
    type: "three.crossFadeAnimation",
    payload: { id: "model3d-demo", name: "run", durationMs: 300 },
  },
  "three.scrubAnimation": {
    type: "three.scrubAnimation",
    payload: { id: "model3d-demo", clip: "idle", progress: 0.5 },
  },
  "three.setPosition": {
    type: "three.setPosition",
    payload: { id: "model3d-demo", position: [0, 1, 0], durationMs: 250 },
  },
  "three.translateBy": {
    type: "three.translateBy",
    payload: { id: "model3d-demo", x: 0.5, durationMs: 250 },
  },
  "three.setRotation": {
    type: "three.setRotation",
    payload: { id: "model3d-demo", rotation: [0, 1.57, 0] },
  },
  "three.rotateBy": { type: "three.rotateBy", payload: { id: "model3d-demo", y: 0.5 } },
  "three.setScale": { type: "three.setScale", payload: { id: "model3d-demo", scale: 1.2 } },
  "three.scaleBy": { type: "three.scaleBy", payload: { id: "model3d-demo", factor: 1.1 } },
  "three.animateTo": {
    type: "three.animateTo",
    payload: { id: "model3d-demo", position: [0, 0.5, 0], scale: 1.1, durationMs: 400 },
  },
  "three.startContinuousRotate": {
    type: "three.startContinuousRotate",
    payload: { id: "model3d-demo", axis: "y", speed: 0.8 },
  },
  "three.startContinuousFloat": {
    type: "three.startContinuousFloat",
    payload: { id: "model3d-demo", amount: 0.2, speed: 0.8 },
  },
  "three.startContinuousScale": {
    type: "three.startContinuousScale",
    payload: { id: "model3d-demo", min: 0.95, max: 1.1, speed: 1 },
  },
  "three.animateCamera": {
    type: "three.animateCamera",
    payload: { id: "model3d-demo", position: [0, 1, 4], lookAt: [0, 0, 0], durationMs: 500 },
  },
  "three.orbitEnable": {
    type: "three.orbitEnable",
    payload: { id: "model3d-demo", autoRotate: true, autoRotateSpeed: 1 },
  },
  "three.setMaterialColor": {
    type: "three.setMaterialColor",
    payload: { id: "model3d-demo", color: "#84cc16", meshName: "Body" },
  },
  "three.setMaterialOpacity": {
    type: "three.setMaterialOpacity",
    payload: { id: "model3d-demo", opacity: 0.65, durationMs: 250 },
  },
  "three.setEmissiveIntensity": {
    type: "three.setEmissiveIntensity",
    payload: { id: "model3d-demo", intensity: 0.6 },
  },
  "three.setLightIntensity": {
    type: "three.setLightIntensity",
    payload: { id: "model3d-demo", intensity: 1.4, name: "Key" },
  },
  "three.setLightColor": {
    type: "three.setLightColor",
    payload: { id: "model3d-demo", color: "#38bdf8", name: "Key" },
  },
  "three.setPostProcessingParam": {
    type: "three.setPostProcessingParam",
    payload: { id: "model3d-demo", effect: "bloom", param: "intensity", value: 0.8 },
  },
  "three.togglePostEffect": {
    type: "three.togglePostEffect",
    payload: { id: "model3d-demo", effect: "bloom", enabled: true },
  },
};
