"use client";

import type { Model3DAction } from "@pb/contracts/types";
import type {
  Model3DAnimationCommand,
  Model3DCameraCommand,
  Model3DCameraEffectsValue,
  Model3DCameraPreset,
  Model3DVideoTextureCommand,
  Model3DTransformCommand,
  Model3DMaterialCommand,
  Model3DSceneCommand,
  Model3DPostProcessingCommand,
} from "./model3d-controls";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import {
  matchesTargetId,
  parseBoolean,
  parseCameraPreset,
  parseCameraPresetList,
  parseNumber,
  readPayloadObject,
  readTargetId,
} from "./model3d-action-parsing";

export type Model3DTriggerDispatchContext = {
  id?: string;
  opacity: number;
  /** Progress value (0–1) from the trigger event detail — used by three.scrubAnimation when no explicit progress is in the payload. */
  progress?: number;
  setLoadedState: (
    next: boolean | ((prev: boolean) => boolean),
    options?: { transition?: boolean }
  ) => void;
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setOpacity: React.Dispatch<React.SetStateAction<number>>;
  setOpacityTransitionMs: React.Dispatch<React.SetStateAction<number>>;
  setCameraEffectsOverride: React.Dispatch<
    React.SetStateAction<Model3DCameraEffectsValue | null | undefined>
  >;
  setAnimationCommand: React.Dispatch<React.SetStateAction<Model3DAnimationCommand | null>>;
  setCameraCommand: React.Dispatch<React.SetStateAction<Model3DCameraCommand | null>>;
  setVideoTextureCommand: React.Dispatch<React.SetStateAction<Model3DVideoTextureCommand | null>>;
  setTransformCommand: React.Dispatch<React.SetStateAction<Model3DTransformCommand | null>>;
  setMaterialCommand: React.Dispatch<React.SetStateAction<Model3DMaterialCommand | null>>;
  setSceneCommand: React.Dispatch<React.SetStateAction<Model3DSceneCommand | null>>;
  setPostProcessingCommand: React.Dispatch<
    React.SetStateAction<Model3DPostProcessingCommand | null>
  >;
  nextNonce: () => number;
  clearFadeHideTimeout: () => void;
  scheduleHideAfterFade: (ms: number) => void;
  cameraPresetCycleRef: React.MutableRefObject<{
    presets: Model3DCameraPreset[];
    index: number;
  } | null>;
  onBeforeLoad?: (payload: unknown, payloadObj: Record<string, unknown> | null) => void;
};

function triggerFade(
  ctx: Model3DTriggerDispatchContext,
  toOpacity: number,
  durationMs: number,
  hide: boolean
) {
  ctx.clearFadeHideTimeout();
  ctx.setOpacityTransitionMs(durationMs);
  ctx.setIsVisible(true);
  if (toOpacity > 0 && ctx.opacity <= 0) ctx.setOpacity(0);
  window.requestAnimationFrame(() => ctx.setOpacity(Math.max(0, Math.min(1, toOpacity))));
  if (hide && toOpacity <= 0) ctx.scheduleHideAfterFade(durationMs);
}

function resolveAnimationClip(
  payload: unknown,
  payloadObj: Record<string, unknown> | null
): string | undefined {
  if (typeof payload === "string") return payload;
  if (typeof payloadObj?.clip === "string") return payloadObj.clip;
  if (typeof payloadObj?.name === "string") return payloadObj.name;
  return undefined;
}

function parseVec3(
  value: unknown,
  fallback: [number, number, number] = [0, 0, 0]
): [number, number, number] {
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0];
  }
  return fallback;
}

function handleCameraPreset(
  ctx: Model3DTriggerDispatchContext,
  payload: unknown,
  payloadObj: Record<string, unknown> | null
) {
  const presets = parseCameraPresetList(payloadObj?.presets);
  if (presets.length) {
    const requestedIndex = parseNumber(payloadObj?.index);
    const safeIndex =
      requestedIndex != null
        ? Math.max(0, Math.min(presets.length - 1, Math.trunc(requestedIndex)))
        : 0;
    ctx.cameraPresetCycleRef.current = { presets, index: safeIndex };
    const preset = presets[safeIndex];
    if (preset) ctx.setCameraCommand({ nonce: ctx.nextNonce(), type: "set", preset });
    return;
  }

  const preset = parseCameraPreset(payloadObj?.preset ?? payload);
  if (preset) ctx.setCameraCommand({ nonce: ctx.nextNonce(), type: "set", preset });
}

