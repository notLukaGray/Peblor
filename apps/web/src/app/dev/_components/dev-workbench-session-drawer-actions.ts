import type { ChangeEvent } from "react";
import { exportWorkbenchSessionJsonWithPromptedScope } from "@/app/dev/workbench/workbench-export-scope";
import { importWorkbenchSessionFromJsonWithPromptedScope } from "@/app/dev/workbench/workbench-import-scope";
import { importWorkbenchProductionDefaultsWithDiffPrompt } from "@/app/dev/workbench/workbench-production-import";

export type Flash = { kind: "success" | "error"; text: string } | null;
export const SESSION_DRAWER_STORAGE_KEY = "dev.workbench.sessionDrawerOpen.v1";

export function getInitialSessionDrawerState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SESSION_DRAWER_STORAGE_KEY) === "open";
  } catch {
    return false;
  }
}

export function exportSession(showFlash: (next: Flash) => void) {
  try {
    const result = exportWorkbenchSessionJsonWithPromptedScope();
    if (!result.ok) {
      showFlash({ kind: "error", text: result.error });
      return;
    }
    const blob = new Blob([result.text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
    showFlash({ kind: "success", text: `Session file saved (${result.scope})` });
  } catch {
    showFlash({ kind: "error", text: "Could not export file" });
  }
}

export function importProductionDefaults(showFlash: (next: Flash) => void) {
  const result = importWorkbenchProductionDefaultsWithDiffPrompt();
  if (!result.ok) {
    showFlash({ kind: "error", text: result.error });
    return;
  }
  showFlash({
    kind: "success",
    text:
      result.diffKeys.length === 0
        ? "Production defaults already match current session"
        : `Loaded production defaults (${result.diffKeys.length} changed slices)`,
  });
}

export function handleImportFileChange(
  event: ChangeEvent<HTMLInputElement>,
  showFlash: (next: Flash) => void
) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === "string" ? reader.result : "";
    const result = importWorkbenchSessionFromJsonWithPromptedScope(text);
    showFlash(
      result.ok
        ? { kind: "success", text: `Session imported (${result.scope})` }
        : { kind: "error", text: result.error }
    );
  };
  reader.onerror = () => showFlash({ kind: "error", text: "Could not read file" });
  reader.readAsText(file);
}
