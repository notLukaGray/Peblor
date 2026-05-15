"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrthographicCamera } from "three";

export type OrthoCameraFromBlockProps = {
  size?: number;
  near?: number;
  far?: number;
};

export function OrthoCameraFromBlock({
  size = 0.1,
  near = 0.1,
  far = 1000,
}: OrthoCameraFromBlockProps) {
  const { set, size: viewSize } = useThree();
  const camRef = useRef<OrthographicCamera | null>(null);

  useEffect(() => {
    const cam = new OrthographicCamera(-size, size, size, -size, near, far);
    cam.position.set(0, 0, 1);
    cam.zoom = 1;
    cam.lookAt(0, 0, 0);
    camRef.current = cam;
    set({ camera: cam });
    return () => {
      camRef.current = null;
    };
  }, [set, size, near, far]);

  useEffect(() => {
    const cam = camRef.current;
    if (!cam) return;
    const aspect = viewSize.width / viewSize.height;
    cam.left = -size * aspect;
    cam.right = size * aspect;
    cam.top = size;
    cam.bottom = -size;
    cam.updateProjectionMatrix();
  }, [viewSize, size]);

  return null;
}
