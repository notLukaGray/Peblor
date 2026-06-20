"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useDeviceType } from "@pb/runtime-react/core/hooks/use-device-type";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import type { ElementBlock, MotionPropsFromJson } from "@pb/contracts/peblor/core/peblor-schemas";
import type { ElementLayoutTransformOptions } from "@pb/core/layout";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";

import type {
  Model3DAnimationCommand,
  Model3DCameraCommand,
  Model3DCameraEffectsValue,
  Model3DVideoTextureCommand,
  Model3DTransformCommand,
  Model3DMaterialCommand,
  Model3DSceneCommand,
  Model3DPostProcessingCommand,
} from "./Element3D/model3d-controls";
import type { Model3DSceneProps } from "./Element3D/Model3DScene";

const Model3DScene = dynamic<Model3DSceneProps>(
  () => import("./Element3D/Model3DScene").then((m) => ({ default: m.Model3DScene })),
  { ssr: false }
);
import { useModel3DLoadedState } from "./Element3D/use-model3d-loaded-state";
import { useModel3DTriggerControls } from "./Element3D/use-model3d-trigger-controls";
import { useModel3DReadySequence } from "./Element3D/use-model3d-ready-sequence";
import { useModel3DPreload } from "./Element3D/use-model3d-preload";
import { clearModel3DGLTFCache } from "./Element3D/model3d-use-gltf";
import { resolveModel3DAssetPath } from "./Element3D/model3d-texture-map";
import { MotionFromJson } from "@/peblor/integrations/framer-motion";
import {
  mergeMotionDefaults,
  getExitMotionFromPreset,
} from "@pb/contracts/peblor/core/peblor-motion-defaults";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import {
  isApprovedAssetUrl,
  THIRD_PARTY_ASSET_MESSAGE,
} from "@pb/runtime-react/core/lib/asset-host";

type Props = Extract<ElementBlock, { type: "elementModel3D" }> & {
  moduleConfig?: import("@pb/contracts/types").ModuleBlock;
};

type LayoutProps = Pick<
  ElementLayoutTransformOptions,
  "width" | "height" | "align" | "marginTop" | "marginBottom" | "marginLeft" | "marginRight"
> & {
  zIndex?: number;
  constraints?: import("@pb/contracts/types").ElementLayout["constraints"];
  [key: string]: unknown;
};

function buildLayout(values: {
  width: Props["width"];
  height: Props["height"];
  selfAlign: Props["selfAlign"];
  marginTop: Props["marginTop"];
  marginBottom: Props["marginBottom"];
  marginLeft: Props["marginLeft"];
  marginRight: Props["marginRight"];
  layer: Props["layer"];
  constraints: Props["constraints"];
  effects: Props["effects"];
  wrapperStyle: Props["wrapperStyle"];
  opacity: Props["opacity"];
  blendMode: Props["blendMode"];
  boxShadow: Props["boxShadow"];
  filter: Props["filter"];
  bgBlur: Props["bgBlur"];
  hidden: Props["hidden"];
  scroll: Props["scroll"];
}): LayoutProps {
  return {
    width: values.width as string | undefined,
    height: values.height as string | undefined,
    align: values.selfAlign as "left" | "center" | "right" | undefined,
    marginTop: values.marginTop as string | undefined,
    marginBottom: values.marginBottom as string | undefined,
    marginLeft: values.marginLeft as string | undefined,
    marginRight: values.marginRight as string | undefined,
    zIndex: values.layer,
    constraints: values.constraints,
    effects: values.effects,
    wrapperStyle: values.wrapperStyle,
    opacity: values.opacity,
    blendMode: values.blendMode,
    boxShadow: values.boxShadow,
    filter: values.filter,
    backdropFilter: values.bgBlur,
    hidden: values.hidden,
    overflow: values.scroll,
  };
}

function mergeCameraEffects(
  scene: Props["scene"],
  override: Model3DCameraEffectsValue | null | undefined
): Props["scene"] {
  if (override === undefined) return scene;
  if (override === null) return { ...scene, cameraEffects: undefined };
  return { ...scene, cameraEffects: override };
}

