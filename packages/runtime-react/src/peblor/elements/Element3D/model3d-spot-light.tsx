"use client";

import { useEffect, useRef } from "react";
import { type Object3D, type SpotLight } from "three";

export type SpotLightWithTargetProps = {
  position: [number, number, number];
  target?: [number, number, number];
  angle?: number;
  penumbra?: number;
  intensity?: number;
};

export function SpotLightWithTarget({
  position,
  target,
  angle = 0.1,
  penumbra = 0.5,
  intensity = 1,
}: SpotLightWithTargetProps) {
  const lightRef = useRef<SpotLight>(null);
  const targetRef = useRef<Object3D>(null);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  useEffect(() => {
    if (targetRef.current && target) {
      targetRef.current.position.set(...target);
    }
  }, [target]);

  return (
    <>
      <object3D ref={targetRef} position={target ?? [0, 0, 0]} />
      <spotLight
        ref={lightRef}
        position={position}
        angle={angle}
        penumbra={penumbra}
        intensity={intensity}
      />
    </>
  );
}
