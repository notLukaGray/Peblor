import type { PeblorDefinitionBlock } from "@pb/contracts";
import { nearestMatch } from "./near-match";

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

/** Deep-merge nested elementGroup `section` (definitions + elementOrder). */
export function mergeElementSection(
  presetSection: unknown,
  localSection: unknown
): Record<string, unknown> {
  if (presetSection == null || typeof presetSection !== "object") {
    return (localSection ?? {}) as Record<string, unknown>;
  }
  if (localSection == null || typeof localSection !== "object") {
    return presetSection as Record<string, unknown>;
  }

  const preset = presetSection as Record<string, unknown>;
  const local = localSection as Record<string, unknown>;
  const presetDefs =
    preset.definitions != null && typeof preset.definitions === "object"
      ? (preset.definitions as Record<string, unknown>)
      : {};
  const localDefs =
    local.definitions != null && typeof local.definitions === "object"
      ? (local.definitions as Record<string, unknown>)
      : {};

  return {
    ...preset,
    ...local,
    elementOrder: local.elementOrder ?? preset.elementOrder,
    definitions: mergeBlockDefinitions(presetDefs, localDefs),
  };
}

/** Recursively deep-merge two definition dictionaries so local overrides don't lose preset `type` fields. */
function mergeBlockDefinitions(
  presetDefs: Record<string, unknown>,
  localDefs: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...presetDefs };
  for (const [key, value] of Object.entries(localDefs)) {
    if (
      key in merged &&
      merged[key] != null &&
      typeof merged[key] === "object" &&
      !Array.isArray(merged[key]) &&
      value != null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const localHasPreset = "preset" in (value as Record<string, unknown>);
      if (localHasPreset) {
        merged[key] = value;
      } else {
        const presetVal = merged[key] as Record<string, unknown>;
        const localVal = value as Record<string, unknown>;
        const result: Record<string, unknown> = { ...presetVal, ...localVal };

        if ("section" in presetVal && "section" in localVal) {
          result.section = mergeElementSection(presetVal.section, localVal.section);
        }
        if ("definitions" in presetVal && "definitions" in localVal) {
          result.definitions = mergeBlockDefinitions(
            presetVal.definitions as Record<string, unknown>,
            localVal.definitions as Record<string, unknown>
          );
        }
        // Merge elements arrays: local appends to preset rather than clobbering.
        if (
          Array.isArray(presetVal.elements) &&
          Array.isArray(localVal.elements) &&
          localVal.elements.length > 0
        ) {
          result.elements = [
            ...(presetVal.elements as unknown[]),
            ...(localVal.elements as unknown[]),
          ];
        }

        merged[key] = result;
      }
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

/** Merge preset with local block. Local overrides preset. */
export function mergePresetIntoBlock(
  base: Record<string, unknown>,
  preset: PeblorDefinitionBlock
): PeblorDefinitionBlock {
  const { preset: _p, ...localProps } = base;
  const merged = { ...preset, ...localProps } as Record<string, unknown>;

  if (
    preset != null &&
    typeof preset === "object" &&
    "definitions" in preset &&
    localProps.definitions != null &&
    typeof localProps.definitions === "object" &&
    !Array.isArray(localProps.definitions)
  ) {
    merged.definitions = mergeBlockDefinitions(
      (preset as Record<string, unknown>).definitions as Record<string, unknown>,
      localProps.definitions as Record<string, unknown>
    );
  }

  if (
    preset != null &&
    typeof preset === "object" &&
    "section" in preset &&
    localProps.section != null &&
    typeof localProps.section === "object"
  ) {
    merged.section = mergeElementSection(
      (preset as Record<string, unknown>).section,
      localProps.section
    );
  }

  return merged as PeblorDefinitionBlock;
}

function resolvePresetsDeep(
  block: unknown,
  presets: Record<string, PeblorDefinitionBlock>,
  visited: Set<string>
): PeblorDefinitionBlock {
  if (block == null || typeof block !== "object") {
    return block as PeblorDefinitionBlock;
  }

  // Early return when no presets to resolve — definitions are already final.
  // Still check for dangling preset refs: if the block references a preset but none
  // are available, it's an error that must surface rather than silently pass through.
  if (Object.keys(presets).length === 0) {
    const obj = block as Record<string, unknown>;
    if (isPresetRef(obj)) {
      throw new Error(
        `[peblor] Preset "${obj.preset}" not found. Check that the preset file exists ` +
          `under content/presets/ and is listed in the page's presets array (K-14).`
      );
    }
    return block as PeblorDefinitionBlock;
  }

  const obj = block as Record<string, unknown>;

  if (isPresetRef(obj)) {
    const presetName = obj.preset;
    if (visited.has(presetName)) {
      throw new Error(
        `[peblor] Circular preset reference detected: "${presetName}". ` +
          `Cycle: ${Array.from(visited).join(" -> ")} -> ${presetName} (K-14).`
      );
    }

    const preset = resolvePresetRef(presetName, presets);
    if (!preset) {
      const suggestion = nearestMatch(presetName, Object.keys(presets));
      const didYouMean = suggestion ? ` Did you mean "${suggestion}"?` : "";
      throw new Error(
        `[peblor] Preset "${presetName}" not found.${didYouMean} Check that the preset file exists ` +
          `under content/presets/ and is listed in the page's presets array (K-14).`
      );
    }

    const presetType = (preset as { type?: string }).type;
    const localType = obj.type;
    if (presetType && localType && presetType !== localType) {
      throw new Error(
        `[peblor] Preset type mismatch: "${presetName}" has type "${presetType}" but ` +
          `the local block expects type "${localType}" (K-14).`
      );
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
      // Skip actionPayload and payload — they hold arbitrary action handler data (e.g.
      // Three.js camera presets) that can contain a `preset` field unrelated to peblor.
      resolved[key] =
        key === "actionPayload" || key === "payload"
          ? value
          : resolvePresetsDeep(value, presets, visited);
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
