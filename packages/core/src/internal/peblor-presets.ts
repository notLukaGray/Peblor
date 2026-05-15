import type { PeblorDefinitionBlock } from "@pb/contracts";

/** True if block has a preset reference. */
export function isPresetRef(block: unknown): block is Record<string, unknown> & { preset: string } {
  return (
    block != null &&
    typeof block === "object" &&
    "preset" in block &&
    typeof (block as { preset: unknown }).preset === "string"
  );
}

/** Look up preset by key. Returns null if not found. */
export function resolvePresetRef(
  refKey: string,
  presets: Record<string, PeblorDefinitionBlock>
): PeblorDefinitionBlock | null {
  const preset = presets[refKey];
  return preset && typeof preset === "object" ? preset : null;
}

/** Merge preset with local block. Local overrides preset. */
export function mergePresetIntoBlock(
  base: Record<string, unknown>,
  preset: PeblorDefinitionBlock
): PeblorDefinitionBlock {
  const { preset: _p, ...localProps } = base;
  return { ...preset, ...localProps } as PeblorDefinitionBlock;
}

function resolvePresetsDeep(
  block: unknown,
  presets: Record<string, PeblorDefinitionBlock>,
  visited: Set<string>
): PeblorDefinitionBlock {
  if (block == null || typeof block !== "object") {
    return block as PeblorDefinitionBlock;
  }

  const obj = block as Record<string, unknown>;

  if (isPresetRef(obj)) {
    const presetName = obj.preset;
    if (visited.has(presetName)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[peblor] Circular preset reference detected: "${presetName}"`);
      }
      const { preset: _p, ...rest } = obj;
      return rest as PeblorDefinitionBlock;
    }

    const preset = resolvePresetRef(presetName, presets);
    if (!preset) {
      const { preset: _p, ...rest } = obj;
      return rest as PeblorDefinitionBlock;
    }

    const presetType = (preset as { type?: string }).type;
    const localType = obj.type;
    if (presetType && localType && presetType !== localType) {
      const { preset: _p, ...rest } = obj;
      return rest as PeblorDefinitionBlock;
    }

    const merged = mergePresetIntoBlock(obj, preset);
    visited.add(presetName);
    const resolved = resolvePresetsDeep(merged as Record<string, unknown>, presets, visited);
    visited.delete(presetName);
    return resolved;
  }

  const hasNested = Object.values(obj).some(
    (v) => v != null && (Array.isArray(v) || typeof v === "object")
  );
  if (!hasNested) return block as PeblorDefinitionBlock;

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) {
      resolved[key] = value;
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((item) => resolvePresetsDeep(item, presets, visited));
    } else if (typeof value === "object") {
      resolved[key] = resolvePresetsDeep(value, presets, visited);
    } else {
      resolved[key] = value;
    }
  }

  return resolved as PeblorDefinitionBlock;
}

/** Resolve preset references recursively. Handles circular references and type validation. */
export function resolvePresets(
  block: unknown,
  presets: Record<string, PeblorDefinitionBlock>,
  visited = new Set<string>()
): PeblorDefinitionBlock {
  return resolvePresetsDeep(block, presets, visited);
}
