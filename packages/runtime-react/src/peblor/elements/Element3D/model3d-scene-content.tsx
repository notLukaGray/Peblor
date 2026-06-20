"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Light,
  OrthographicCamera,
  PerspectiveCamera as ThreePerspectiveCamera,
  Vector3,
} from "three";
import { resolveModel3DAssetPath, useTextureMap } from "./model3d-texture-map";
import { LoadedModel } from "./model3d-loaded-model";
import { Model3DErrorBoundary } from "./Model3DErrorBoundary";
import { CameraEffects } from "./model3d-camera-effects";
import { OrthoCameraFromBlock } from "./model3d-ortho-camera";
import { SceneLights } from "./model3d-lights";
import type {
  Model3DAnimationCommand,
  Model3DCameraCommand,
  Model3DCameraPreset,
  Model3DVideoTextureCommand,
  Model3DTransformCommand,
  Model3DMaterialCommand,
  Model3DSceneCommand,
  Model3DPostProcessingCommand,
} from "./model3d-controls";
import type { Block } from "./model3d-types";
import type { PeblorAction } from "@pb/contracts/types";
import { globals } from "@pb/runtime-react/core/lib/globals";

const SceneEnvironment = dynamic(
  () => import("./optional-environment").then((mod) => mod.SceneEnvironment),
  { loading: () => null, ssr: false }
);

const SceneOrbitControls = dynamic(
  () => import("./optional-orbit-controls").then((mod) => mod.SceneOrbitControls),
  { loading: () => null, ssr: false }
);

const SceneFlyControls = dynamic(
  () => import("./model3d-fly-controls").then((mod) => mod.SceneFlyControls),
  { loading: () => null, ssr: false }
);

const SceneBackgroundSetup = dynamic(
  () => import("./model3d-scene-background").then((mod) => mod.SceneBackgroundSetup),
  { loading: () => null, ssr: false }
);

const SceneScrollCamera = dynamic(
  () => import("./model3d-scroll-camera").then((mod) => mod.SceneScrollCamera),
  { loading: () => null, ssr: false }
);

const ScenePostProcessing = dynamic(
  () => import("./model3d-post-processing").then((mod) => mod.ScenePostProcessing),
  { loading: () => null, ssr: false }
);

const CAMERA_EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
function resolveCameraEasing(name?: string): (t: number) => number {
  return (CAMERA_EASINGS[name ?? ""] ?? CAMERA_EASINGS["easeInOut"]) as (t: number) => number;
}

