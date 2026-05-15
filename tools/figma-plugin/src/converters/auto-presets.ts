/**
 * Auto-promote repeated sibling structures into preset references.
 * Only applied when ctx.autoPresets is true.
 */

import type { ConversionContext, ExportResult } from "../types/figma-plugin";
import type { ElementBlock } from "../types/peblor";
import { ensureUniqueId, slugify } from "../utils/slugify";

const OVERRIDE_KEYS = new Set([
  "interactions",
  "motion",
  "motionTiming",
  "wrapperStyle",
  "style",
  "cursor",
  "text",
  "label",
  "href",
  "src",
  "alt",
  "ariaLabel",
  "value",
  "placeholder",
  "target",
  "rel",
  "className",
]);

export function autoPromotePresetsInSection(
  section: Record<string, unknown>,
  result: ExportResult,
  ctx: ConversionContext
): void {
  if (!ctx.autoPresets) return;
  autoPromoteInSectionLike(section, result, ctx);
}

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

function autoPromoteInSectionLike(
  section: Record<string, unknown>,
  result: ExportResult,
  ctx: ConversionContext
): void {
  const elements = section.elements;
  if (Array.isArray(elements)) {
    autoPromoteInElementArray(elements, result, ctx);
  }

  const collapsedElements = section.collapsedElements;
  if (Array.isArray(collapsedElements)) {
    autoPromoteInElementArray(collapsedElements, result, ctx);
  }

  const revealedElements = section.revealedElements;
  if (Array.isArray(revealedElements)) {
    autoPromoteInElementArray(revealedElements, result, ctx);
  }

  const definitions = section.definitions;
  if (definitions && typeof definitions === "object" && !Array.isArray(definitions)) {
    const elementOrder = Array.isArray(section.elementOrder)
      ? (section.elementOrder as string[])
      : null;
    autoPromoteInDefinitions(definitions as Record<string, unknown>, elementOrder, result, ctx);
  }
}

function autoPromoteInElementBlock(
  block: ElementBlock,
  result: ExportResult,
  ctx: ConversionContext
): void {
  if (!block || typeof block !== "object") return;
  const rec = block as Record<string, unknown>;
  const section = rec.section;
  if (section && typeof section === "object" && !Array.isArray(section)) {
    autoPromoteInSectionLike(section as Record<string, unknown>, result, ctx);
  }
}

function autoPromoteInElementArray(
  elements: unknown[],
  result: ExportResult,
  ctx: ConversionContext
): void {
  const working = [...elements];

  for (const el of working) {
    if (el && typeof el === "object") {
      autoPromoteInElementBlock(el as ElementBlock, result, ctx);
    }
  }

  const buckets = new Map<string, number[]>();
  for (let i = 0; i < working.length; i++) {
    const el = working[i];
    if (!isAutoPresetCandidate(el)) continue;
    const signature = signatureFor(el as Record<string, unknown>);
    const list = buckets.get(signature) ?? [];
    list.push(i);
    buckets.set(signature, list);
  }

  for (const indices of buckets.values()) {
    if (indices.length < 2) continue;
    const baseIndex = indices[0];
    const base = working[baseIndex] as Record<string, unknown> | undefined;
    if (!base) continue;
    const presetKey = buildPresetKey(base, ctx, result);
    if (!presetKey) continue;

    const presetBlock = cloneForPreset(base);
    result.presets[presetKey] = presetBlock;
    ctx.usedPresetKeys?.add(presetKey);

    for (const idx of indices) {
      const candidate = working[idx] as Record<string, unknown> | undefined;
      if (!candidate) continue;
      const override = buildPresetOverride(candidate, base, presetKey);
      if (!override) continue;
      working[idx] = override;
    }
  }

  elements.splice(0, elements.length, ...working);
}

function autoPromoteInDefinitions(
  definitions: Record<string, unknown>,
  elementOrder: string[] | null,
  result: ExportResult,
  ctx: ConversionContext
): void {
  const entries: Array<{ key: string; block: Record<string, unknown> }> = [];
  if (Array.isArray(elementOrder) && elementOrder.length > 0) {
    for (const key of elementOrder) {
      const block = definitions[key];
      if (block && typeof block === "object")
        entries.push({ key, block: block as Record<string, unknown> });
    }
  } else {
    for (const [key, block] of Object.entries(definitions)) {
      if (block && typeof block === "object")
        entries.push({ key, block: block as Record<string, unknown> });
    }
  }

  for (const entry of entries) {
    autoPromoteInElementBlock(entry.block as ElementBlock, result, ctx);
  }

  const buckets = new Map<string, Array<{ key: string; block: Record<string, unknown> }>>();
  for (const entry of entries) {
    if (!isAutoPresetCandidate(entry.block)) continue;
    const signature = signatureFor(entry.block);
    const list = buckets.get(signature) ?? [];
    list.push(entry);
    buckets.set(signature, list);
  }

  for (const group of buckets.values()) {
    if (group.length < 2) continue;
    const base = group[0]?.block;
    if (!base) continue;
    const presetKey = buildPresetKey(base, ctx, result);
    if (!presetKey) continue;

    const presetBlock = cloneForPreset(base);
    result.presets[presetKey] = presetBlock;
    ctx.usedPresetKeys?.add(presetKey);

    for (const entry of group) {
      const override = buildPresetOverride(entry.block, base, presetKey, entry.key);
      if (!override) continue;
      definitions[entry.key] = override;
    }
  }
}

