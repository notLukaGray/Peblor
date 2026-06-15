"use client";

import type { ReactNode, ReactElement } from "react";
import { useState, useEffect } from "react";
import {
  EffectComposer,
  BrightnessContrast,
  Noise,
  Bloom,
  SSAO,
} from "@react-three/postprocessing";
import type { PostProcessingEffectDef } from "@pb/contracts/types";
import { useDeviceType } from "@pb/runtime-react/core/hooks/use-device-type";
import { globals } from "@pb/runtime-react/core/lib/globals";
import type { Model3DPostProcessingCommand } from "./model3d-controls";

type EffectDef = PostProcessingEffectDef & Record<string, unknown>;

const EFFECT_RENDERERS: Record<
  string,
  (effect: EffectDef, key: number, overrides: Record<string, number>) => ReactNode
> = {
  brightnessContrast: (effect, key, overrides) => (
    <BrightnessContrast
      key={key}
      brightness={overrides.brightness ?? (effect.brightness as number | undefined) ?? 0}
      contrast={overrides.contrast ?? (effect.contrast as number | undefined) ?? 1}
    />
  ),
  noise: (effect, key, overrides) => (
    <Noise
      key={key}
      opacity={
        overrides.opacity ?? (effect.opacity as number | undefined) ?? globals.threeNoiseOpacity
      }
    />
  ),
  bloom: (effect, key, overrides) => (
    <Bloom
      key={key}
      intensity={overrides.intensity ?? (effect.intensity as number | undefined) ?? 1}
      luminanceThreshold={
        overrides.luminanceThreshold ??
        (effect.luminanceThreshold as number | undefined) ??
        globals.threeBloomLuminanceThreshold
      }
      luminanceSmoothing={
        overrides.luminanceSmoothing ??
        (effect.luminanceSmoothing as number | undefined) ??
        globals.threeBloomLuminanceSmoothing
      }
      radius={overrides.radius ?? (effect.radius as number | undefined) ?? globals.threeBloomRadius}
      levels={(effect.levels as number | undefined) ?? 8}
      mipmapBlur={(effect.mipmapBlur as boolean | undefined) ?? true}
    />
  ),
  ssao: (effect, key, overrides) => (
    <SSAO
      key={key}
      samples={(effect.samples as number | undefined) ?? 30}
      rings={(effect.rings as number | undefined) ?? 4}
      radius={overrides.radius ?? (effect.radius as number | undefined) ?? 5}
      intensity={overrides.intensity ?? (effect.intensity as number | undefined) ?? 1}
      luminanceInfluence={
        (effect.luminanceInfluence as number | undefined) ?? globals.threeSsaoLuminanceInfluence
      }
      bias={(effect.bias as number | undefined) ?? globals.threeSsaoBias}
      fade={(effect.fade as number | undefined) ?? globals.threeSsaoFade}
      distanceThreshold={(effect.distanceThreshold as number | undefined) ?? 1}
      distanceFalloff={(effect.distanceFalloff as number | undefined) ?? 0}
      rangeThreshold={
        (effect.rangeThreshold as number | undefined) ?? globals.threeSsaoRangeThreshold
      }
      rangeFalloff={(effect.rangeFalloff as number | undefined) ?? globals.threeSsaoRangeFalloff}
    />
  ),
};

export function ScenePostProcessing({
  effects,
  command,
}: {
  effects: PostProcessingEffectDef[];
  command?: Model3DPostProcessingCommand | null;
}) {
  const { isMobile } = useDeviceType();
  const [overrides, setOverrides] = useState<Map<string, Record<string, number>>>(new Map());
  const [disabledEffects, setDisabledEffects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!command) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (command.type === "setParam") {
        setOverrides((prev) => {
          const next = new Map(prev);
          const current = next.get(command.effect) ?? {};
          next.set(command.effect, { ...current, [command.param]: command.value });
          return next;
        });
      } else if (command.type === "toggleEffect") {
        setDisabledEffects((prev) => {
          const next = new Set(prev);
          if (command.enabled === true) next.delete(command.effect);
          else if (command.enabled === false) next.add(command.effect);
          else {
            if (next.has(command.effect)) next.delete(command.effect);
            else next.add(command.effect);
          }
          return next;
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [command]);

  if (!effects?.length) return null;
  const children = effects
    .filter((effect) => !disabledEffects.has(effect.type))
    .filter((effect) => !(isMobile && (effect as EffectDef).disabledOnMobile))
    .map((effect, i) => {
      const renderer = EFFECT_RENDERERS[effect.type];
      return renderer ? renderer(effect as EffectDef, i, overrides.get(effect.type) ?? {}) : null;
    })
    .filter((x): x is ReactElement => x != null);
  if (children.length === 0) return null;
  const needsNormalPass = effects.some((effect) => effect.type === "ssao");
  return <EffectComposer enableNormalPass={needsNormalPass}>{children}</EffectComposer>;
}
