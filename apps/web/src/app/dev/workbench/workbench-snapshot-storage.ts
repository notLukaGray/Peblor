import type { WorkbenchSessionV2 } from "@/app/dev/workbench/workbench-defaults";
import {
  parseImportedWorkbenchSessionJson,
  type WorkbenchSessionV2InFlight,
} from "@/app/dev/workbench/workbench-session-import";
import {
  parseWorkbenchSnapshotLoadScope,
  type WorkbenchSnapshotLoadScope,
} from "@/app/dev/workbench/workbench-snapshot-apply";

export const WORKBENCH_SESSION_SNAPSHOTS_KEY = "workbench-session-snapshots-v1";

export type WorkbenchSessionSnapshot = {
  id: string;
  name: string;
  scope: WorkbenchSnapshotLoadScope;
  updatedAt: string;
  session: WorkbenchSessionV2;
};

type SnapshotStore = {
  v: 1;
  snapshots: WorkbenchSessionSnapshot[];
};

function defaultStore(): SnapshotStore {
  return { v: 1, snapshots: [] };
}

type SnapshotRecordInStorage = {
  id: string;
  name: string;
  scope?: unknown;
  updatedAt: string;
  session: unknown;
};

function normalizeSnapshotScope(scope: unknown): WorkbenchSnapshotLoadScope {
  if (typeof scope !== "string") return "all";
  return parseWorkbenchSnapshotLoadScope(scope) ?? "all";
}

function isSnapshotRecordInStorage(item: unknown): item is SnapshotRecordInStorage {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof (item as SnapshotRecordInStorage).id === "string" &&
    typeof (item as SnapshotRecordInStorage).name === "string" &&
    typeof (item as SnapshotRecordInStorage).updatedAt === "string" &&
    (item as SnapshotRecordInStorage).session !== null &&
    typeof (item as SnapshotRecordInStorage).session === "object"
  );
}

function toSnapshotRecord(item: unknown): WorkbenchSessionSnapshot | null {
  if (!isSnapshotRecordInStorage(item)) return null;
  return {
    id: item.id,
    name: item.name,
    scope: normalizeSnapshotScope(item.scope),
    updatedAt: item.updatedAt,
    session: item.session as WorkbenchSessionV2,
  };
}

function parseSnapshotStore(raw: string): SnapshotStore | null {
  const parsed = JSON.parse(raw) as Partial<SnapshotStore>;
  if (parsed.v !== 1 || !Array.isArray(parsed.snapshots)) return null;
  const snapshots = parsed.snapshots
    .map((item) => toSnapshotRecord(item))
    .filter((item): item is WorkbenchSessionSnapshot => item !== null);
  return { v: 1, snapshots };
}

function readSnapshotStore(): SnapshotStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = localStorage.getItem(WORKBENCH_SESSION_SNAPSHOTS_KEY);
    if (!raw) return defaultStore();
    return parseSnapshotStore(raw) ?? defaultStore();
  } catch {
    return defaultStore();
  }
}

function writeSnapshotStore(store: SnapshotStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKBENCH_SESSION_SNAPSHOTS_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage/quota failures.
  }
}

function normalizeSnapshotName(name: string): string {
  const trimmed = name.trim();
  return trimmed === "" ? "Snapshot" : trimmed;
}

function newSnapshotId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortByNewest(a: WorkbenchSessionSnapshot, b: WorkbenchSessionSnapshot): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

function parseSnapshotSession(session: WorkbenchSessionV2): WorkbenchSessionV2InFlight | null {
  const parsed = parseImportedWorkbenchSessionJson(JSON.stringify(session));
  return parsed.ok ? parsed.session : null;
}

export function listWorkbenchSnapshots(): WorkbenchSessionSnapshot[] {
  return readSnapshotStore().snapshots.slice().sort(sortByNewest);
}

export function saveWorkbenchSnapshot(
  session: WorkbenchSessionV2,
  name: string,
  snapshotId?: string,
  scope: WorkbenchSnapshotLoadScope = "all"
): { ok: true; snapshot: WorkbenchSessionSnapshot } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: false, error: "Not available" };
  const store = readSnapshotStore();
  const normalizedName = normalizeSnapshotName(name);
  const now = new Date().toISOString();
  const existingById = snapshotId
    ? store.snapshots.find((snapshot) => snapshot.id === snapshotId)
    : undefined;
  const existingByName = store.snapshots.find((snapshot) => snapshot.name === normalizedName);
  const existing = existingById ?? existingByName;
  const next: WorkbenchSessionSnapshot = {
    id: existing?.id ?? newSnapshotId(),
    name: normalizedName,
    scope,
    updatedAt: now,
    session,
  };
  const filtered = store.snapshots.filter((snapshot) => snapshot.id !== next.id);
  const snapshots = [next, ...filtered].sort(sortByNewest);
  writeSnapshotStore({ v: 1, snapshots });
  return { ok: true, snapshot: next };
}

export function loadWorkbenchSnapshot(
  id: string
): { ok: true; session: WorkbenchSessionV2InFlight } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: false, error: "Not available" };
  const snapshot = readSnapshotStore().snapshots.find((item) => item.id === id);
  if (!snapshot) return { ok: false, error: "Snapshot not found" };
  const parsed = parseSnapshotSession(snapshot.session);
  if (!parsed) return { ok: false, error: "Snapshot is invalid" };
  return { ok: true, session: parsed };
}

export function deleteWorkbenchSnapshot(id: string): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: false, error: "Not available" };
  const store = readSnapshotStore();
  const exists = store.snapshots.some((snapshot) => snapshot.id === id);
  if (!exists) return { ok: false, error: "Snapshot not found" };
  writeSnapshotStore({ v: 1, snapshots: store.snapshots.filter((snapshot) => snapshot.id !== id) });
  return { ok: true };
}