// ---------------------------------------------------------------------------
// Signature + diff helpers
// ---------------------------------------------------------------------------

function isAutoPresetCandidate(
  value: unknown
): value is Record<string, unknown> & { type?: string } {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  if ("preset" in rec) return false;
  if (!("type" in rec)) return false;
  return (
    rec.type === "elementGroup" ||
    rec.section !== undefined ||
    rec.moduleConfig !== undefined ||
    rec.collapsedElements !== undefined ||
    rec.revealedElements !== undefined
  );
}

function signatureFor(block: Record<string, unknown>): string {
  return stableStringify(normalizeForSignature(block, 0));
}

function normalizeForSignature(value: unknown, depth: number): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForSignature(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const sectionDefinitions = normalizeSectionDefinitionsForSignature(rec, depth);
    if (sectionDefinitions) {
      return sectionDefinitions;
    }
    const out: Record<string, unknown> = {};
    const keys = Object.keys(rec).sort();
    for (const key of keys) {
      if (key === "id" || key === "name") continue;
      if (depth === 0 && OVERRIDE_KEYS.has(key)) {
        out[key] = "__override__";
        continue;
      }
      out[key] = normalizeForSignature(rec[key], depth + 1);
    }
    return out;
  }
  return value;
}

function normalizeSectionDefinitionsForSignature(
  rec: Record<string, unknown>,
  depth: number
): Record<string, unknown> | null {
  const definitions = rec.definitions;
  const elementOrder = rec.elementOrder;
  if (!definitions || typeof definitions !== "object" || Array.isArray(definitions)) return null;
  if (!Array.isArray(elementOrder)) return null;

  const definitionRecord = definitions as Record<string, unknown>;
  const orderedDefinitions: unknown[] = [];
  const seen = new Set<string>();

  for (const entry of elementOrder) {
    if (typeof entry !== "string" || !entry.trim()) continue;
    const block = definitionRecord[entry];
    if (!block || typeof block !== "object") continue;
    orderedDefinitions.push(normalizeForSignature(block, depth + 1));
    seen.add(entry);
  }

  const remainingKeys = Object.keys(definitionRecord)
    .filter((key) => !seen.has(key))
    .sort();
  for (const key of remainingKeys) {
    const block = definitionRecord[key];
    if (!block || typeof block !== "object") continue;
    orderedDefinitions.push(normalizeForSignature(block, depth + 1));
  }

  const out: Record<string, unknown> = {};
  const keys = Object.keys(rec).sort();
  for (const key of keys) {
    if (key === "id" || key === "name" || key === "elementOrder" || key === "definitions") continue;
    if (depth === 0 && OVERRIDE_KEYS.has(key)) {
      out[key] = "__override__";
      continue;
    }
    out[key] = normalizeForSignature(rec[key], depth + 1);
  }
  out.definitions = orderedDefinitions;
  return out;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(rec[key])}`);
  return `{${parts.join(",")}}`;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== (b as unknown[]).length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], (b as unknown[])[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const aRec = a as Record<string, unknown>;
  const bRec = b as Record<string, unknown>;
  const aKeys = Object.keys(aRec);
  const bKeys = Object.keys(bRec);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bRec, key)) return false;
    if (!deepEqual(aRec[key], bRec[key])) return false;
  }
  return true;
}

function cloneForPreset<T>(block: T): T {
  return JSON.parse(JSON.stringify(block)) as T;
}

function buildPresetKey(
  base: Record<string, unknown>,
  ctx: ConversionContext,
  result: ExportResult
): string | null {
  const baseId = typeof base.id === "string" && base.id.trim() ? base.id.trim() : "preset";
  const slug = slugify(baseId);
  const used = ctx.usedPresetKeys ?? new Set(Object.keys(result.presets));
  const key = ensureUniqueId(slug, used);
  ctx.usedPresetKeys = used;
  return key;
}

function buildPresetOverride(
  candidate: Record<string, unknown>,
  base: Record<string, unknown>,
  presetKey: string,
  fallbackId?: string
): Record<string, unknown> | null {
  const idValue =
    typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id.trim()
      : typeof fallbackId === "string" && fallbackId.trim()
        ? fallbackId.trim()
        : null;
  if (!idValue) return null;

  const override: Record<string, unknown> = { preset: presetKey, id: idValue };
  for (const key of OVERRIDE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(candidate, key)) continue;
    if (!deepEqual(candidate[key], base[key])) {
      override[key] = candidate[key];
    }
  }
  return override;
}
