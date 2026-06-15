import {
  applyImportedWorkbenchSession,
  dispatchWorkbenchSessionChanged,
  getWorkbenchSession,
  patchWorkbenchColors,
  patchWorkbenchElement,
  patchWorkbenchFonts,
  patchWorkbenchStyle,
} from "@/app/dev/workbench/workbench-session";
import { mergeWorkbenchSessionWithDefaults } from "@/app/dev/workbench/workbench-defaults";
import {
  parseImportedWorkbenchSessionJson,
  type WorkbenchSessionV2InFlight,
} from "@/app/dev/workbench/workbench-session-import";
import {
  parseWorkbenchSnapshotLoadScope,
  type WorkbenchSnapshotLoadScope,
} from "@/app/dev/workbench/workbench-snapshot-apply";
import { getWorkbenchSnapshotDiffKeys } from "@/app/dev/workbench/workbench-snapshot-diff";

type ScopeResult = { ok: true } | { ok: false; error: string };

function promptImportScopeRaw(): string | null {
  if (typeof window === "undefined") return "all";
  return window.prompt("Import scope: all, colors, fonts, style, elements", "all");
}

function confirmAllScopeImportOverwrite(diffKeys: string[]): boolean {
  if (typeof window === "undefined") return true;
  if (diffKeys.length === 0) return true;
  const diffLabel =
    diffKeys.length > 8 ? `${diffKeys.slice(0, 8).join(", ")}, ...` : diffKeys.join(", ");
  return window.confirm(`Import session (all slices)?\n\nThis will overwrite: ${diffLabel}`);
}

function importColors(session: WorkbenchSessionV2InFlight): ScopeResult {
  if (!session.colors) return { ok: false, error: "Import payload has no colors slice" };
  patchWorkbenchColors(session.colors);
  return { ok: true };
}

function importFonts(session: WorkbenchSessionV2InFlight): ScopeResult {
  if (!session.fonts) return { ok: false, error: "Import payload has no fonts slice" };
  patchWorkbenchFonts(session.fonts);
  return { ok: true };
}

function importStyle(session: WorkbenchSessionV2InFlight): ScopeResult {
  if (!session.style) return { ok: false, error: "Import payload has no style slice" };
  patchWorkbenchStyle(session.style);
  return { ok: true };
}

function importElements(session: WorkbenchSessionV2InFlight): ScopeResult {
  const elements = session.elements;
  if (!elements) return { ok: false, error: "Import payload has no elements slice" };
  const keys = Object.keys(elements) as (keyof NonNullable<typeof session.elements>)[];
  if (keys.length === 0) return { ok: false, error: "Import payload has no element entries" };
  for (const key of keys) {
    const value = elements[key];
    if (value) patchWorkbenchElement(key, value);
  }
  return { ok: true };
}

const IMPORT_BY_SCOPE: Record<
  Exclude<WorkbenchSnapshotLoadScope, "all">,
  (session: WorkbenchSessionV2InFlight) => ScopeResult
> = {
  colors: importColors,
  fonts: importFonts,
  style: importStyle,
  elements: importElements,
};

function importScopedSession(
  session: WorkbenchSessionV2InFlight,
  scope: Exclude<WorkbenchSnapshotLoadScope, "all">
): ScopeResult {
  const result = IMPORT_BY_SCOPE[scope](session);
  if (!result.ok) return result;
  dispatchWorkbenchSessionChanged();
  return { ok: true };
}

export function importWorkbenchSessionFromJsonWithPromptedScope(
  raw: string
): { ok: true; scope: WorkbenchSnapshotLoadScope } | { ok: false; error: string } {
  const parsed = parseImportedWorkbenchSessionJson(raw);
  if (!parsed.ok) return parsed;
  const rawScope = promptImportScopeRaw();
  if (rawScope === null) return { ok: false, error: "Import canceled" };
  const scope = parseWorkbenchSnapshotLoadScope(rawScope);
  if (!scope) return { ok: false, error: "Scope must be all, colors, fonts, style, or elements" };
  if (scope === "all") {
    const mergedImported = mergeWorkbenchSessionWithDefaults(parsed.session);
    const diffKeys = getWorkbenchSnapshotDiffKeys(getWorkbenchSession(), mergedImported);
    if (!confirmAllScopeImportOverwrite(diffKeys)) {
      return { ok: false, error: "Import canceled" };
    }
    applyImportedWorkbenchSession(parsed.session);
    return { ok: true, scope };
  }
  const result = importScopedSession(parsed.session, scope);
  return result.ok ? { ok: true, scope } : result;
}
