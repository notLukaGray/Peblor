"use client";

import type { ComponentProps } from "react";
import { OrbitControls } from "@react-three/drei";

export function SceneOrbitControls(props: ComponentProps<typeof OrbitControls>) {
  return <OrbitControls {...props} />;
}
