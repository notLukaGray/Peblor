import type { WorkbenchSessionV2 } from "@/app/dev/workbench/workbench-defaults";

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function getWorkbenchSnapshotDiffKeys(
  current: WorkbenchSessionV2,
  snapshot: WorkbenchSessionV2
): string[] {
  const diffs: string[] = [];
  if (!sameJson(current.colors, snapshot.colors)) diffs.push("colors");
  if (!sameJson(current.fonts, snapshot.fonts)) diffs.push("fonts");
  if (!sameJson(current.style, snapshot.style)) diffs.push("style");
  for (const key of Object.keys(current.elements) as (keyof WorkbenchSessionV2["elements"])[]) {
    if (!sameJson(current.elements[key], snapshot.elements[key])) {
      diffs.push(`elements.${key}`);
    }
  }
  return diffs;
}
