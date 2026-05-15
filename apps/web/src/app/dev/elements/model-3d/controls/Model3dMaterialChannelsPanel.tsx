import { useMemo, useRef, useState } from "react";
import { useObjectUrlRegistry } from "@/app/dev/elements/_shared/asset-input-utils";
import type { Model3dVariantDefaults } from "../types";
import type { Model3dElementDevController } from "../useModel3dElementDevController";
import { asObjectMap, type ObjectMap } from "./model3d-asset-helpers";
import {
  MATERIAL_CHANNELS,
  classifyTextureUpload,
  createTextureKey,
  createTextureRecord,
  patchMaterialChannel,
  resolveChannelMode,
  type MaterialChannelKey,
} from "./model3d-material-studio-helpers";

function applyNormalizedPatch(
  controller: Model3dElementDevController,
  patch: Partial<Model3dVariantDefaults>
) {
  const next = controller.normalizeVariant(controller.active, patch);
  controller.setVariantExact(controller.activeVariant, next);
}

function materialValueAsNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0.5;
}

function resolveSelectedMaterial(current: string, keys: string[]): string {
  if (current && keys.includes(current)) return current;
  return keys[0] ?? "";
}

export function Model3dMaterialChannelsPanel({
  controller,
}: {
  controller: Model3dElementDevController;
}) {
  const [materialDraftKey, setMaterialDraftKey] = useState("");
  const [selectedMaterialState, setSelectedMaterialState] = useState("");
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const { createTrackedObjectUrl } = useObjectUrlRegistry();

  const materials = useMemo(
    () => asObjectMap(controller.active.materials),
    [controller.active.materials]
  );
  const textures = useMemo(
    () => asObjectMap(controller.active.textures),
    [controller.active.textures]
  );
  const materialKeys = useMemo(() => Object.keys(materials).sort(), [materials]);
  const selectedMaterial = resolveSelectedMaterial(selectedMaterialState, materialKeys);
  const selectedMaterialDef = selectedMaterial ? (materials[selectedMaterial] ?? {}) : {};

  const addMaterial = () => {
    const key = materialDraftKey.trim();
    if (!key) {
      setAssetError("Enter a material key before adding.");
      setAssetMessage(null);
      return;
    }
    if (materials[key]) {
      setAssetError("That material key already exists.");
      setAssetMessage(null);
      return;
    }
    applyNormalizedPatch(controller, {
      materials: {
        ...materials,
        [key]: { roughness: 0.65, metallic: 0.1 },
      } as Partial<Model3dVariantDefaults["materials"]>,
    } as Partial<Model3dVariantDefaults>);
    setSelectedMaterialState(key);
    setMaterialDraftKey("");
    setAssetError(null);
    setAssetMessage(`Material created: ${key}`);
  };

  const setChannelMode = (channel: MaterialChannelKey, mode: "none" | "texture" | "float") => {
    let nextValue: string | number | undefined = undefined;
    if (mode === "texture") nextValue = Object.keys(textures)[0] ?? "";
    if (mode === "float") nextValue = materialValueAsNumber(selectedMaterialDef[channel]);
    const nextMaterials = patchMaterialChannel(materials, selectedMaterial, channel, nextValue);
    applyNormalizedPatch(controller, {
      materials: nextMaterials,
    } as Partial<Model3dVariantDefaults>);
  };

  const setTextureValue = (channel: MaterialChannelKey, value: string) => {
    const nextMaterials = patchMaterialChannel(materials, selectedMaterial, channel, value);
    applyNormalizedPatch(controller, {
      materials: nextMaterials,
    } as Partial<Model3dVariantDefaults>);
  };

  const setFloatValue = (channel: MaterialChannelKey, value: string) => {
    const parsed = Number(value);
    const nextValue = Number.isFinite(parsed) ? parsed : 0;
    const nextMaterials = patchMaterialChannel(materials, selectedMaterial, channel, nextValue);
    applyNormalizedPatch(controller, {
      materials: nextMaterials,
    } as Partial<Model3dVariantDefaults>);
  };

  const uploadTextureForChannel = (channel: MaterialChannelKey, file: File | null) => {
    if (!file) return;
    const kind = classifyTextureUpload(file);
    if (!kind) {
      setAssetError("Invalid texture type. Upload an image or video file.");
      setAssetMessage(null);
      return;
    }
    const textureKey = createTextureKey(file.name, channel, Object.keys(textures));
    const source = createTrackedObjectUrl(file);
    const nextTextures: ObjectMap = {
      ...textures,
      [textureKey]: createTextureRecord(kind, source),
    };
    const nextMaterials = patchMaterialChannel(materials, selectedMaterial, channel, textureKey);
    applyNormalizedPatch(controller, {
      textures: nextTextures as Partial<Model3dVariantDefaults["textures"]>,
      materials: nextMaterials,
    } as Partial<Model3dVariantDefaults>);
    setAssetError(null);
    setAssetMessage(`Uploaded ${channel} texture: ${file.name}`);
  };

  return (
    <div className="sm:col-span-2 space-y-3 rounded border border-border/60 bg-muted/10 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Material Channels
      </p>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Material
        </span>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedMaterial}
            onChange={(event) => setSelectedMaterialState(event.target.value)}
            className="min-w-[14rem] rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
          >
            <option value="">Select material</option>
            {materialKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={materialDraftKey}
            onChange={(event) => setMaterialDraftKey(event.target.value)}
            placeholder="newMaterialKey"
            className="min-w-[12rem] rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
          />
          <button
            type="button"
            onClick={addMaterial}
            className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
          >
            Add Material
          </button>
        </div>
      </label>

      {selectedMaterial ? (
        <div className="space-y-2 rounded border border-border/60 bg-background/40 p-2">
          {MATERIAL_CHANNELS.map((channel) => {
            const value = selectedMaterialDef[channel.key];
            const mode = resolveChannelMode(channel.key, value, channel.supportsFloat);
            return (
              <div key={channel.key} className="flex flex-wrap items-center gap-2">
                <span className="w-[8rem] font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {channel.label}
                </span>
                <select
                  value={mode}
                  onChange={(event) =>
                    setChannelMode(channel.key, event.target.value as "none" | "texture" | "float")
                  }
                  className="rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
                >
                  <option value="none">None</option>
                  <option value="texture">Texture</option>
                  {channel.supportsFloat ? <option value="float">Float</option> : null}
                </select>
                {mode === "texture" ? (
                  <>
                    <select
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) => setTextureValue(channel.key, event.target.value)}
                      className="min-w-[12rem] rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
                    >
                      <option value="">Select texture key</option>
                      {Object.keys(textures).map((textureKey) => (
                        <option key={textureKey} value={textureKey}>
                          {textureKey}
                        </option>
                      ))}
                    </select>
                    <input
                      ref={(node) => {
                        fileInputsRef.current[channel.key] = node;
                      }}
                      type="file"
                      accept="image/*,video/*,.png,.jpg,.jpeg,.webp,.avif,.gif,.mp4,.webm,.mov,.m4v,.ogg"
                      className="sr-only"
                      onChange={(event) => {
                        uploadTextureForChannel(channel.key, event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputsRef.current[channel.key]?.click()}
                      className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
                    >
                      Upload
                    </button>
                  </>
                ) : null}
                {mode === "float" ? (
                  <input
                    type="number"
                    step="0.01"
                    value={typeof value === "number" ? value : 0}
                    onChange={(event) => setFloatValue(channel.key, event.target.value)}
                    className="w-[8rem] rounded border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Select or add a material to edit channel values.
        </p>
      )}

      {assetError ? <p className="text-[10px] text-rose-300">{assetError}</p> : null}
      {assetMessage ? <p className="text-[10px] text-muted-foreground">{assetMessage}</p> : null}
    </div>
  );
}
