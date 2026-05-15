import { isRecord } from "@/app/dev/elements/_shared/asset-input-utils";
import { STARTER_SCENE } from "./model3d-starters";

export type ObjectMap = Record<string, Record<string, unknown>>;

export function asObjectMap(value: unknown): ObjectMap {
  if (!isRecord(value)) return {};
  const next: ObjectMap = {};
  for (const [key, entry] of Object.entries(value)) {
    next[key] = isRecord(entry) ? { ...entry } : {};
  }
  return next;
}

function cloneStarterScene(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(STARTER_SCENE)) as Record<string, unknown>;
}

export function ensureSceneRecord(value: unknown): Record<string, unknown> {
  const scene = isRecord(value) ? { ...value } : cloneStarterScene();
  if (!isRecord(scene.camera)) scene.camera = cloneStarterScene().camera;
  const contents = isRecord(scene.contents) ? { ...scene.contents } : {};
  contents.models = Array.isArray(contents.models) ? [...contents.models] : [];
  scene.contents = contents;
  return scene;
}

export function ensureModelInstance(scene: Record<string, unknown>, modelKey: string) {
  const contents = isRecord(scene.contents) ? { ...scene.contents } : {};
  const entries = Array.isArray(contents.models) ? [...contents.models] : [];
  const hasInstance = entries.some((entry) => isRecord(entry) && entry.model === modelKey);
  if (!hasInstance) {
    entries.push({ model: modelKey, position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 });
  }
  contents.models = entries;
  scene.contents = contents;
}

export function bindFirstModelMaterial(
  models: ObjectMap,
  materialKey: string,
  scene: Record<string, unknown>
) {
  const modelKey = Object.keys(models)[0];
  if (!modelKey) return;
  const modelDef = models[modelKey] ?? {};
  const bindings = isRecord(modelDef.materialBindings)
    ? (modelDef.materialBindings as Record<string, unknown>)
    : {};
  models[modelKey] = {
    ...modelDef,
    materialBindings: Object.keys(bindings).length > 0 ? bindings : { Default: materialKey },
  };
  ensureModelInstance(scene, modelKey);
}