function CameraCommandController({
  command,
  sceneCamera,
  onOrbitCommand,
}: {
  command: Model3DCameraCommand | null;
  sceneCamera: Block["scene"]["camera"];
  onOrbitCommand?: (
    enabled: boolean,
    options?: { autoRotate?: boolean; autoRotateSpeed?: number }
  ) => void;
}) {
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const initialPresetRef = useRef<Model3DCameraPreset | null>(null);
  const lastCommandNonceRef = useRef(-1);
  const onOrbitCommandRef = useRef(onOrbitCommand);
  useEffect(() => {
    onOrbitCommandRef.current = onOrbitCommand;
  }, [onOrbitCommand]);
  const tweenRef = useRef<{
    startPos: Vector3;
    startLookAt: Vector3;
    startFov: number;
    endPos?: Vector3;
    endLookAt?: Vector3;
    endFov?: number;
    startTime: number;
    durationMs: number;
    easingFn: (t: number) => number;
  } | null>(null);

  useEffect(() => {
    const camera = get().camera;
    if (!camera) return;
    if (initialPresetRef.current) return;
    const base: Model3DCameraPreset = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      lookAt: [0, 0, 0],
    };
    if (camera instanceof ThreePerspectiveCamera) {
      base.fov = camera.fov;
      base.near = camera.near;
      base.far = camera.far;
    } else if (sceneCamera.type === "perspective") {
      base.fov = sceneCamera.fov ?? 50;
      base.near = sceneCamera.near ?? 0.1;
      base.far = sceneCamera.far ?? 1000;
    }
    initialPresetRef.current = base;
  }, [get, sceneCamera]);

  useEffect(() => {
    const camera = get().camera;
    if (!camera || !command) return;
    if (command.nonce === lastCommandNonceRef.current) return;
    lastCommandNonceRef.current = command.nonce;

    const applyPreset = (preset: Model3DCameraPreset) => {
      if (preset.position) {
        camera.position.set(preset.position[0], preset.position[1], preset.position[2]);
      }
      if (camera instanceof ThreePerspectiveCamera) {
        if (preset.fov != null) camera.fov = preset.fov;
        if (preset.near != null) camera.near = preset.near;
        if (preset.far != null) camera.far = preset.far;
        camera.updateProjectionMatrix();
      } else if (camera instanceof OrthographicCamera) {
        if (preset.near != null) camera.near = preset.near;
        if (preset.far != null) camera.far = preset.far;
        camera.updateProjectionMatrix();
      }
      const lookAt = preset.lookAt ?? [0, 0, 0];
      camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
      camera.updateMatrixWorld();
    };

    if (command.type === "reset") {
      applyPreset(initialPresetRef.current ?? {});
      return;
    }
    if (command.type === "set") {
      applyPreset(command.preset);
      return;
    }
    if (command.type === "animateTo") {
      const lookAt = command.preset.lookAt ?? [0, 0, 0];
      tweenRef.current = {
        startPos: camera.position.clone(),
        startLookAt: new Vector3(0, 0, 0),
        startFov: camera instanceof ThreePerspectiveCamera ? camera.fov : 50,
        endPos: command.preset.position ? new Vector3(...command.preset.position) : undefined,
        endLookAt: new Vector3(lookAt[0], lookAt[1], lookAt[2]),
        endFov: command.preset.fov,
        startTime: performance.now(),
        durationMs: command.durationMs,
        easingFn: resolveCameraEasing(
          typeof (command as { easing?: string | number[] | number[][] }).easing === "string"
            ? (command as { easing?: string }).easing
            : undefined
        ),
      };
      return;
    }
    if (command.type === "orbitEnable") {
      onOrbitCommandRef.current?.(true, {
        autoRotate: command.autoRotate,
        autoRotateSpeed: command.autoRotateSpeed,
      });
      return;
    }
    if (command.type === "orbitDisable") {
      onOrbitCommandRef.current?.(false);
      return;
    }
  }, [command, get]);

  useFrame(() => {
    if (!tweenRef.current) return;
    const camera = get().camera;
    if (!camera) return;
    const t = tweenRef.current;
    const elapsed = performance.now() - t.startTime;
    const progress = Math.min(1, elapsed / t.durationMs);
    const ease = t.easingFn(progress);

    if (t.endPos) camera.position.lerpVectors(t.startPos, t.endPos, ease);
    if (t.endFov && camera instanceof ThreePerspectiveCamera) {
      camera.fov = t.startFov + (t.endFov - t.startFov) * ease;
      camera.updateProjectionMatrix();
    }
    if (t.endLookAt) {
      const lookAt = t.startLookAt.clone().lerp(t.endLookAt, ease);
      camera.lookAt(lookAt);
    }
    camera.updateMatrixWorld();
    if (progress >= 1) {
      tweenRef.current = null;
      return;
    }
    invalidate();
  });

  return null;
}

