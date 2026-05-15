import { getProductionWorkbenchSession } from "@/app/dev/workbench/workbench-defaults";
import { getWorkbenchSnapshotDiffKeys } from "@/app/dev/workbench/workbench-snapshot-diff";
import {
  applyImportedWorkbenchSession,
  getWorkbenchSession,
} from "@/app/dev/workbench/workbench-session";

function confirmProductionImport(diffKeys: string[]): boolean {
  if (typeof window === "undefined") return true;
  if (diffKeys.length === 0) return true;
  const diffLabel =
    diffKeys.length > 8 ? `${diffKeys.slice(0, 8).join(", ")}, ...` : diffKeys.join(", ");
  return window.confirm(`Import production defaults?\n\nThis will overwrite: ${diffLabel}`);
}

export function importWorkbenchProductionDefaultsWithDiffPrompt():
  | { ok: true; diffKeys: string[] }
  | { ok: false; error: string } {
  const production = getProductionWorkbenchSession();
  const diffKeys = getWorkbenchSnapshotDiffKeys(getWorkbenchSession(), production);
  if (!confirmProductionImport(diffKeys)) return { ok: false, error: "Import canceled" };
  applyImportedWorkbenchSession(production);
  return { ok: true, diffKeys };
}
