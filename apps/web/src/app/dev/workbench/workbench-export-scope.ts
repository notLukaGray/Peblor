import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import {
  parseWorkbenchSnapshotLoadScope,
  type WorkbenchSnapshotLoadScope,
} from "@/app/dev/workbench/workbench-snapshot-apply";

function promptExportScopeRaw(): string | null {
  if (typeof window === "undefined") return "all";
  return window.prompt("Export scope: all, colors, fonts, style, elements", "all");
}

function fileNameForScope(scope: WorkbenchSnapshotLoadScope): string {
  return scope === "all" ? "workbench-session.json" : `workbench-session-${scope}.json`;
}

export function exportWorkbenchSessionJsonWithPromptedScope():
  | { ok: true; text: string; scope: WorkbenchSnapshotLoadScope; fileName: string }
  | { ok: false; error: string } {
  const rawScope = promptExportScopeRaw();
  if (rawScope === null) return { ok: false, error: "Export canceled" };
  const scope = parseWorkbenchSnapshotLoadScope(rawScope);
  if (!scope) return { ok: false, error: "Scope must be all, colors, fonts, style, or elements" };
  const session = getWorkbenchSession();
  const payload =
    scope === "all"
      ? session
      : scope === "colors"
        ? { v: 2, colors: session.colors }
        : scope === "fonts"
          ? { v: 2, fonts: session.fonts }
          : scope === "style"
            ? { v: 2, style: session.style }
            : { v: 2, elements: session.elements };
  return {
    ok: true,
    text: JSON.stringify(payload, null, 2),
    scope,
    fileName: fileNameForScope(scope),
  };
}
