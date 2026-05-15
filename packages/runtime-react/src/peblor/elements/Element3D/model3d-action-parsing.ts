import type { Model3DCameraPreset, Vec3Tuple } from "./model3d-controls";

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function readPayloadObject(payload: unknown): Record<string, unknown> | null {
  return readRecord(payload);
}

export function readTargetId(payload: unknown): string | null {
  const payloadObj = readRecord(payload);
  if (!payloadObj) return null;

  const direct =
    typeof payloadObj.id === "string"
      ? payloadObj.id
      : typeof payloadObj.targetId === "string"
        ? payloadObj.targetId
        : typeof payloadObj.target === "string"
          ? payloadObj.target
          : undefined;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const targetObj = readRecord(payloadObj.target);
  if (targetObj && typeof targetObj.id === "string" && targetObj.id.trim()) {
    return targetObj.id.trim();
  }
  return null;
}

export function matchesTargetId(elementId: string | undefined, targetId: string): boolean {
  if (!elementId) return false;
  if (elementId === targetId) return true;
  return elementId.endsWith(`:${targetId}`);
}

export function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return undefined;

  const s = value.trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  return undefined;
}

function parseVec3(value: unknown): Vec3Tuple | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const x = parseNumber(value[0]);
  const y = parseNumber(value[1]);
  const z = parseNumber(value[2]);
  if (x == null || y == null || z == null) return undefined;
  return [x, y, z];
}

export function parseCameraPreset(value: unknown): Model3DCameraPreset | null {
  const obj = readRecord(value);
  if (!obj) return null;

  const preset: Model3DCameraPreset = {};
  const position = parseVec3(obj.position);
  const lookAt = parseVec3(obj.lookAt);
  const fov = parseNumber(obj.fov);
  const near = parseNumber(obj.near);
  const far = parseNumber(obj.far);

  if (position) preset.position = position;
  if (lookAt) preset.lookAt = lookAt;
  if (fov != null) preset.fov = fov;
  if (near != null) preset.near = near;
  if (far != null) preset.far = far;

  return Object.keys(preset).length ? preset : null;
}

export function parseCameraPresetList(value: unknown): Model3DCameraPreset[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseCameraPreset).filter((v): v is Model3DCameraPreset => v != null);
}