function handleNextCameraPreset(
  ctx: Model3DTriggerDispatchContext,
  payloadObj: Record<string, unknown> | null
) {
  const incomingPresets = parseCameraPresetList(payloadObj?.presets);
  if (incomingPresets.length) {
    ctx.cameraPresetCycleRef.current = { presets: incomingPresets, index: -1 };
  }

  const cycle = ctx.cameraPresetCycleRef.current;
  if (!cycle || cycle.presets.length === 0) return;

  const loop = parseBoolean(payloadObj?.loop) ?? true;
  const nextIndex = cycle.index + 1;
  if (!loop && nextIndex >= cycle.presets.length) return;

  cycle.index = nextIndex % cycle.presets.length;
  const preset = cycle.presets[cycle.index];
  if (preset) ctx.setCameraCommand({ nonce: ctx.nextNonce(), type: "set", preset });
}

function handleCameraEffectsPreset(
  ctx: Model3DTriggerDispatchContext,
  payload: unknown,
  payloadObj: Record<string, unknown> | null
) {
  if (payload == null || payload === "reset" || payload === "default") {
    ctx.setCameraEffectsOverride(undefined);
    return;
  }
  if (payload === false || payload === "off" || payload === "none") {
    ctx.setCameraEffectsOverride(null);
    return;
  }
  if (
    payloadObj &&
    "preset" in payloadObj &&
    payloadObj.preset &&
    typeof payloadObj.preset === "object"
  ) {
    ctx.setCameraEffectsOverride(payloadObj.preset as Model3DCameraEffectsValue);
    return;
  }
  if (payload && typeof payload === "object") {
    ctx.setCameraEffectsOverride(payload as Model3DCameraEffectsValue);
  }
}

