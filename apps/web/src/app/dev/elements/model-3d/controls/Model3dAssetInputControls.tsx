import { useRef, useState } from "react";
import {
  hasAllowedFileExtension,
  isRecord,
  toAssetKeyFromFileName,
  uniqueRecordKey,
  useObjectUrlRegistry,
} from "@/app/dev/elements/_shared/asset-input-utils";
import type { Model3dVariantDefaults } from "../types";
import type { Model3dElementDevController } from "../useModel3dElementDevController";
import { asObjectMap, ensureModelInstance, ensureSceneRecord } from "./model3d-asset-helpers";

function applyNormalizedPatch(
  controller: Model3dElementDevController,
  patch: Partial<Model3dVariantDefaults>
) {
  const next = controller.normalizeVariant(controller.active, patch);
  controller.setVariantExact(controller.activeVariant, next);
}

function getMaterialKeyForModel(
  materials: Record<string, Record<string, unknown>>,
  modelKey: string
) {
  const existing = Object.keys(materials)[0];
  if (existing) return existing;
  const draft = `${modelKey.replace(/Model$/i, "")}Material`;
  const next = uniqueRecordKey(Object.keys(materials), draft);
  materials[next] = { roughness: 0.65, metallic: 0.1 };
  return next;
}

function createModelUploadPatch(
  active: Model3dElementDevController["active"],
  file: File,
  createObjectUrl: (blob: Blob) => string
): { patch: Partial<Model3dVariantDefaults>; modelKey: string } {
  const models = asObjectMap(active.models);
  const materials = asObjectMap(active.materials);
  const scene = ensureSceneRecord(active.scene);

  const base = toAssetKeyFromFileName(file.name, "uploadedModel");
  const modelKey = uniqueRecordKey(
    Object.keys(models),
    base.endsWith("Model") ? base : `${base}Model`
  );
  const materialKey = getMaterialKeyForModel(materials, modelKey);

  models[modelKey] = {
    geometry: createObjectUrl(file),
    materialBindings: { Default: materialKey },
  };
  ensureModelInstance(scene, modelKey);

  return { patch: { models, materials, scene } as Partial<Model3dVariantDefaults>, modelKey };
}

export function Model3dAssetInputControls({
  controller,
}: {
  controller: Model3dElementDevController;
}) {
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const modelInputRef = useRef<HTMLInputElement | null>(null);
  const { createTrackedObjectUrl } = useObjectUrlRegistry();

  const handleModelUpload = (file: File | null) => {
    if (!file) return;
    if (!hasAllowedFileExtension(file.name, [".glb", ".gltf"])) {
      setAssetError("Invalid file type. Upload a .glb or .gltf model scene.");
      setAssetMessage(null);
      return;
    }

    const update = createModelUploadPatch(controller.active, file, createTrackedObjectUrl);
    applyNormalizedPatch(controller, update.patch);
    setAssetError(null);
    setAssetMessage(`Scene uploaded: ${file.name} (model key: ${update.modelKey})`);
  };

  const activeModels = asObjectMap(controller.active.models);
  const activeModelKeys = Object.keys(activeModels).filter((key) => {
    const model = activeModels[key];
    return (
      isRecord(model) && typeof model.geometry === "string" && model.geometry.trim().length > 0
    );
  });

  return (
    <div className="sm:col-span-2 space-y-2 rounded border border-border/60 bg-muted/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Stage 1 · Scene
      </p>
      <p className="text-[10px] text-muted-foreground">
        Upload a scene model first. Material/channel linking unlocks after at least one model is
        present.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          ref={modelInputRef}
          type="file"
          accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
          className="sr-only"
          onChange={(event) => {
            handleModelUpload(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => modelInputRef.current?.click()}
          className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
        >
          Upload Scene
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Models loaded: {activeModelKeys.length > 0 ? activeModelKeys.join(", ") : "none"}
      </p>
      {assetError ? <p className="text-[10px] text-rose-300">{assetError}</p> : null}
      {assetMessage ? <p className="text-[10px] text-muted-foreground">{assetMessage}</p> : null}
    </div>
  );
}
