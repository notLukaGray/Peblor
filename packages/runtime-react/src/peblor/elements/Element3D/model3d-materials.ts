import {
  ClampToEdgeWrapping,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  type Object3D,
  SRGBColorSpace,
  type Texture,
  VideoTexture,
} from "three";
import type { MaterialDef, TextureDef } from "@pb/contracts/types";

type MaterialSlotProp =
  | "map"
  | "normalMap"
  | "emissiveMap"
  | "roughnessMap"
  | "metalnessMap"
  | "aoMap";
type LiteralProp = "roughness" | "metalness";

const MATERIAL_SLOT_MAP: Array<{
  key: keyof MaterialDef;
  prop: MaterialSlotProp;
  literalProp?: LiteralProp;
}> = [
  { key: "albedo", prop: "map" },
  { key: "normal", prop: "normalMap" },
  { key: "emissive", prop: "emissiveMap" },
  { key: "roughness", prop: "roughnessMap", literalProp: "roughness" },
  { key: "metallic", prop: "metalnessMap", literalProp: "metalness" },
  { key: "ao", prop: "aoMap" },
];

function isAlphaMapTexture(
  textureKey: string,
  textures: Record<string, TextureDef> | undefined
): boolean {
  return (
    !!textures?.[textureKey] &&
    (textures[textureKey] as { useAsAlphaMap?: boolean }).useAsAlphaMap === true
  );
}

function applyEmissiveOverlay(
  mat: MeshStandardMaterial,
  emissiveTex: Texture,
  isVideo: boolean
): void {
  emissiveTex.flipY = false;
  mat.metalnessMap = null;
  mat.roughnessMap = null;
  mat.aoMap = null;
  mat.normalMap = null;
  mat.map = emissiveTex;
  mat.alphaMap = emissiveTex;
  mat.transparent = true;
  mat.alphaTest = 0.01;
  mat.color.setHex(0xffffff);
  mat.metalness = 0;
  mat.roughness = 0;
  mat.aoMapIntensity = 0;
  emissiveTex.wrapS = emissiveTex.wrapT = ClampToEdgeWrapping;
  if (isVideo) {
    (emissiveTex as VideoTexture).generateMipmaps = false;
    (emissiveTex as VideoTexture).needsUpdate = true;
  }
  mat.emissiveMap = null;
  mat.emissive.setHex(0x000000);
  mat.emissiveIntensity = 0;
  mat.needsUpdate = true;
}

function applySlot(
  mat: MeshStandardMaterial,
  prop: MaterialSlotProp,
  literalProp: LiteralProp | undefined,
  value: unknown,
  getTex: (key: string) => Texture | undefined
): void {
  if (value === undefined) return;
  if (literalProp && typeof value === "number") {
    if (literalProp === "roughness") mat.roughness = value;
    else if (literalProp === "metalness") mat.metalness = value;
    return;
  }
  const tex = getTex(value as string);
  if (!tex) return;
  tex.flipY = false;
  tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
  const slotSetters: Record<MaterialSlotProp, () => void> = {
    normalMap: () => {
      mat.normalMap = tex;
      mat.normalScale.set(1, 1);
    },
    emissiveMap: () => {
      tex.colorSpace = SRGBColorSpace;
      mat.emissiveMap = tex;
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 1;
      if (tex instanceof VideoTexture) tex.generateMipmaps = false;
    },
    map: () => {
      tex.colorSpace = SRGBColorSpace;
      mat.map = tex;
    },
    roughnessMap: () => {
      tex.colorSpace = NoColorSpace;
      mat.roughnessMap = tex;
    },
    metalnessMap: () => {
      tex.colorSpace = NoColorSpace;
      mat.metalnessMap = tex;
    },
    aoMap: () => {
      tex.colorSpace = NoColorSpace;
      mat.aoMap = tex;
      mat.aoMapIntensity = 1;
    },
  };
  const setter = slotSetters[prop];
  if (setter) setter();
}

export function applyMaterialsToScene(
  scene: Object3D,
  materialBindings: Record<string, string> | undefined,
  materials: Record<string, MaterialDef> | undefined,
  textures: Record<string, TextureDef> | undefined,
  textureMap: Map<string, Texture>
): void {
  if (!materialBindings || !materials) return;
  const getTex = (slot: string | number | undefined) =>
    typeof slot === "string" ? textureMap.get(slot) : undefined;

  scene.traverse((child) => {
    if (!(child instanceof Mesh) || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!(mat instanceof MeshStandardMaterial)) continue;
      const materialKey = materialBindings[mat.name];
      if (!materialKey) continue;
      const def = materials[materialKey];
      if (!def) continue;

      const emissiveSlotKey = typeof def.emissive === "string" ? def.emissive : undefined;
      const emissiveTex = getTex(def.emissive);
      const isEmissiveOverlayStyle =
        emissiveTex &&
        emissiveSlotKey &&
        !def.albedo &&
        (isAlphaMapTexture(emissiveSlotKey, textures) || emissiveTex instanceof VideoTexture);

      if (isEmissiveOverlayStyle) {
        applyEmissiveOverlay(mat, emissiveTex, emissiveTex instanceof VideoTexture);
        continue;
      }

      for (const { key, prop, literalProp } of MATERIAL_SLOT_MAP) {
        const value = def[key];
        applySlot(mat, prop, literalProp, value, getTex as (key: string) => Texture | undefined);
      }
      mat.needsUpdate = true;
    }
  });
}
