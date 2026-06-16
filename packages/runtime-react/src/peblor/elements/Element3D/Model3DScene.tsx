"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useDeviceType } from "@pb/runtime-react/core/hooks/use-device-type";
import { SceneContent } from "./model3d-scene-content";
import { resolveModel3DRenderProfile } from "./model3d-render-profile";
import type { Block } from "./model3d-types";
import type {
  Model3DAnimationCommand,
  Model3DCameraCommand,
  Model3DVideoTextureCommand,
  Model3DTransformCommand,
  Model3DMaterialCommand,
  Model3DSceneCommand,
  Model3DPostProcessingCommand,
} from "./model3d-controls";

export type Model3DSceneProps = {
  block: Block;
  animationCommand: Model3DAnimationCommand | null;
  cameraCommand: Model3DCameraCommand | null;
  videoTextureCommand: Model3DVideoTextureCommand | null;
  transformCommand: Model3DTransformCommand | null;
  materialCommand: Model3DMaterialCommand | null;
  sceneCommand: Model3DSceneCommand | null;
  postProcessingCommand: Model3DPostProcessingCommand | null;
  onNavigate?: (href: string) => void;
  onReady?: () => void;
  isHomepagePriority?: boolean;
};

export function Model3DScene({
  block,
  animationCommand,
  cameraCommand,
  videoTextureCommand,
  transformCommand,
  materialCommand,
  sceneCommand,
  postProcessingCommand,
  onNavigate,
  onReady,
  isHomepagePriority = false,
}: {
  block: Block;
  animationCommand: Model3DAnimationCommand | null;
  cameraCommand: Model3DCameraCommand | null;
  videoTextureCommand: Model3DVideoTextureCommand | null;
  transformCommand: Model3DTransformCommand | null;
  materialCommand: Model3DMaterialCommand | null;
  sceneCommand: Model3DSceneCommand | null;
  postProcessingCommand: Model3DPostProcessingCommand | null;
  onNavigate?: (href: string) => void;
  onReady?: () => void;
  isHomepagePriority?: boolean;
}) {
  const { isMobile } = useDeviceType();
  const opaqueBackground = block.scene.background?.type === "color";
  const renderProfile = useMemo(
    () =>
      resolveModel3DRenderProfile({
        canvas: block.canvas,
        opaqueBackground,
        isMobile,
        isHomepagePriority,
      }),
    [block.canvas, isHomepagePriority, isMobile, opaqueBackground]
  );

  return (
    <Canvas
      className="block h-full w-full"
      style={{ width: "100%", height: "100%" }}
      dpr={renderProfile.dpr}
      gl={renderProfile.gl}
      frameloop="always"
      camera={{ position: [0, 0, 1], fov: 50 }}
    >
      <Suspense fallback={null}>
        <SceneContent
          block={block}
          animationCommand={animationCommand}
          cameraCommand={cameraCommand}
          videoTextureCommand={videoTextureCommand}
          transformCommand={transformCommand}
          materialCommand={materialCommand}
          sceneCommand={sceneCommand}
          postProcessingCommand={postProcessingCommand}
          onNavigate={onNavigate}
          onReady={onReady}
          isHomepagePriority={isHomepagePriority}
        />
      </Suspense>
    </Canvas>
  );
}
