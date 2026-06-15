"use client";

import type { ReactNode } from "react";
import { SpotLightWithTarget } from "./model3d-spot-light";
import type { SceneDef, LightDef } from "@pb/contracts/types";
import { globals } from "@pb/runtime-react/core/lib/globals";

type LightRenderer = (light: LightDef, key: number) => ReactNode;

const LIGHT_RENDERERS: Record<string, LightRenderer> = {
  ambient: (light, key) => (
    <ambientLight
      key={key}
      intensity={(light as { intensity?: number }).intensity ?? globals.threeAmbientIntensity}
      color={(light as { color?: string }).color ?? globals.colorLight3d}
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
        angle={s.angle ?? globals.threeSpotAngle}
        penumbra={s.penumbra ?? globals.threeSpotPenumbra}
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
        color={p.color ?? globals.colorLight3d}
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
        color={d.color ?? globals.colorLight3d}
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
