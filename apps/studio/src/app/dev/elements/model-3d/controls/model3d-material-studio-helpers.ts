import { type Material, Mesh } from "three";
import {
  hasAllowedFileExtension,
  isRecord,
  toAssetKeyFromFileName,
  uniqueRecordKey,
} from "@/app/dev/elements/_shared/asset-input-utils";
import type { Model3dVariantDefaults } from "../types";
import type { ObjectMap } from "./model3d-asset-helpers";

export type MaterialChannelKey = "albedo" | "normal" | "emissive" | "roughness" | "metallic" | "ao";

export type ChannelMode = "none" | "texture" | "float";

export const MATERIAL_CHANNELS: Array<{
  key: MaterialChannelKey;
  label: string;
  supportsFloat: boolean;
}> = [
  { key: "albedo", label: "Albedo", supportsFloat: false },
  { key: "normal", label: "Normal", supportsFloat: false },
  { key: "emissive", label: "Emissive", supportsFloat: false },
  { key: "roughness", label: "Roughness", supportsFloat: true },
  { key: "metallic", label: "Metallic", supportsFloat: true },
  { key: "ao", label: "Ambient Occlusion", supportsFloat: false },
];

export function resolveChannelMode(
  key: MaterialChannelKey,
  value: unknown,
  supportsFloat: boolean
): ChannelMode {
  if (typeof value === "string" && value.trim().length > 0) return "texture";
  if (supportsFloat && typeof value === "number") return "float";
  if (key === "roughness" || key === "metallic") return "float";
  return "none";
}

export function classifyTextureUpload(file: File): "image" | "video" | null {
  if (
    file.type.startsWith("image/") ||
    hasAllowedFileExtension(file.name, [".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"])
  ) {
    return "image";
  }
  if (
    file.type.startsWith("video/") ||
    hasAllowedFileExtension(file.name, [".mp4", ".webm", ".mov", ".m4v", ".ogg"])
  ) {
    return "video";
  }
  return null;
}

export function createTextureKey(
  fileName: string,
  channel: MaterialChannelKey,
  existingTextureKeys: string[]
): string {
  const base = toAssetKeyFromFileName(fileName, `${channel}Tex`);
  const preferred = base.endsWith("Tex") ? base : `${base}Tex`;
  return uniqueRecordKey(existingTextureKeys, preferred);
}

export function createTextureRecord(kind: "image" | "video", source: string) {
  if (kind === "video") return { type: "video", source, loop: true, muted: true };
  return { type: "image", source };
}

export function patchMaterialChannel(
  materials: ObjectMap,
  materialKey: string,
  channel: MaterialChannelKey,
  value: string | number | undefined
): ObjectMap {
  const nextMaterials = { ...materials };
  const material = { ...(nextMaterials[materialKey] ?? {}) };
  if (value === undefined || (typeof value === "string" && value.trim().length === 0)) {
    delete material[channel];
  } else {
    material[channel] = value;
  }
  nextMaterials[materialKey] = material;
  return nextMaterials;
}

export function patchModelBinding(
  models: ObjectMap,
  modelKey: string,
  slot: string,
  materialKey: string
): ObjectMap {
  const nextModels = { ...models };
  const model = { ...(nextModels[modelKey] ?? {}) };
  const bindings = isRecord(model.materialBindings)
    ? { ...(model.materialBindings as Record<string, unknown>) }
    : {};
  bindings[slot] = materialKey;
  model.materialBindings = bindings;
  nextModels[modelKey] = model;
  return nextModels;
}

export function getKnownModelSlots(models: ObjectMap, modelKey: string): string[] {
  const model = models[modelKey];
  if (!isRecord(model?.materialBindings)) return [];
  return Object.keys(model.materialBindings as Record<string, unknown>).sort();
}

export function getModelGeometryUrl(models: ObjectMap, modelKey: string): string | null {
  const model = models[modelKey];
  if (!isRecord(model)) return null;
  return typeof model.geometry === "string" && model.geometry.trim().length > 0
    ? model.geometry
    : null;
}

function materialNameForSlot(material: Material | undefined, fallbackName: string): string | null {
  if (!material) return fallbackName || null;
  const fromMaterial = material.name?.trim();
  if (fromMaterial) return fromMaterial;
  return fallbackName || null;
}

function slotNamesFromMesh(mesh: Mesh): string[] {
  const fallbackName = mesh.name?.trim() || "";
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const names: string[] = [];
  for (const material of materials) {
    const slotName = materialNameForSlot(material ?? undefined, fallbackName);
    if (slotName) names.push(slotName);
  }
  return names;
}

export async function discoverModelSlotsFromGeometry(geometryUrl: string): Promise<string[]> {
  const mod = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const loader = new mod.GLTFLoader();
  const gltf = await loader.loadAsync(geometryUrl);
  const slots = new Set<string>();
  gltf.scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    for (const slotName of slotNamesFromMesh(node)) slots.add(slotName);
  });
  return Array.from(slots).sort();
}

export function createMaterialsFromSlots(
  current: Model3dVariantDefaults,
  modelKey: string,
  slots: string[]
): Partial<Model3dVariantDefaults> {
  const materials: ObjectMap = isRecord(current.materials) ? (current.materials as ObjectMap) : {};
  const models: ObjectMap = isRecord(current.models) ? (current.models as ObjectMap) : {};
  const nextMaterials: ObjectMap = { ...materials };
  let nextModels: ObjectMap = { ...models };
  for (const slot of slots) {
    const materialKey = uniqueRecordKey(
      Object.keys(nextMaterials),
      `${toAssetKeyFromFileName(slot, "material")}Material`
    );
    const hasBoundMaterial =
      isRecord(nextModels[modelKey]?.materialBindings) &&
      typeof (nextModels[modelKey]?.materialBindings as Record<string, unknown>)[slot] === "string";
    if (!hasBoundMaterial) {
      nextMaterials[materialKey] = { roughness: 0.65, metallic: 0.1 };
      nextModels = patchModelBinding(nextModels, modelKey, slot, materialKey);
    }
  }
  return { models: nextModels, materials: nextMaterials };
}
