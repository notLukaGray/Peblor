"use client";

import { useMemo, useEffect, useCallback, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useModelAnimation } from "./animation";
import { applyMaterialsToScene } from "./model3d-materials";
import type {
  Model3DAnimationCommand,
  Model3DTransformCommand,
  Model3DMaterialCommand,
} from "./model3d-controls";
import type {
  MaterialDef,
  PeblorAction,
  TextureDef,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { firePeblorAction } from "@/peblor/triggers";
import {
  Color,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type Texture,
  Vector3,
} from "three";

type EasingFn = (t: number) => number;

const easeOutBounce: EasingFn = (t) => {
  const n1 = 7.5625,
    d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    t -= 1.5 / d1;
    return n1 * t * t + 0.75;
  }
  if (t < 2.5 / d1) {
    t -= 2.25 / d1;
    return n1 * t * t + 0.9375;
  }
  t -= 2.625 / d1;
  return n1 * t * t + 0.984375;
};

const easeInOutCubic: EasingFn = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const EASING_FUNCTIONS: Record<string, EasingFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeInQuad: (t) => t * t,
  easeInCubic: (t) => t * t * t,
  easeInQuart: (t) => t * t * t * t,
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutBounce,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInOutCubic,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  easeInOutExpo: (t) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,
  spring: (t) => 1 - Math.cos(t * Math.PI * (0.5 + 2.5 * t)) * Math.pow(1 - t, 2.2),
  elastic: (t) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
  easeInBounce: (t) => 1 - easeOutBounce(1 - t),
  easeInOutBounce: (t) =>
    t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2,
};

/** CSS-compatible cubic bezier solver using Newton's method. */
function cubicBezierEasing(p1x: number, p1y: number, p2x: number, p2y: number): EasingFn {
  function sampleX(t: number) {
    return ((1 - 3 * p2x + 3 * p1x) * t + (3 * p2x - 6 * p1x)) * t * t + 3 * p1x * t;
  }
  function sampleY(t: number) {
    return ((1 - 3 * p2y + 3 * p1y) * t + (3 * p2y - 6 * p1y)) * t * t + 3 * p1y * t;
  }
  function sampleDerivX(t: number) {
    return (3 * (1 - 3 * p2x + 3 * p1x) * t + 2 * (3 * p2x - 6 * p1x)) * t + 3 * p1x;
  }
  function solveX(x: number): number {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const slope = sampleDerivX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= (sampleX(t) - x) / slope;
    }
    return t;
  }
  return (x: number) => sampleY(solveX(x));
}

/** Piecewise linear interpolation through [progress, value] control points. */
function keyframeEasing(points: [number, number][]): EasingFn {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  return (t: number) => {
    if (sorted.length === 0) return t;
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return t;
    if (t <= first[0]) return first[1];
    if (t >= last[0]) return last[1];
    for (let i = 1; i < sorted.length; i++) {
      const seg = sorted[i];
      const prev = sorted[i - 1];
      if (!seg || !prev) continue;
      if (t <= seg[0]) {
        const [t0, v0] = prev;
        const [t1, v1] = seg;
        return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
      }
    }
    return t;
  };
}

function resolveEasing(easing?: string | number[] | number[][]): EasingFn {
  if (!easing) return easeInOutCubic;
  if (typeof easing === "string") {
    return EASING_FUNCTIONS[easing] ?? easeInOutCubic;
  }
  // 4-element flat number array → cubic bezier control points [p1x, p1y, p2x, p2y]
  if (Array.isArray(easing) && easing.length === 4 && typeof easing[0] === "number") {
    return cubicBezierEasing(
      easing[0] as number,
      easing[1] as number,
      easing[2] as number,
      easing[3] as number
    );
  }
  // Array of [t, v] pairs → piecewise keyframe curve
  if (Array.isArray(easing) && easing.length > 0 && Array.isArray(easing[0])) {
    return keyframeEasing(easing as [number, number][]);
  }
  return easeInOutCubic;
}

export type LoadedModelProps = {
  geometryUrl: string;
  materialBindings: Record<string, string> | undefined;
  materials: Record<string, MaterialDef> | undefined;
  textures: Record<string, TextureDef> | undefined;
  textureMap: Map<string, Texture>;
  videoReady: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  meshName?: string;
  animationClip?: string;
  animationLoop?: boolean;
  animationPlayMode?: "loop" | "once" | "pingPong";
  animationCommand?: Model3DAnimationCommand | null;
  transformCommand?: Model3DTransformCommand | null;
  materialCommand?: Model3DMaterialCommand | null;
  pointerEnterAction?: PeblorAction;
  pointerLeaveAction?: PeblorAction;
  pointerDownAction?: PeblorAction;
  pointerUpAction?: PeblorAction;
  doubleClickAction?: PeblorAction;
  clickAction?: PeblorAction;
  onAnimationComplete?: PeblorAction;
  href?: string;
  onNavigate?: (href: string) => void;
  onReady?: () => void;
};

