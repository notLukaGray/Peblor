"use client";

import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { isRecord } from "@/app/dev/elements/_shared/asset-input-utils";
import { PreviewProvenanceBadge } from "@/app/dev/workbench/PreviewProvenanceBadge";
import { VARIANT_LABELS } from "./constants";
import type { Model3dElementDevController } from "./useModel3dElementDevController";

const PREVIEW_CAMERA_FALLBACK = {
  type: "perspective",
  fov: 45,
  near: 0.1,
  far: 100,
  position: [0, 0.7, 6],
};

function getRenderableModels(active: Model3dElementDevController["active"]) {
  if (!isRecord(active.models)) return {};
  return Object.fromEntries(
    Object.entries(active.models).filter(
      ([, value]) =>
        isRecord(value) && typeof value.geometry === "string" && value.geometry.trim().length > 0
    )
  );
}

function preparePreviewScene(active: Model3dElementDevController["active"], modelKeys: string[]) {
  const scene = isRecord(active.scene) ? { ...active.scene } : {};
  if (!isRecord(scene.camera)) scene.camera = { ...PREVIEW_CAMERA_FALLBACK };
  const contents = isRecord(scene.contents) ? { ...scene.contents } : {};
  const existingInstances = Array.isArray(contents.models) ? [...contents.models] : [];
  contents.models = existingInstances;
  let injectedModelInstance = false;
  if (
    modelKeys.length > 0 &&
    !existingInstances.some((entry) => isRecord(entry) && typeof entry.model === "string")
  ) {
    injectedModelInstance = true;
    contents.models = [{ model: modelKeys[0], position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }];
  }
  scene.contents = contents;
  return { scene, injectedModelInstance };
}

function buildPreviewHints(
  active: Model3dElementDevController["active"],
  modelKeys: string[],
  injectedModelInstance: boolean
) {
  const hints: string[] = [];
  if (modelKeys.length === 0) hints.push("Upload a .glb/.gltf model to render the scene.");
  if (!isRecord(active.scene) || !isRecord(active.scene.camera)) {
    hints.push("Scene camera missing; preview is using a starter perspective camera.");
  }
  if (modelKeys.length > 0 && injectedModelInstance) {
    hints.push("No scene model instances found; preview inserted the first model automatically.");
  }
  if (!isRecord(active.textures) || Object.keys(active.textures).length === 0) {
    hints.push("Optional: upload a texture to quickly test material bindings.");
  }
  return hints;
}

function prepareModel3dPreview(active: Model3dElementDevController["active"]) {
  const models = getRenderableModels(active);
  const modelKeys = Object.keys(models);
  const { scene, injectedModelInstance } = preparePreviewScene(active, modelKeys);
  const hints = buildPreviewHints(active, modelKeys, injectedModelInstance);

  return {
    canRender: modelKeys.length > 0,
    hints,
    block: {
      ...active,
      models,
      scene,
    },
  };
}

export function Model3dPreviewPanel({ controller }: { controller: Model3dElementDevController }) {
  const { runtimePreview } = controller;
  const prepared = useMemo(() => prepareModel3dPreview(controller.active), [controller.active]);
  const rawPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          ...controller.active,
          type: "elementModel3D",
        },
        { mode: "raw" }
      ),
    [controller.runtimeDraft, controller.active]
  );
  const guidedPreviewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          ...prepared.block,
          type: "elementModel3D",
        },
        { mode: "guided" }
      ),
    [controller.runtimeDraft, prepared.block]
  );
  const hiddenByVisibleWhen =
    controller.runtimeDraft.visibleWhenEnabled && !runtimePreview.visibleWhenMatches;
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];

  if (!prepared.canRender) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <div className="flex items-center gap-2">
            <PreviewProvenanceBadge mode="placeholder" />
            <span className="font-mono text-[10px] text-muted-foreground">{variantLabel}</span>
          </div>
        </div>
        <div className="min-h-[10rem] rounded-md border border-dashed border-border/80 bg-muted/10 p-6 flex flex-col items-center justify-center gap-3">
          <p className="font-mono text-[11px] text-muted-foreground text-center">
            Live preview requires a model geometry path.
          </p>
          <p className="text-[10px] text-muted-foreground/70 text-center max-w-[24rem]">
            Use Asset Input to upload a <code>.glb</code> or <code>.gltf</code>. Scene/camera
            defaults are preserved and Create Custom remains available for advanced edits.
          </p>
        </div>
        {prepared.hints.length > 0 ? (
          <div className="rounded border border-border/60 bg-muted/10 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Missing Fields
            </p>
            <div className="mt-1 space-y-1">
              {prepared.hints.map((hint) => (
                <p key={hint} className="text-[10px] text-muted-foreground">
                  {hint}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <TypographyLiveMotionPreview
        previewVisible={controller.previewVisible}
        previewKey={controller.previewKey}
        autoLoop={controller.autoLoop}
        setAutoLoop={controller.setAutoLoop}
        animateInPreview={controller.animateInPreview}
        animateOutPreview={controller.animateOutPreview}
        showPreview={controller.showPreview}
        variantLabel={variantLabel}
        hiddenByVisibleWhen={hiddenByVisibleWhen}
        runtimeDraft={controller.runtimeDraft}
        previewBlock={rawPreviewBlock}
        guidedPreviewBlock={guidedPreviewBlock}
        onPreviewExitComplete={controller.onPreviewExitComplete}
        animationSource={controller.active.animation}
      />
      {prepared.hints.length > 0 ? (
        <div className="rounded border border-border/60 bg-muted/10 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Missing Fields
          </p>
          <div className="mt-1 space-y-1">
            {prepared.hints.map((hint) => (
              <p key={hint} className="text-[10px] text-muted-foreground">
                {hint}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
