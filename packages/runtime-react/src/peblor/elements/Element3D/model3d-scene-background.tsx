"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Color, type Scene } from "three";
import type { SceneDef } from "@pb/contracts/peblor/core/peblor-schemas";

function setSceneBackground(scene: Scene, color: string | null): void {
  scene.background = color ? new Color(color) : null;
}

export function SceneBackgroundSetup({
  background,
}: {
  background: SceneDef["background"] | undefined;
}) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (background?.type === "color") {
      setSceneBackground(scene, background.color);
      return () => {
        setSceneBackground(scene, null);
      };
    }
    setSceneBackground(scene, null);
    return;
  }, [background, scene]);

  return null;
}
