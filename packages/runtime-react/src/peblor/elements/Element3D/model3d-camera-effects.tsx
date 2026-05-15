"use client";

import { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useDeviceType } from "@pb/runtime-react/core/hooks/use-device-type";

export type CameraEffectsProps = {
  bobbing?: { amount?: number; speed?: number };
  mouseFollow?: {
    sensitivity?: number;
    smoothness?: number;
    desktopOnly?: boolean;
  };
};

export function CameraEffects({ bobbing, mouseFollow }: CameraEffectsProps) {
  const { pointer } = useThree();
  const { isDesktop } = useDeviceType();
  const timeRef = useRef(0);
  const mouseOffsetRef = useRef({ x: 0, y: 0 });
  const targetMouseOffsetRef = useRef({ x: 0, y: 0 });

  const hasBob = bobbing != null;
  const bobAmount = bobbing?.amount ?? 0.3;
  const bobSpeed = bobbing?.speed ?? 0.8;
  const sensitivity = mouseFollow?.sensitivity ?? -0.2;
  const smoothness = mouseFollow?.smoothness ?? 0.1;
  const desktopOnly = mouseFollow?.desktopOnly ?? true;
  const hasMouse = mouseFollow != null;
  const mouseActive = hasMouse && (isDesktop || !desktopOnly);

  useFrame((state, delta) => {
    const camera = state.camera;
    timeRef.current += delta;
    const bobOffset = hasBob ? Math.sin(timeRef.current * bobSpeed) * bobAmount : 0;

    if (mouseActive) {
      targetMouseOffsetRef.current.x = pointer.x * sensitivity;
      targetMouseOffsetRef.current.y = pointer.y * sensitivity;
    } else if (hasMouse) {
      targetMouseOffsetRef.current.x = 0;
      targetMouseOffsetRef.current.y = 0;
    } else {
      targetMouseOffsetRef.current.x = 0;
      targetMouseOffsetRef.current.y = 0;
    }

    mouseOffsetRef.current.x +=
      (targetMouseOffsetRef.current.x - mouseOffsetRef.current.x) * smoothness;
    mouseOffsetRef.current.y +=
      (targetMouseOffsetRef.current.y - mouseOffsetRef.current.y) * smoothness;

    const camX = mouseOffsetRef.current.x;
    const camY = bobOffset + mouseOffsetRef.current.y;
    camera.position.set(camX, camY, camera.position.z);

    const lookAtX = mouseActive ? mouseOffsetRef.current.x * 0.1 : 0;
    const lookAtY = bobOffset * 0.002 + (mouseActive ? mouseOffsetRef.current.y * 0.05 : 0);
    camera.lookAt(lookAtX, lookAtY, 0);
    camera.updateMatrixWorld();
  });

  return null;
}
