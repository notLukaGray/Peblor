/**
 * Shared structural heuristics for layout inference and repeated-shape warnings.
 */

import type { ElementBlock } from "../types/peblor";
import {
  isVisibleNode,
  isFrameNode,
  isGroupNode,
  isComponentNode,
  isInstanceNode,
} from "@figma-plugin/helpers";

export function getVisibleChildren<T extends SceneNode>(children: readonly T[]): T[] {
  return children.filter((child) => {
    try {
      return isVisibleNode(child);
    } catch {
      return child.visible !== false;
    }
  });
}

export function isContainerNode(
  node: SceneNode
): node is FrameNode | GroupNode | ComponentNode | InstanceNode {
  return isFrameNode(node) || isGroupNode(node) || isComponentNode(node) || isInstanceNode(node);
}

export function nodeArea(node: { width?: number; height?: number }): number {
  return Math.max(0, node.width ?? 0) * Math.max(0, node.height ?? 0);
}

function structuralValue(value: unknown, depth = 0): string {
  if (value == null) return "null";
  if (depth > 4) return "…";
  if (Array.isArray(value))
    return `[${value.map((item) => structuralValue(item, depth + 1)).join(",")}]`;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec)
      .filter((key) => key !== "id" && key !== "name")
      .sort();
    return `{${keys.map((key) => `${key}:${structuralValue(rec[key], depth + 1)}`).join(",")}}`;
  }
  return typeof value;
}

export function structuralSignature(block: ElementBlock): string {
  return structuralValue(block);
}

function isStructureCandidate(block: ElementBlock): boolean {
  const rec = block as Record<string, unknown>;
  return (
    block.type === "elementGroup" ||
    rec.section !== undefined ||
    rec.moduleConfig !== undefined ||
    rec.collapsedElements !== undefined ||
    rec.revealedElements !== undefined
  );
}

export function warnRepeatedStructuralSignatures(
  owner: string,
  blocks: readonly ElementBlock[],
  warnings: string[],
  label: string,
  options?: { suppress?: boolean }
): void {
  if (options?.suppress) return;
  const buckets = new Map<string, { count: number; sampleType: string; ids: string[] }>();
  for (const block of blocks) {
    if (!isStructureCandidate(block)) continue;
    const signature = structuralSignature(block);
    const bucket = buckets.get(signature) ?? { count: 0, sampleType: block.type, ids: [] };
    bucket.count += 1;
    const blockId = (block as ElementBlock & { id?: string }).id;
    if (blockId) bucket.ids.push(blockId);
    buckets.set(signature, bucket);
  }

  for (const { count, sampleType, ids } of buckets.values()) {
    if (count < 2) continue;
    const idList = ids.length > 0 ? ` (${ids.join(", ")})` : "";
    warnings.push(
      `[structure] "${owner}" has ${count} repeated ${sampleType} ${label}${idList}; consider promoting to a preset or module`
    );
  }
}
