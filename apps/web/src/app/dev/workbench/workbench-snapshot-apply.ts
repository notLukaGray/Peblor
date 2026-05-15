import type { WorkbenchSessionV2 } from "@/app/dev/workbench/workbench-defaults";
import {
  dispatchWorkbenchSessionChanged,
  patchWorkbenchColors,
  patchWorkbenchElement,
  patchWorkbenchFonts,
  patchWorkbenchStyle,
} from "@/app/dev/workbench/workbench-session";

export const WORKBENCH_SNAPSHOT_LOAD_SCOPES = [
  "all",
  "colors",
  "fonts",
  "style",
  "elements",
] as const;

export type WorkbenchSnapshotLoadScope = (typeof WORKBENCH_SNAPSHOT_LOAD_SCOPES)[number];

export function parseWorkbenchSnapshotLoadScope(raw: string): WorkbenchSnapshotLoadScope | null {
  const normalized = raw.trim().toLowerCase();
  for (const scope of WORKBENCH_SNAPSHOT_LOAD_SCOPES) {
    if (normalized === scope) return scope;
  }
  return null;
}

export function applyWorkbenchSnapshotScope(
  snapshot: WorkbenchSessionV2,
  scope: Exclude<WorkbenchSnapshotLoadScope, "all">
): void {
  if (scope === "colors") {
    patchWorkbenchColors(snapshot.colors);
  } else if (scope === "fonts") {
    patchWorkbenchFonts(snapshot.fonts);
  } else if (scope === "style") {
    patchWorkbenchStyle(snapshot.style);
  } else {
    for (const key of Object.keys(snapshot.elements) as (keyof WorkbenchSessionV2["elements"])[]) {
      patchWorkbenchElement(key, snapshot.elements[key]);
    }
  }
  dispatchWorkbenchSessionChanged();
}