export function ElementModel3D({
  id,
  ariaLabel,
  initiallyLoaded = true,
  textures,
  materials,
  models,
  scene,
  canvas,
  postProcessing,
  aspectRatio,
  width,
  height,
  selfAlign,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  fixed: _fixed,
  action: _action,
  actionPayload: _actionPayload,
  showWhen: _showWhen,
  wrapperStyle,
  borderRadius: _borderRadius,
  effects,
  opacity: layoutOpacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  hidden,
  scroll,
  constraints,
  layer,
  alignY: _alignY,
  textAlign: _textAlign,
  moduleConfig: _moduleConfig,
  motion: motionFromJson,
  exitPreset,
  interactions,
}: Props) {
  const { isMobile } = useDeviceType();
  const resolvedAspectRatio = resolveResponsiveValue(aspectRatio, isMobile) as string | undefined;

  const layout = buildLayout({
    width,
    height,
    selfAlign,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    layer,
    constraints,
    effects,
    wrapperStyle,
    opacity: layoutOpacity,
    blendMode,
    boxShadow,
    filter,
    bgBlur,
    hidden,
    scroll,
  });
  const router = useRouter();
  const pathname = usePathname();
  const onNavigate = useCallback((href: string) => router.push(href), [router]);
  const isHomepagePriority = pathname === "/" && initiallyLoaded;

  const geometryUrls = useMemo(() => {
    if (!models) return [];
    return Object.values(models)
      .map((m) => resolveModel3DAssetPath(m.geometry, { raw: true }))
      .filter((g): g is string => !!g);
  }, [models]);

  const { isLoaded, setLoadedState } = useModel3DLoadedState({ id, initiallyLoaded });

  const clearGeometryCache = useCallback(() => {
    clearModel3DGLTFCache(geometryUrls);
  }, [geometryUrls]);

  useModel3DPreload(geometryUrls, { eager: isHomepagePriority, enabled: isLoaded });
  const [modelError, setModelError] = useState<string | null>(null);
  const handleModelError = useCallback((url: string) => {
    setModelError(url);
  }, []);
  const [prevGeometryUrls, setPrevGeometryUrls] = useState(geometryUrls);
  if (geometryUrls !== prevGeometryUrls) {
    setPrevGeometryUrls(geometryUrls);
    setModelError(null);
  }
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [opacityTransitionMs, setOpacityTransitionMs] = useState(
    MOTION_DEFAULTS.transition.duration * 1000
  );
  const [cameraEffectsOverride, setCameraEffectsOverride] = useState<
    Model3DCameraEffectsValue | null | undefined
  >(undefined);
  const [animationCommand, setAnimationCommand] = useState<Model3DAnimationCommand | null>(null);
  const [cameraCommand, setCameraCommand] = useState<Model3DCameraCommand | null>(null);
  const [videoTextureCommand, setVideoTextureCommand] = useState<Model3DVideoTextureCommand | null>(
    null
  );
  const [transformCommand, setTransformCommand] = useState<Model3DTransformCommand | null>(null);
  const [materialCommand, setMaterialCommand] = useState<Model3DMaterialCommand | null>(null);
  const [sceneCommand, setSceneCommand] = useState<Model3DSceneCommand | null>(null);
  const [postProcessingCommand, setPostProcessingCommand] =
    useState<Model3DPostProcessingCommand | null>(null);
  const { prepareLoad, handleReady } = useModel3DReadySequence({
    id,
    setIsVisible,
    setOpacity,
    setOpacityTransitionMs,
  });

  useModel3DTriggerControls({
    id,
    sceneCameraPresets: scene.cameraPresets,
    opacity,
    setLoadedState,
    setIsVisible,
    setOpacity,
    setOpacityTransitionMs,
    setCameraEffectsOverride,
    setAnimationCommand,
    setCameraCommand,
    setVideoTextureCommand,
    setTransformCommand,
    setMaterialCommand,
    setSceneCommand,
    setPostProcessingCommand,
    onBeforeLoad: (payload) => prepareLoad(payload),
    onClearGeometryCache: clearGeometryCache,
  });

  const block = useMemo(
    () => ({
      textures,
      materials,
      models,
      scene: mergeCameraEffects(scene, cameraEffectsOverride),
      canvas,
      postProcessing,
    }),
    [textures, materials, models, scene, cameraEffectsOverride, canvas, postProcessing]
  );

  const motionConfig = useMemo((): MotionPropsFromJson => {
    const base = mergeMotionDefaults(
      (motionFromJson ?? {}) as MotionPropsFromJson
    ) as MotionPropsFromJson;
    const durationSec = Math.max(0, opacityTransitionMs) / 1000;
    const exitFromPreset =
      exitPreset && typeof exitPreset === "string"
        ? getExitMotionFromPreset(exitPreset, { duration: durationSec }).leave
        : undefined;
    const exitKeyframes =
      (base.leave as Record<string, unknown> | undefined) ??
      exitFromPreset ??
      (MOTION_DEFAULTS.motionComponent.leave as Record<string, unknown>);
    return {
      ...base,
      leave: exitKeyframes as Record<string, string | number | number[]>,
      transition:
        typeof base.transition === "object" && base.transition != null
          ? { ...base.transition, duration: durationSec }
          : { duration: durationSec },
    };
  }, [motionFromJson, exitPreset, opacityTransitionMs]);

  const clampedOpacity = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 0;
  const showLayer = isVisible || clampedOpacity > 0;

  if (!isLoaded) return null;

  if (modelError) {
    const message = isApprovedAssetUrl(modelError)
      ? "3D model failed to load."
      : THIRD_PARTY_ASSET_MESSAGE;
    return (
      <ElementLayoutWrapper layout={layout} interactions={interactions}>
        <div
          className="relative w-full h-full min-h-0 min-w-0 flex-1 flex items-center justify-center"
          role="status"
        >
          <span className="text-muted-foreground text-sm">{message}</span>
        </div>
      </ElementLayoutWrapper>
    );
  }

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions}>
      <div
        className={
          resolvedAspectRatio
            ? "relative w-full min-h-0 min-w-0"
            : "relative w-full h-full min-h-0 min-w-0 flex-1"
        }
        style={resolvedAspectRatio ? { aspectRatio: resolvedAspectRatio } : undefined}
      >
        <MotionFromJson
          motion={motionConfig}
          animateOverride={{ opacity: clampedOpacity }}
          className={
            resolvedAspectRatio
              ? "relative w-full h-full rounded overflow-hidden"
              : "absolute inset-0 rounded overflow-hidden"
          }
          style={{
            visibility: showLayer ? "visible" : "hidden",
            pointerEvents: isVisible && clampedOpacity > 0 ? "auto" : "none",
          }}
          role="img"
          aria-label={ariaLabel?.trim() || "3D model"}
        >
          <Model3DScene
            block={block}
            animationCommand={animationCommand}
            cameraCommand={cameraCommand}
            videoTextureCommand={videoTextureCommand}
            transformCommand={transformCommand}
            materialCommand={materialCommand}
            sceneCommand={sceneCommand}
            postProcessingCommand={postProcessingCommand}
            onNavigate={onNavigate}
            onReady={handleReady}
            onModelError={handleModelError}
            isHomepagePriority={isHomepagePriority}
          />
        </MotionFromJson>
      </div>
    </ElementLayoutWrapper>
  );
}
