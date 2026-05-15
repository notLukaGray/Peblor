"use client";

import type { ReactNode } from "react";
import { SpotLightWithTarget } from "./model3d-spot-light";
import type { SceneDef, LightDef } from "@pb/contracts/types";

type LightRenderer = (light: LightDef, key: number) => ReactNode;

const LIGHT_RENDERERS: Record<string, LightRenderer> = {
  ambient: (light, key) => (
    <ambientLight
      key={key}
      intensity={(light as { intensity?: number }).intensity ?? 0.5}
      color={(light as { color?: string }).color ?? "#ffffff"}
    />
  ),
  spot: (light, key) => {
    const s = light as {
      position: [number, number, number];
      target?: [number, number, number];
      angle?: number;
      penumbra?: number;
      intensity?: number;
    };
    return (
      <SpotLightWithTarget
        key={key}
        position={s.position}
        target={s.target}
        angle={s.angle ?? 0.1}
        penumbra={s.penumbra ?? 0.5}
        intensity={s.intensity ?? 1}
      />
    );
  },
  point: (light, key) => {
    const p = light as {
      position: [number, number, number];
      intensity?: number;
      color?: string;
    };
    return (
      <pointLight
        key={key}
        position={p.position}
        intensity={p.intensity ?? 1}
        color={p.color ?? "#ffffff"}
      />
    );
  },
  directional: (light, key) => {
    const d = light as {
      position?: [number, number, number];
      intensity?: number;
      color?: string;
    };
    return (
      <directionalLight
        key={key}
        position={d.position ?? [5, 5, 5]}
        intensity={d.intensity ?? 1}
        color={d.color ?? "#ffffff"}
      />
    );
  },
};

export function SceneLights({ lights }: { lights: SceneDef["lights"] }) {
  if (!lights?.length) return null;
  return (
    <>
      {lights.map((light, i) => {
        const renderer = LIGHT_RENDERERS[light.type] as LightRenderer | undefined;
        return renderer ? renderer(light, i) : null;
      })}
    </>
  );
}