export function SceneContent({
  block,
  animationCommand,
  cameraCommand,
  videoTextureCommand,
  transformCommand,
  materialCommand,
  sceneCommand,
  postProcessingCommand,
  onNavigate,
  onReady,
  onModelError,
  isHomepagePriority: _isHomepagePriority = false,
}: {
  block: Block;
  animationCommand: Model3DAnimationCommand | null;
  cameraCommand: Model3DCameraCommand | null;
  videoTextureCommand: Model3DVideoTextureCommand | null;
  transformCommand: Model3DTransformCommand | null;
  materialCommand: Model3DMaterialCommand | null;
  sceneCommand: Model3DSceneCommand | null;
  postProcessingCommand: Model3DPostProcessingCommand | null;
  onNavigate?: (href: string) => void;
  onReady?: () => void;
  onModelError?: (url: string, error: unknown) => void;
  isHomepagePriority?: boolean;
}) {
  const { scene: sceneDef, textures, materials, models } = block;
  const { textureMap, videoReady, videoElement } = useTextureMap(textures);
  const controlMode = sceneDef.controls?.mode ?? "none";
  const scrollDriven = sceneDef.scrollCamera != null;
  const [orbitState, setOrbitState] = useState<{
    enabled: boolean;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
  } | null>(() => {
    if (controlMode !== "orbit" || scrollDriven) return null;
    const orbit = sceneDef.controls?.orbit;
    return {
      enabled: true,
      autoRotate: orbit?.autoRotate,
      autoRotateSpeed: orbit?.autoRotateSpeed,
    };
  });

  const handleOrbitCommand = useCallback(
    (enabled: boolean, opts?: { autoRotate?: boolean; autoRotateSpeed?: number }) => {
      setOrbitState((prev) => {
        const next = enabled
          ? {
              enabled: true as const,
              autoRotate: opts?.autoRotate,
              autoRotateSpeed: opts?.autoRotateSpeed,
            }
          : { enabled: false as const };
        if (
          prev?.enabled === next.enabled &&
          prev?.autoRotate === next.autoRotate &&
          prev?.autoRotateSpeed === next.autoRotateSpeed
        ) {
          return prev;
        }
        return next;
      });
    },
    []
  );

  const threeScene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!sceneCommand) return;
    const lights: Light[] = [];
    threeScene.traverse((obj) => {
      if (obj instanceof Light) lights.push(obj);
    });
    if (lights.length === 0) return;

    switch (sceneCommand.type) {
      case "setLightIntensity": {
        const targets = sceneCommand.name
          ? lights.filter((l) => l.name === sceneCommand.name)
          : sceneCommand.index != null
            ? [lights[sceneCommand.index]].filter(Boolean)
            : lights;
        targets.forEach((l) => {
          if (l) l.intensity = sceneCommand.intensity;
        });
        invalidate();
        return;
      }
      case "setLightColor": {
        const targets = sceneCommand.name
          ? lights.filter((l) => l.name === sceneCommand.name)
          : sceneCommand.index != null
            ? [lights[sceneCommand.index]].filter(Boolean)
            : lights;
        const color = new Color(sceneCommand.color);
        targets.forEach((l) => {
          if (l) l.color.set(color);
        });
        invalidate();
        return;
      }
      default:
        return;
    }
  }, [sceneCommand, threeScene, invalidate]);

  useEffect(() => {
    if (!videoTextureCommand || !videoElement) return;
    switch (videoTextureCommand.type) {
      case "play":
        videoElement.play().catch((err) => {
          console.warn("[pb-runtime-react] 3D scene video play failed", err);
        });
        return;
      case "pause":
        videoElement.pause();
        return;
      case "toggle":
        if (videoElement.paused)
          videoElement.play().catch((err) => {
            console.warn("[pb-runtime-react] 3D scene video toggle play failed", err);
          });
        else videoElement.pause();
        return;
      default:
        return;
    }
  }, [videoElement, videoTextureCommand]);

  const instances = useMemo(() => sceneDef.contents?.models ?? [], [sceneDef.contents?.models]);
  const firstModelKey = useMemo(() => (models ? Object.keys(models)[0] : undefined), [models]);

  const env = sceneDef.environment;
  const isHdri = env?.type === "hdri";
  const rawEnvPath = isHdri ? (env as { path: string }).path : null;
  const envPath = rawEnvPath ? resolveModel3DAssetPath(rawEnvPath, { raw: true }) : null;
  const envIntensity = isHdri ? ((env as { intensity?: number }).intensity ?? 1) : 1;

  const cam = sceneDef.camera;
  const isOrtho = cam.type === "orthographic";
  const orthoSize = isOrtho
    ? ((cam as { size?: number }).size ?? globals.threeSceneOrthoSize)
    : globals.threeSceneOrthoSize;
  const orthoNear = isOrtho ? (cam as { near?: number }).near : undefined;
  const orthoFar = isOrtho ? (cam as { far?: number }).far : undefined;

  const isPerspective = cam.type === "perspective";
  const persFov = isPerspective ? ((cam as { fov?: number }).fov ?? 50) : 50;
  const persNear = isPerspective
    ? ((cam as { near?: number }).near ?? globals.threeScenePerspNear)
    : globals.threeScenePerspNear;
  const persFar = isPerspective ? ((cam as { far?: number }).far ?? 1000) : 1000;
  const persPosition: [number, number, number] = isPerspective
    ? ((cam as { position?: [number, number, number] }).position ?? [0, 0, 5])
    : [0, 0, 5];

  const scrollStartPosition: [number, number, number] | undefined =
    scrollDriven && sceneDef.scrollCamera?.keyframes[0]?.position
      ? (sceneDef.scrollCamera.keyframes[0].position as [number, number, number])
      : undefined;

  const hasCameraEffectsConfig = !!(
    sceneDef.cameraEffects?.bobbing || sceneDef.cameraEffects?.mouseFollow
  );
  // Procedural camera effects overwrite position every frame and break orbit, presets, and reset.
  const suppressCameraEffects =
    scrollDriven || controlMode === "fly" || orbitState?.enabled === true;
  const showCameraEffects = hasCameraEffectsConfig && !suppressCameraEffects;

  if (instances.length === 0 || !models || !firstModelKey) return null;

  return (
    <>
      <SceneBackgroundSetup background={sceneDef.background} />

      {envPath && (
        <SceneEnvironment files={envPath} background={false} environmentIntensity={envIntensity} />
      )}

      <SceneLights lights={sceneDef.lights} />

      {isOrtho && <OrthoCameraFromBlock size={orthoSize} near={orthoNear} far={orthoFar} />}
      {isPerspective && (
        <PerspectiveCamera
          makeDefault
          manual={scrollDriven}
          fov={persFov}
          near={persNear}
          far={persFar}
          position={scrollStartPosition ?? persPosition}
        />
      )}

      {!scrollDriven && (
        <CameraCommandController
          command={cameraCommand}
          sceneCamera={sceneDef.camera}
          onOrbitCommand={handleOrbitCommand}
        />
      )}
      {controlMode === "fly" && !scrollDriven && sceneDef.controls?.fly && (
        <SceneFlyControls config={sceneDef.controls.fly} />
      )}

      {orbitState?.enabled && controlMode !== "fly" && !scrollDriven && (
        <SceneOrbitControls
          autoRotate={orbitState.autoRotate}
          autoRotateSpeed={orbitState.autoRotateSpeed}
        />
      )}

      {scrollDriven && sceneDef.scrollCamera && (
        <SceneScrollCamera scrollCamera={sceneDef.scrollCamera} />
      )}

      {showCameraEffects && (
        <CameraEffects
          bobbing={sceneDef.cameraEffects?.bobbing}
          mouseFollow={sceneDef.cameraEffects?.mouseFollow}
        />
      )}

      {instances.map((instance, i) => {
        const modelKey = instance.model ?? firstModelKey;
        const modelDef = models[modelKey] ?? models[firstModelKey];
        if (!modelDef?.geometry) return null;
        const anim = instance.animation;
        const instanceId = instance.id ?? String(i);
        const resolvedAnimationCommand =
          animationCommand == null ||
          animationCommand.instanceId == null ||
          animationCommand.instanceId === instanceId
            ? animationCommand
            : null;
        const resolvedTransformCommand =
          transformCommand == null ||
          transformCommand.instanceId == null ||
          transformCommand.instanceId === instanceId
            ? transformCommand
            : null;
        const resolvedMaterialCommand =
          materialCommand == null ||
          materialCommand.instanceId == null ||
          materialCommand.instanceId === instanceId
            ? materialCommand
            : null;
        const geometryUrl = resolveModel3DAssetPath(modelDef.geometry, { raw: true });
        return (
          <Model3DErrorBoundary key={i} url={geometryUrl} onError={onModelError ?? (() => {})}>
            <LoadedModel
              geometryUrl={geometryUrl}
              materialBindings={modelDef.materialBindings}
              materials={materials}
              textures={textures}
              textureMap={textureMap}
              videoReady={videoReady}
              position={instance.position}
              rotation={instance.rotation}
              scale={instance.scale}
              animationClip={anim?.clip}
              animationLoop={anim?.loop}
              animationPlayMode={anim?.playMode}
              animationCommand={resolvedAnimationCommand}
              transformCommand={resolvedTransformCommand}
              materialCommand={resolvedMaterialCommand}
              meshName={instance.meshName}
              pointerDownAction={instance.onPointerDown as PeblorAction | undefined}
              pointerUpAction={instance.onPointerUp as PeblorAction | undefined}
              doubleClickAction={instance.onDoubleClick as PeblorAction | undefined}
              pointerEnterAction={instance.onPointerEnter as PeblorAction | undefined}
              pointerLeaveAction={instance.onPointerLeave as PeblorAction | undefined}
              clickAction={instance.onClick as PeblorAction | undefined}
              onAnimationComplete={instance.onAnimationComplete as PeblorAction | undefined}
              href={instance.href}
              onNavigate={onNavigate}
              onReady={i === 0 ? onReady : undefined}
            />
          </Model3DErrorBoundary>
        );
      })}

      {block.postProcessing && block.postProcessing.length > 0 && (
        <ScenePostProcessing effects={block.postProcessing} command={postProcessingCommand} />
      )}
    </>
  );
}
