"use client";

import type { ComponentProps } from "react";
import { Environment } from "@react-three/drei";

export function SceneEnvironment(props: ComponentProps<typeof Environment>) {
  return <Environment {...props} />;
}
