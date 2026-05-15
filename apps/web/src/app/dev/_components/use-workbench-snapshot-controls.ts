"use client";

import { useCallback, useMemo, useState } from "react";
import {
  applyImportedWorkbenchSession,
  getWorkbenchSession,
} from "@/app/dev/workbench/workbench-session";
import {
  applyWorkbenchSnapshotScope,
  parseWorkbenchSnapshotLoadScope,
  type WorkbenchSnapshotLoadScope,
} from "@/app/dev/workbench/workbench-snapshot-apply";
import { getWorkbenchSnapshotDiffKeys } from "@/app/dev/workbench/workbench-snapshot-diff";
import {
  deleteWorkbenchSnapshot,
  listWorkbenchSnapshots,
  saveWorkbenchSnapshot,
  type WorkbenchSessionSnapshot,
} from "@/app/dev/workbench/workbench-snapshot-storage";

type Flash = { kind: "success" | "error"; text: string };

type UseWorkbenchSnapshotControlsArgs = {
  showFlash: (next: Flash) => void;
};

type UseWorkbenchSnapshotControlsResult = {
  snapshots: WorkbenchSessionSnapshot[];
  selectedSnapshotId: string;
  setSelectedSnapshotId: (id: string) => void;
  snapshotName: string;
  setSnapshotName: (name: string) => void;
  snapshotDiffKeys: string[];
  onSaveSnapshot: () => void;
  onLoadSnapshot: () => void;
  onDeleteSnapshot: () => void;
};

function requestLoadScopeRaw(): string | null {
  if (typeof window === "undefined") return "all";
  return window.prompt("Load scope: all, colors, fonts, style, elements", "all");
}

function requestSaveScopeRaw(initialScope: WorkbenchSnapshotLoadScope): string | null {
  if (typeof window === "undefined") return initialScope;
  return window.prompt("Save scope: all, colors, fonts, style, elements", initialScope);
}

function getScopedDiffKeys(diffKeys: string[], scope: WorkbenchSnapshotLoadScope): string[] {
  if (scope === "all") return diffKeys;
  const prefix = scope === "elements" ? "elements." : `${scope}`;
  return diffKeys.filter((key) => key === prefix || key.startsWith(prefix));
}

function confirmScopedSnapshotLoad(scope: WorkbenchSnapshotLoadScope, diffKeys: string[]): boolean {
  if (typeof window === "undefined") return true;
  if (diffKeys.length === 0) return true;
  const diffLabel =
    diffKeys.length > 8 ? `${diffKeys.slice(0, 8).join(", ")}, …` : diffKeys.join(", ");
  return window.confirm(`Load snapshot scope "${scope}"?\n\nThis will overwrite: ${diffLabel}`);
}

export function useWorkbenchSnapshotControls({
  showFlash,
}: UseWorkbenchSnapshotControlsArgs): UseWorkbenchSnapshotControlsResult {
  const [snapshots, setSnapshots] = useState<WorkbenchSessionSnapshot[]>(() =>
    listWorkbenchSnapshots()
  );
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(() => snapshots[0]?.id ?? "");
  const [snapshotName, setSnapshotName] = useState("Snapshot");
  const selectedSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === selectedSnapshotId),
    [selectedSnapshotId, snapshots]
  );
  const snapshotDiffKeys = useMemo(() => {
    if (!selectedSnapshot) return [];
    const fullDiffKeys = getWorkbenchSnapshotDiffKeys(
      getWorkbenchSession(),
      selectedSnapshot.session
    );
    return getScopedDiffKeys(fullDiffKeys, selectedSnapshot.scope);
  }, [selectedSnapshot]);

  const refreshSnapshots = useCallback(() => {
    const next = listWorkbenchSnapshots();
    setSnapshots(next);
    setSelectedSnapshotId((current) =>
      next.some((snapshot) => snapshot.id === current) ? current : (next[0]?.id ?? "")
    );
  }, []);

  const onSaveSnapshot = useCallback(() => {
    const rawScope = requestSaveScopeRaw(selectedSnapshot?.scope ?? "all");
    if (rawScope === null) return;
    const scope = parseWorkbenchSnapshotLoadScope(rawScope);
    if (!scope) {
      showFlash({ kind: "error", text: "Scope must be all, colors, fonts, style, or elements" });
      return;
    }
    const result = saveWorkbenchSnapshot(
      getWorkbenchSession(),
      snapshotName,
      selectedSnapshotId,
      scope
    );
    if (!result.ok) {
      showFlash({ kind: "error", text: result.error });
      return;
    }
    setSnapshotName(result.snapshot.name);
    refreshSnapshots();
    setSelectedSnapshotId(result.snapshot.id);
    showFlash({
      kind: "success",
      text: `Saved "${result.snapshot.name}" (${result.snapshot.scope})`,
    });
  }, [refreshSnapshots, selectedSnapshot, selectedSnapshotId, showFlash, snapshotName]);

  const onLoadSnapshot = useCallback(() => {
    if (!selectedSnapshotId) {
      showFlash({ kind: "error", text: "Choose a snapshot first" });
      return;
    }
    const selected = snapshots.find((snapshot) => snapshot.id === selectedSnapshotId);
    if (!selected) {
      showFlash({ kind: "error", text: "Snapshot not found" });
      return;
    }
    let scope: WorkbenchSnapshotLoadScope = selected.scope;
    if (scope === "all") {
      const rawScope = requestLoadScopeRaw();
      if (rawScope === null) return;
      const parsedScope = parseWorkbenchSnapshotLoadScope(rawScope);
      if (!parsedScope) {
        showFlash({ kind: "error", text: "Scope must be all, colors, fonts, style, or elements" });
        return;
      }
      scope = parsedScope;
    }
    const diffKeys = getScopedDiffKeys(
      getWorkbenchSnapshotDiffKeys(getWorkbenchSession(), selected.session),
      scope
    );
    if (!confirmScopedSnapshotLoad(scope, diffKeys)) {
      showFlash({ kind: "error", text: "Snapshot load canceled" });
      return;
    }
    if (scope === "all") {
      applyImportedWorkbenchSession(selected.session);
      showFlash({ kind: "success", text: "Snapshot loaded (all slices)" });
      return;
    }
    applyWorkbenchSnapshotScope(selected.session, scope);
    showFlash({ kind: "success", text: `Snapshot loaded (${scope})` });
  }, [selectedSnapshotId, showFlash, snapshots]);

  const onDeleteSnapshot = useCallback(() => {
    if (!selectedSnapshotId) {
      showFlash({ kind: "error", text: "Choose a snapshot first" });
      return;
    }
    const result = deleteWorkbenchSnapshot(selectedSnapshotId);
    if (!result.ok) {
      showFlash({ kind: "error", text: result.error });
      return;
    }
    refreshSnapshots();
    showFlash({ kind: "success", text: "Snapshot deleted" });
  }, [refreshSnapshots, selectedSnapshotId, showFlash]);

  return {
    snapshots,
    selectedSnapshotId,
    setSelectedSnapshotId,
    snapshotName,
    setSnapshotName,
    snapshotDiffKeys,
    onSaveSnapshot,
    onLoadSnapshot,
    onDeleteSnapshot,
  };
}
