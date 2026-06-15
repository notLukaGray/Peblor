"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, Vector3 } from "three";
import type { SceneDef } from "@pb/contracts/peblor/core/peblor-schemas";

type FlyConfig = NonNullable<NonNullable<SceneDef["controls"]>["fly"]>;

/** Default bindings when JSON omits `controls.fly.keys`. */
const DEFAULT_FLY_KEYS: NonNullable<FlyConfig["keys"]> = {
  forward: ["w", "arrowup"],
  back: ["s", "arrowdown"],
  left: ["a", "arrowleft"],
  right: ["d", "arrowright"],
  up: ["e"],
  down: ["q"],
};

function buildKeyAxisMap(keys: FlyConfig["keys"]): Map<string, Vector3> {
  const map = new Map<string, Vector3>();
  const resolved = { ...DEFAULT_FLY_KEYS, ...keys };
  const bind = (names: string[] | undefined, axis: Vector3) => {
    if (!names) return;
    for (const name of names) {
      const key = name.trim().toLowerCase();
      if (key) map.set(key, axis);
    }
  };
  bind(resolved.forward, new Vector3(0, 0, -1));
  bind(resolved.back, new Vector3(0, 0, 1));
  bind(resolved.left, new Vector3(-1, 0, 0));
  bind(resolved.right, new Vector3(1, 0, 0));
  bind(resolved.up, new Vector3(0, 1, 0));
  bind(resolved.down, new Vector3(0, -1, 0));
  return map;
}

export function SceneFlyControls({ config }: { config: FlyConfig }) {
  const { camera, gl } = useThree();
  const keyAxisMap = useMemo(() => buildKeyAxisMap(config.keys), [config.keys]);
  const pressedRef = useRef(new Set<string>());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const lookActiveRef = useRef(false);
  const moveSpeed = config.moveSpeed ?? 0;
  const lookSensitivity = config.lookSensitivity ?? 0;
  const pitchLimit = config.pitchLimit ?? Math.PI / 2;
  const pointerLock = config.pointerLock ?? false;
  const euler = useRef(new Euler(0, 0, 0, "YXZ"));
  const velocity = useRef(new Vector3());

  useEffect(() => {
    if (!pointerLock && !moveSpeed && !lookSensitivity) return;
    const dom = gl.domElement;
    const onKeyDown = (event: KeyboardEvent) => {
      const axis = keyAxisMap.get(event.key.toLowerCase());
      if (!axis) return;
      pressedRef.current.add(event.key.toLowerCase());
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      pressedRef.current.delete(event.key.toLowerCase());
    };
    const onPointerDown = () => {
      if (!pointerLock) return;
      lookActiveRef.current = true;
      dom.requestPointerLock?.();
    };
    const onPointerUp = () => {
      if (!pointerLock) return;
      lookActiveRef.current = false;
      if (document.pointerLockElement === dom) document.exitPointerLock?.();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!lookSensitivity) return;
      if (pointerLock && !lookActiveRef.current && document.pointerLockElement !== dom) return;
      yawRef.current -= event.movementX * lookSensitivity;
      pitchRef.current -= event.movementY * lookSensitivity;
      const limit = pitchLimit - 0.05;
      pitchRef.current = Math.max(-limit, Math.min(limit, pitchRef.current));
    };
    const onPointerLockChange = () => {
      if (document.pointerLockElement !== dom) lookActiveRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    if (pointerLock) {
      dom.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointerlockchange", onPointerLockChange);
    }
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      if (document.pointerLockElement === dom) document.exitPointerLock?.();
    };
  }, [gl.domElement, keyAxisMap, lookSensitivity, moveSpeed, pitchLimit, pointerLock]);

  useEffect(() => {
    const e = new Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yawRef.current = e.y;
    pitchRef.current = e.x;
  }, [camera]);

  useFrame((_, delta) => {
    if (lookSensitivity) {
      euler.current.set(pitchRef.current, yawRef.current, 0, "YXZ");
      camera.quaternion.setFromEuler(euler.current);
    }

    if (!moveSpeed || !keyAxisMap.size) return;
    velocity.current.set(0, 0, 0);
    for (const key of pressedRef.current) {
      const axis = keyAxisMap.get(key);
      if (!axis) continue;
      velocity.current.add(axis);
    }
    if (velocity.current.lengthSq() > 0) {
      velocity.current.normalize().multiplyScalar(moveSpeed * delta);
      velocity.current.applyQuaternion(camera.quaternion);
      camera.position.add(velocity.current);
    }
  });

  return null;
}
