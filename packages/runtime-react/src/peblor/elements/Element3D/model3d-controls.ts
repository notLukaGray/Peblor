"use client";

import type { SceneDef } from "@pb/contracts/types";

export type Vec3Tuple = [number, number, number];

export type Model3DAnimationCommand =
  | {
      nonce: number;
      instanceId?: string;
      type: "play";
      clip?: string;
      loop?: boolean;
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "pause";
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "toggle";
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "set";
      clip: string;
      waitForCycle?: boolean;
      loop?: boolean;
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "crossFade";
      clip: string;
      durationMs?: number;
      warp?: boolean;
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "scrub";
      clip?: string;
      progress: number;
    };

export type Model3DVideoTextureCommand =
  | { nonce: number; type: "play" }
  | { nonce: number; type: "pause" }
  | { nonce: number; type: "toggle" };

export type Model3DCameraPreset = {
  position?: Vec3Tuple;
  lookAt?: Vec3Tuple;
  fov?: number;
  near?: number;
  far?: number;
};

export type Model3DCameraCommand =
  | { nonce: number; type: "reset" }
  | { nonce: number; type: "set"; preset: Model3DCameraPreset }
  | {
      nonce: number;
      type: "animateTo";
      preset: Model3DCameraPreset;
      durationMs: number;
      easing?: string | number[] | number[][];
    }
  | { nonce: number; type: "orbitEnable"; autoRotate?: boolean; autoRotateSpeed?: number }
  | { nonce: number; type: "orbitDisable" };

export type Model3DCameraEffectsValue = NonNullable<SceneDef["cameraEffects"]>;

export type Model3DTransformCommand =
  | {
      nonce: number;
      instanceId?: string;
      type: "setPosition";
      position: [number, number, number];
      durationMs?: number;
      easing?: string | number[] | number[][];
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "translateBy";
      delta: [number, number, number];
      durationMs?: number;
      easing?: string | number[] | number[][];
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "setRotation";
      rotation: [number, number, number];
      durationMs?: number;
      easing?: string | number[] | number[][];
    }
  | { nonce: number; instanceId?: string; type: "rotateBy"; delta: [number, number, number] }
  | {
      nonce: number;
      instanceId?: string;
      type: "setScale";
      scale: [number, number, number];
      durationMs?: number;
      easing?: string | number[] | number[][];
    }
  | { nonce: number; instanceId?: string; type: "scaleBy"; factor: number }
  | { nonce: number; instanceId?: string; type: "resetTransform" }
  | {
      nonce: number;
      instanceId?: string;
      type: "animateTo";
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: [number, number, number];
      durationMs: number;
      easing?: string | number[] | number[][];
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "startContinuousRotate";
      axis: [number, number, number];
      speed: number;
    }
  | { nonce: number; instanceId?: string; type: "stopContinuousRotate" }
  | {
      nonce: number;
      instanceId?: string;
      type: "startContinuousFloat";
      amount: number;
      speed: number;
    }
  | { nonce: number; instanceId?: string; type: "stopContinuousFloat" }
  | {
      nonce: number;
      instanceId?: string;
      type: "startContinuousScale";
      min: number;
      max: number;
      speed: number;
    }
  | { nonce: number; instanceId?: string; type: "stopContinuousScale" };

export type Model3DMaterialCommand =
  | { nonce: number; instanceId?: string; type: "setColor"; color: string; meshName?: string }
  | {
      nonce: number;
      instanceId?: string;
      type: "setOpacity";
      opacity: number;
      meshName?: string;
      durationMs?: number;
    }
  | {
      nonce: number;
      instanceId?: string;
      type: "setEmissiveIntensity";
      intensity: number;
      meshName?: string;
    };

export type Model3DSceneCommand =
  | { nonce: number; type: "setLightIntensity"; intensity: number; index?: number; name?: string }
  | { nonce: number; type: "setLightColor"; color: string; index?: number; name?: string };

export type Model3DPostProcessingCommand =
  | { nonce: number; type: "setParam"; effect: string; param: string; value: number }
  | { nonce: number; type: "toggleEffect"; effect: string; enabled?: boolean };
