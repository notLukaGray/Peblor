/**
 * Export target detection from Figma frame names.
 * Uses the "Prefix/Name" naming convention to determine what kind of peblor
 * artifact each frame maps to (page, preset, modal, module, global, etc.).
 * Parsing is shared with `@peblor/figma-bridge` (widget + tests).
 */

import type { ExportTarget, ExportTargetType } from "./types/figma-plugin";
import {
  getLayerPrefixDiagnostics,
  parseExportTargetFromLayerName,
} from "../../figma-bridge/src/export-target-parse";
import { slugify } from "./utils/slugify";
import { stripAnnotations } from "./converters/annotations-parse";

function splitPrefixName(name: string): { prefix: string; rest: string; hasSlash: boolean } {
  const slashIdx = name.indexOf("/");
  if (slashIdx < 0) {
    return { prefix: "", rest: name, hasSlash: false };
  }

  return {
    prefix: name.slice(0, slashIdx).trim().toLowerCase(),
    rest: name.slice(slashIdx + 1).trim(),
    hasSlash: true,
  };
}

function parsedToExportTarget(
  parsed: ReturnType<typeof parseExportTargetFromLayerName>
): ExportTarget {
  const base: ExportTarget = {
    type: parsed.kind,
    key: parsed.key,
    label: parsed.label,
  };
  if (parsed.responsiveRole) {
    (base as ExportTarget).responsiveRole = parsed.responsiveRole;
  }
  return base;
}

/**
 * Determines the export target for a Figma node based on its name prefix.
 * Uses the "/" naming convention: "Section/Hero Dark" → preset with key "hero-dark".
 * Falls back to "page" for frames with no recognized prefix.
 */
export function detectExportTarget(
  node: FrameNode | ComponentNode | ComponentSetNode
): ExportTarget {
  return parsedToExportTarget(parseExportTargetFromLayerName(node.name || "untitled"));
}

/**
 * Returns non-fatal prefix diagnostics for slash-based names.
 * These are warnings only; export target resolution still falls back to "page".
 */
export function getPrefixDiagnostics(node: FrameNode | ComponentNode | ComponentSetNode): string[] {
  return getLayerPrefixDiagnostics(node.name || "").map((m) => `[prefix] ${m}`);
}

/**
 * Maps a dropdown string value (from the UI override) back to an ExportTarget.
 */
export function parseTargetOverride(value: string, frame: FrameNode): ExportTarget {
  const name = stripAnnotations(frame.name || "untitled");
  const { rest } = splitPrefixName(name);
  const key = slugify(rest || name);
  const label = rest || name;

  const typeMap: Record<string, ExportTargetType> = {
    page: "page",
    preset: "preset",
    modal: "modal",
    module: "module",
    button: "global-button",
    background: "global-background",
    global: "global-element",
    skip: "skip",
  };

  const resolvedType = typeMap[value.toLowerCase()] ?? "page";
  return { type: resolvedType, key, label };
}