export function dispatchModel3DTriggerAction(
  ctx: Model3DTriggerDispatchContext,
  action: Model3DAction
): void {
  const payload = action.payload;
  const targetId = readTargetId(payload as unknown);
  if (targetId) {
    if (!matchesTargetId(ctx.id, targetId)) return;
  } else if (!ctx.id) {
    return;
  }

  const payloadObj = readPayloadObject(payload as unknown);

  switch (action.type) {
    case "three.load":
      ctx.onBeforeLoad?.(payload, payloadObj);
      ctx.setLoadedState(true, { transition: true });
      return;
    case "three.unload":
      ctx.setLoadedState(false);
      return;
    case "three.toggleLoaded": {
      const explicit = parseBoolean(payloadObj?.loaded ?? payloadObj?.value ?? payload);
      if (explicit != null) ctx.setLoadedState(explicit, { transition: explicit });
      else ctx.setLoadedState((prev) => !prev);
      return;
    }
    case "three.setVisibility": {
      const visible = parseBoolean(payloadObj?.visible ?? payloadObj?.value ?? payload);
      if (visible == null) return;
      ctx.clearFadeHideTimeout();
      ctx.setIsVisible(visible);
      ctx.setOpacityTransitionMs(0);
      ctx.setOpacity(visible ? 1 : 0);
      return;
    }
    case "three.fadeIn": {
      const defaultDurationMs = MOTION_DEFAULTS.transition.duration * 1000;
      const durationMs =
        parseNumber(payloadObj?.durationMs ?? payloadObj?.duration ?? payloadObj?.ms) ??
        defaultDurationMs;
      triggerFade(ctx, parseNumber(payloadObj?.opacity) ?? 1, durationMs, false);
      return;
    }
    case "three.fadeOut": {
      const defaultDurationMs = MOTION_DEFAULTS.transition.duration * 1000;
      const durationMs =
        parseNumber(payloadObj?.durationMs ?? payloadObj?.duration ?? payloadObj?.ms) ??
        defaultDurationMs;
      const targetOpacity = parseNumber(payloadObj?.opacity) ?? 0;
      triggerFade(ctx, targetOpacity, durationMs, targetOpacity <= 0);
      return;
    }
    case "three.playAnimation": {
      const clip = resolveAnimationClip(payload, payloadObj);
      const loop = parseBoolean(payloadObj?.loop);
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setAnimationCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "play",
        ...(clip ? { clip } : {}),
        ...(loop != null ? { loop } : {}),
      });
      return;
    }
    case "three.pauseAnimation": {
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setAnimationCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "pause",
      });
      return;
    }
    case "three.toggleAnimation": {
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setAnimationCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "toggle",
      });
      return;
    }
    case "three.setAnimation": {
      const clip = resolveAnimationClip(payload, payloadObj);
      if (!clip) return;
      const waitForCycle = parseBoolean(payloadObj?.waitForCycle);
      const loop = parseBoolean(payloadObj?.loop);
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setAnimationCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "set",
        clip,
        ...(waitForCycle != null ? { waitForCycle } : {}),
        ...(loop != null ? { loop } : {}),
      });
      return;
    }
    case "three.setCameraPreset":
      handleCameraPreset(ctx, payload, payloadObj);
      return;
    case "three.nextCameraPreset":
      handleNextCameraPreset(ctx, payloadObj);
      return;
    case "three.resetCamera":
      ctx.setCameraCommand({ nonce: ctx.nextNonce(), type: "reset" });
      return;
    case "three.playVideoTexture":
      ctx.setVideoTextureCommand({ nonce: ctx.nextNonce(), type: "play" });
      return;
    case "three.pauseVideoTexture":
      ctx.setVideoTextureCommand({ nonce: ctx.nextNonce(), type: "pause" });
      return;
    case "three.toggleVideoTexture":
      ctx.setVideoTextureCommand({ nonce: ctx.nextNonce(), type: "toggle" });
      return;
    case "three.setCameraEffectsPreset":
      handleCameraEffectsPreset(ctx, payload, payloadObj);
      return;
    case "three.scrubAnimation": {
      const progressFromPayload = parseNumber(payloadObj?.progress);
      const progress = progressFromPayload ?? ctx.progress ?? 0;
      const clip = resolveAnimationClip(payload, payloadObj);
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setAnimationCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "scrub",
        progress: Math.max(0, Math.min(1, progress)),
        ...(clip ? { clip } : {}),
      });
      return;
    }
    case "three.crossFadeAnimation": {
      const clip = resolveAnimationClip(payload, payloadObj);
      if (!clip) return;
      const durationMs = parseNumber(
        payloadObj?.durationMs ?? payloadObj?.duration ?? payloadObj?.ms
      );
      const warp = parseBoolean(payloadObj?.warp);
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setAnimationCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "crossFade",
        clip,
        ...(durationMs != null ? { durationMs } : {}),
        ...(warp != null ? { warp } : {}),
      });
      return;
    }
    // --- Transform ---
    case "three.setPosition": {
      const pos = parseVec3(payloadObj?.position ?? [payloadObj?.x, payloadObj?.y, payloadObj?.z]);
      const durationMs = parseNumber(payloadObj?.durationMs ?? payloadObj?.duration);
      const easing =
        payloadObj?.easing != null
          ? (payloadObj.easing as string | number[] | number[][])
          : undefined;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "setPosition",
        position: pos,
        ...(durationMs != null ? { durationMs } : {}),
        ...(easing ? { easing } : {}),
      });
      return;
    }
    case "three.translateBy": {
      const delta = parseVec3([payloadObj?.x, payloadObj?.y, payloadObj?.z]);
      const durationMs = parseNumber(payloadObj?.durationMs ?? payloadObj?.duration);
      const easing =
        payloadObj?.easing != null
          ? (payloadObj.easing as string | number[] | number[][])
          : undefined;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "translateBy",
        delta,
        ...(durationMs != null ? { durationMs } : {}),
        ...(easing ? { easing } : {}),
      });
      return;
    }
    case "three.setRotation": {
      const rot = parseVec3(payloadObj?.rotation ?? [payloadObj?.x, payloadObj?.y, payloadObj?.z]);
      const durationMs = parseNumber(payloadObj?.durationMs ?? payloadObj?.duration);
      const easing =
        payloadObj?.easing != null
          ? (payloadObj.easing as string | number[] | number[][])
          : undefined;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "setRotation",
        rotation: rot,
        ...(durationMs != null ? { durationMs } : {}),
        ...(easing ? { easing } : {}),
      });
      return;
    }
    case "three.rotateBy": {
      const delta = parseVec3([payloadObj?.x, payloadObj?.y, payloadObj?.z]);
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "rotateBy",
        delta,
      });
      return;
    }
    case "three.setScale": {
      const raw = payloadObj?.scale;
      let scale: [number, number, number];
      if (typeof raw === "number") scale = [raw, raw, raw];
      else scale = parseVec3(raw, [1, 1, 1]);
      const durationMs = parseNumber(payloadObj?.durationMs ?? payloadObj?.duration);
      const easing =
        payloadObj?.easing != null
          ? (payloadObj.easing as string | number[] | number[][])
          : undefined;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "setScale",
        scale,
        ...(durationMs != null ? { durationMs } : {}),
        ...(easing ? { easing } : {}),
      });
      return;
    }
    case "three.scaleBy": {
      const factor = parseNumber(payloadObj?.factor ?? payload) ?? 1;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "scaleBy",
        factor,
      });
      return;
    }
    case "three.resetTransform": {
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "resetTransform",
      });
      return;
    }
    case "three.animateTo": {
      const durationMs = parseNumber(payloadObj?.durationMs ?? payloadObj?.duration) ?? 300;
      const position = payloadObj?.position ? parseVec3(payloadObj.position) : undefined;
      const rotation = payloadObj?.rotation ? parseVec3(payloadObj.rotation) : undefined;
      const rawScale = payloadObj?.scale;
      const scale: [number, number, number] | undefined =
        rawScale != null
          ? typeof rawScale === "number"
            ? [rawScale, rawScale, rawScale]
            : parseVec3(rawScale)
          : undefined;
      const easing =
        payloadObj?.easing != null
          ? (payloadObj.easing as string | number[] | number[][])
          : undefined;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "animateTo",
        durationMs,
        ...(position ? { position } : {}),
        ...(rotation ? { rotation } : {}),
        ...(scale ? { scale } : {}),
        ...(easing ? { easing } : {}),
      });
      return;
    }
    // --- Continuous ---
    case "three.startContinuousRotate": {
      const axis = parseVec3(payloadObj?.axis, [0, 1, 0]);
      const speed = parseNumber(payloadObj?.speed) ?? 1;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "startContinuousRotate",
        axis,
        speed,
      });
      return;
    }
    case "three.stopContinuousRotate": {
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "stopContinuousRotate",
      });
      return;
    }
    case "three.startContinuousFloat": {
      const amount = parseNumber(payloadObj?.amount) ?? 0.1;
      const speed = parseNumber(payloadObj?.speed) ?? 1;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "startContinuousFloat",
        amount,
        speed,
      });
      return;
    }
    case "three.stopContinuousFloat": {
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "stopContinuousFloat",
      });
      return;
    }
    case "three.startContinuousScale": {
      const min = parseNumber(payloadObj?.min) ?? 0.9;
      const max = parseNumber(payloadObj?.max) ?? 1.1;
      const speed = parseNumber(payloadObj?.speed) ?? 1;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "startContinuousScale",
        min,
        max,
        speed,
      });
      return;
    }
    case "three.stopContinuousScale": {
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setTransformCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "stopContinuousScale",
      });
      return;
    }
    // --- Camera extended ---
    case "three.animateCamera": {
      const durationMs = parseNumber(payloadObj?.durationMs ?? payloadObj?.duration) ?? 600;
      const preset = parseCameraPreset(payloadObj?.preset ?? payloadObj) ?? {};
      const easing =
        payloadObj?.easing != null
          ? (payloadObj.easing as string | number[] | number[][])
          : undefined;
      ctx.setCameraCommand({
        nonce: ctx.nextNonce(),
        type: "animateTo",
        preset,
        durationMs,
        ...(easing ? { easing } : {}),
      });
      return;
    }
    case "three.orbitEnable": {
      const autoRotate = parseBoolean(payloadObj?.autoRotate);
      const autoRotateSpeed = parseNumber(payloadObj?.autoRotateSpeed);
      ctx.setCameraCommand({
        nonce: ctx.nextNonce(),
        type: "orbitEnable",
        ...(autoRotate != null ? { autoRotate } : {}),
        ...(autoRotateSpeed != null ? { autoRotateSpeed } : {}),
      });
      return;
    }
    case "three.orbitDisable":
      ctx.setCameraCommand({ nonce: ctx.nextNonce(), type: "orbitDisable" });
      return;
    // --- Material ---
    case "three.setMaterialColor": {
      const color =
        typeof (payloadObj?.color ?? payload) === "string"
          ? String(payloadObj?.color ?? payload)
          : "#ffffff";
      const meshName = typeof payloadObj?.meshName === "string" ? payloadObj.meshName : undefined;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setMaterialCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "setColor",
        color,
        ...(meshName ? { meshName } : {}),
      });
      return;
    }
    case "three.setMaterialOpacity": {
      const opacity = parseNumber(payloadObj?.opacity ?? payload) ?? 1;
      const meshName = typeof payloadObj?.meshName === "string" ? payloadObj.meshName : undefined;
      const durationMs = parseNumber(payloadObj?.durationMs ?? payloadObj?.duration);
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setMaterialCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "setOpacity",
        opacity,
        ...(meshName ? { meshName } : {}),
        ...(durationMs != null ? { durationMs } : {}),
      });
      return;
    }
    case "three.setEmissiveIntensity": {
      const intensity = parseNumber(payloadObj?.intensity ?? payload) ?? 1;
      const meshName = typeof payloadObj?.meshName === "string" ? payloadObj.meshName : undefined;
      const instanceId =
        typeof payloadObj?.instanceId === "string" ? payloadObj.instanceId : undefined;
      ctx.setMaterialCommand({
        nonce: ctx.nextNonce(),
        ...(instanceId ? { instanceId } : {}),
        type: "setEmissiveIntensity",
        intensity,
        ...(meshName ? { meshName } : {}),
      });
      return;
    }
    // --- Scene ---
    case "three.setLightIntensity": {
      const intensity = parseNumber(payloadObj?.intensity ?? payload) ?? 1;
      const index = parseNumber(payloadObj?.index);
      const name = typeof payloadObj?.name === "string" ? payloadObj.name : undefined;
      ctx.setSceneCommand({
        nonce: ctx.nextNonce(),
        type: "setLightIntensity",
        intensity,
        ...(index != null ? { index } : {}),
        ...(name ? { name } : {}),
      });
      return;
    }
    case "three.setLightColor": {
      const color =
        typeof (payloadObj?.color ?? payload) === "string"
          ? String(payloadObj?.color ?? payload)
          : "#ffffff";
      const index = parseNumber(payloadObj?.index);
      const name = typeof payloadObj?.name === "string" ? payloadObj.name : undefined;
      ctx.setSceneCommand({
        nonce: ctx.nextNonce(),
        type: "setLightColor",
        color,
        ...(index != null ? { index } : {}),
        ...(name ? { name } : {}),
      });
      return;
    }
    // --- Post-processing ---
    case "three.setPostProcessingParam": {
      const effect = typeof payloadObj?.effect === "string" ? payloadObj.effect : "";
      const param = typeof payloadObj?.param === "string" ? payloadObj.param : "";
      const value = parseNumber(payloadObj?.value) ?? 0;
      ctx.setPostProcessingCommand({
        nonce: ctx.nextNonce(),
        type: "setParam",
        effect,
        param,
        value,
      });
      return;
    }
    case "three.togglePostEffect": {
      const effect = typeof payloadObj?.effect === "string" ? payloadObj.effect : "";
      const enabled = parseBoolean(payloadObj?.enabled);
      ctx.setPostProcessingCommand({
        nonce: ctx.nextNonce(),
        type: "toggleEffect",
        effect,
        ...(enabled != null ? { enabled } : {}),
      });
      return;
    }
    default:
      return;
  }
}