export function LoadedModel({
  geometryUrl,
  materialBindings,
  materials,
  textures,
  textureMap,
  videoReady,
  position,
  rotation,
  scale,
  meshName,
  animationClip,
  animationLoop,
  animationPlayMode,
  animationCommand,
  transformCommand,
  materialCommand,
  pointerEnterAction,
  pointerLeaveAction,
  pointerDownAction,
  pointerUpAction,
  doubleClickAction,
  clickAction,
  onAnimationComplete,
  href,
  onNavigate,
  onReady,
}: LoadedModelProps) {
  const { scene, animations } = useGLTF(geometryUrl);

  // Clone and optionally filter to a named mesh
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    if (meshName) {
      // Hide everything except the named mesh (and its parents stay visible for hierarchy)
      clone.traverse((obj) => {
        if (obj.name && obj.name !== meshName && obj !== clone) {
          (obj as Object3D).visible = false;
        }
      });
      const target = clone.getObjectByName(meshName);
      if (target) target.visible = true;
    }
    return clone;
  }, [scene, meshName]);

  useEffect(() => {
    applyMaterialsToScene(clonedScene, materialBindings, materials, textures, textureMap);
  }, [clonedScene, materialBindings, materials, textures, textureMap, videoReady]);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const {
    playAnimation,
    switchAnimation,
    pauseCurrentAnimation,
    resumeCurrentAnimation,
    toggleCurrentAnimation,
    crossFade,
    scrubTo,
  } = useModelAnimation(animations, clonedScene, {
    initialAnimation: animationClip ?? undefined,
    loop: animationLoop ?? true,
    playMode: animationPlayMode,
    onComplete: onAnimationComplete
      ? () => firePeblorAction(onAnimationComplete, "trigger")
      : undefined,
  });

  // --- Animation commands ---
  useEffect(() => {
    if (!animationCommand) return;
    switch (animationCommand.type) {
      case "play":
        if (animationCommand.clip)
          playAnimation(animationCommand.clip, { loop: animationCommand.loop });
        else resumeCurrentAnimation();
        return;
      case "pause":
        pauseCurrentAnimation();
        return;
      case "toggle":
        toggleCurrentAnimation();
        return;
      case "set":
        switchAnimation(animationCommand.clip, animationCommand.waitForCycle ?? false);
        return;
      case "crossFade":
        crossFade(
          animationCommand.clip,
          animationCommand.durationMs ?? 300,
          animationCommand.warp ?? true
        );
        return;
      case "scrub":
        scrubTo(animationCommand.progress, animationCommand.clip);
        return;
      default:
        return;
    }
  }, [
    animationCommand,
    crossFade,
    pauseCurrentAnimation,
    playAnimation,
    resumeCurrentAnimation,
    scrubTo,
    switchAnimation,
    toggleCurrentAnimation,
  ]);

  // --- Transform state ---
  const groupRef = useRef<Group>(null);

  // Schema-defined base transform (used by resetTransform)
  const basePosition = useMemo<[number, number, number]>(() => position ?? [0, 0, 0], [position]);
  const baseRotation = useMemo<[number, number, number]>(() => rotation ?? [0, 0, 0], [rotation]);
  const baseScale = useMemo<[number, number, number]>(() => {
    if (scale === undefined) return [1, 1, 1];
    if (typeof scale === "number") return [scale, scale, scale];
    return scale;
  }, [scale]);

  // Lerp targets — null means no active tween
  const tweenRef = useRef<{
    startPos: Vector3;
    startRot: Euler;
    startScale: Vector3;
    endPos?: Vector3;
    endRot?: Euler;
    endScale?: Vector3;
    startTime: number;
    durationMs: number;
    easingFn: EasingFn;
  } | null>(null);

  // Continuous behavior state
  const continuousRotateRef = useRef<{ axis: Vector3; speed: number } | null>(null);
  const continuousFloatRef = useRef<{
    amount: number;
    speed: number;
    originY: number | null;
  } | null>(null);
  const continuousScaleRef = useRef<{ min: number; max: number; speed: number } | null>(null);

  // --- Transform commands ---
  useEffect(() => {
    if (!transformCommand || !groupRef.current) return;
    const g = groupRef.current;

    switch (transformCommand.type) {
      case "setPosition": {
        const [x, y, z] = transformCommand.position;
        if (transformCommand.durationMs) {
          tweenRef.current = {
            startPos: g.position.clone(),
            startRot: g.rotation.clone(),
            startScale: g.scale.clone(),
            endPos: new Vector3(x, y, z),
            startTime: performance.now(),
            durationMs: transformCommand.durationMs,
            easingFn: resolveEasing(transformCommand.easing),
          };
        } else {
          g.position.set(x, y, z);
        }
        return;
      }
      case "translateBy": {
        const [dx, dy, dz] = transformCommand.delta;
        if (transformCommand.durationMs) {
          tweenRef.current = {
            startPos: g.position.clone(),
            startRot: g.rotation.clone(),
            startScale: g.scale.clone(),
            endPos: new Vector3(g.position.x + dx, g.position.y + dy, g.position.z + dz),
            startTime: performance.now(),
            durationMs: transformCommand.durationMs,
            easingFn: resolveEasing(transformCommand.easing),
          };
        } else {
          g.position.x += dx;
          g.position.y += dy;
          g.position.z += dz;
        }
        return;
      }
      case "setRotation": {
        const [x, y, z] = transformCommand.rotation;
        if (transformCommand.durationMs) {
          tweenRef.current = {
            startPos: g.position.clone(),
            startRot: g.rotation.clone(),
            startScale: g.scale.clone(),
            endRot: new Euler(x, y, z),
            startTime: performance.now(),
            durationMs: transformCommand.durationMs,
            easingFn: resolveEasing(transformCommand.easing),
          };
        } else {
          g.rotation.set(x, y, z);
        }
        return;
      }
      case "rotateBy": {
        const [dx, dy, dz] = transformCommand.delta;
        g.rotation.x += dx;
        g.rotation.y += dy;
        g.rotation.z += dz;
        return;
      }
      case "setScale": {
        const [x, y, z] = transformCommand.scale;
        if (transformCommand.durationMs) {
          tweenRef.current = {
            startPos: g.position.clone(),
            startRot: g.rotation.clone(),
            startScale: g.scale.clone(),
            endScale: new Vector3(x, y, z),
            startTime: performance.now(),
            durationMs: transformCommand.durationMs,
            easingFn: resolveEasing(transformCommand.easing),
          };
        } else {
          g.scale.set(x, y, z);
        }
        return;
      }
      case "scaleBy": {
        g.scale.multiplyScalar(transformCommand.factor);
        return;
      }
      case "resetTransform": {
        g.position.set(...basePosition);
        g.rotation.set(...baseRotation);
        g.scale.set(...baseScale);
        tweenRef.current = null;
        return;
      }
      case "animateTo": {
        tweenRef.current = {
          startPos: g.position.clone(),
          startRot: g.rotation.clone(),
          startScale: g.scale.clone(),
          ...(transformCommand.position
            ? { endPos: new Vector3(...transformCommand.position) }
            : {}),
          ...(transformCommand.rotation ? { endRot: new Euler(...transformCommand.rotation) } : {}),
          ...(transformCommand.scale ? { endScale: new Vector3(...transformCommand.scale) } : {}),
          startTime: performance.now(),
          durationMs: transformCommand.durationMs,
          easingFn: resolveEasing(transformCommand.easing),
        };
        return;
      }
      case "startContinuousRotate":
        continuousRotateRef.current = {
          axis: new Vector3(...transformCommand.axis).normalize(),
          speed: transformCommand.speed,
        };
        return;
      case "stopContinuousRotate":
        continuousRotateRef.current = null;
        return;
      case "startContinuousFloat":
        continuousFloatRef.current = {
          amount: transformCommand.amount,
          speed: transformCommand.speed,
          originY: groupRef.current ? groupRef.current.position.y : null,
        };
        return;
      case "stopContinuousFloat":
        continuousFloatRef.current = null;
        return;
      case "startContinuousScale":
        continuousScaleRef.current = {
          min: transformCommand.min,
          max: transformCommand.max,
          speed: transformCommand.speed,
        };
        return;
      case "stopContinuousScale":
        continuousScaleRef.current = null;
        return;
      default:
        return;
    }
  }, [transformCommand, basePosition, baseRotation, baseScale]);

  // --- Material commands ---
  useEffect(() => {
    if (!materialCommand || !groupRef.current) return;
    const g = groupRef.current;

    const applyToMeshes = (cb: (mat: MeshStandardMaterial) => void) => {
      g.traverse((obj) => {
        if (materialCommand.meshName && obj.name !== materialCommand.meshName) return;
        if (obj instanceof Mesh) {
          const mat = obj.material;
          if (Array.isArray(mat))
            mat.forEach((m) => {
              if (m instanceof MeshStandardMaterial) cb(m);
            });
          else if (mat instanceof MeshStandardMaterial) cb(mat);
        }
      });
    };

    switch (materialCommand.type) {
      case "setColor": {
        const color = new Color(materialCommand.color);
        applyToMeshes((m) => m.color.set(color));
        return;
      }
      case "setOpacity": {
        applyToMeshes((m) => {
          m.transparent = materialCommand.opacity < 1;
          m.opacity = materialCommand.opacity;
        });
        return;
      }
      case "setEmissiveIntensity": {
        applyToMeshes((m) => {
          m.emissiveIntensity = materialCommand.intensity;
        });
        return;
      }
      default:
        return;
    }
  }, [materialCommand]);

  // --- useFrame: continuous behaviors + tween ---
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // Lerp tween
    if (tweenRef.current) {
      const t = tweenRef.current;
      const elapsed = performance.now() - t.startTime;
      const progress = Math.min(1, elapsed / t.durationMs);
      const ease = t.easingFn(progress);

      if (t.endPos) g.position.lerpVectors(t.startPos, t.endPos, ease);
      if (t.endRot) {
        g.rotation.x = t.startRot.x + (t.endRot.x - t.startRot.x) * ease;
        g.rotation.y = t.startRot.y + (t.endRot.y - t.startRot.y) * ease;
        g.rotation.z = t.startRot.z + (t.endRot.z - t.startRot.z) * ease;
      }
      if (t.endScale) g.scale.lerpVectors(t.startScale, t.endScale, ease);
      if (progress >= 1) tweenRef.current = null;
    }

    // Continuous rotation
    if (continuousRotateRef.current) {
      const { axis, speed } = continuousRotateRef.current;
      g.rotateOnAxis(axis, speed * delta);
    }

    // Continuous float
    if (continuousFloatRef.current) {
      const f = continuousFloatRef.current;
      if (f.originY === null) f.originY = g.position.y;
      g.position.y =
        f.originY + Math.sin((performance.now() / 1000) * f.speed * Math.PI * 2) * f.amount;
    }

    // Continuous scale pulse
    if (continuousScaleRef.current) {
      const { min, max, speed } = continuousScaleRef.current;
      const s =
        min +
        (Math.sin((performance.now() / 1000) * speed * Math.PI * 2) * 0.5 + 0.5) * (max - min);
      g.scale.setScalar(s);
    }
  });

  // --- Pointer handlers ---
  const handlePointerEnter = useCallback(() => {
    if (pointerEnterAction) firePeblorAction(pointerEnterAction, "trigger");
  }, [pointerEnterAction]);

  const handlePointerLeave = useCallback(() => {
    if (pointerLeaveAction) firePeblorAction(pointerLeaveAction, "trigger");
  }, [pointerLeaveAction]);

  const handlePointerDown = useCallback(() => {
    if (pointerDownAction) firePeblorAction(pointerDownAction, "trigger");
  }, [pointerDownAction]);

  const handlePointerUp = useCallback(() => {
    if (pointerUpAction) firePeblorAction(pointerUpAction, "trigger");
  }, [pointerUpAction]);

  const handleDoubleClick = useCallback(() => {
    if (doubleClickAction) firePeblorAction(doubleClickAction, "trigger");
  }, [doubleClickAction]);

  const handleClick = useCallback(() => {
    if (href) {
      onNavigate?.(href);
      return;
    }
    if (clickAction) firePeblorAction(clickAction, "trigger");
  }, [href, clickAction, onNavigate]);

  const scaleVec = useMemo(() => {
    if (scale === undefined) return undefined;
    if (typeof scale === "number") return [scale, scale, scale] as [number, number, number];
    return scale;
  }, [scale]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scaleVec}
      onPointerEnter={pointerEnterAction ? handlePointerEnter : undefined}
      onPointerLeave={pointerLeaveAction ? handlePointerLeave : undefined}
      onPointerDown={pointerDownAction ? handlePointerDown : undefined}
      onPointerUp={pointerUpAction ? handlePointerUp : undefined}
      onDoubleClick={doubleClickAction ? handleDoubleClick : undefined}
      onClick={href || clickAction ? handleClick : undefined}
    >
      <primitive object={clonedScene} />
    </group>
  );
}
