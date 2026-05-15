import { beforeEach, describe, expect, it } from "vitest";
import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import {
  listWorkbenchSnapshots,
  saveWorkbenchSnapshot,
  WORKBENCH_SESSION_SNAPSHOTS_KEY,
} from "./workbench-snapshot-storage";

describe("workbench-snapshot-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and lists snapshot scope", () => {
    const session = getWorkbenchSession();
    const result = saveWorkbenchSnapshot(session, "Style slot", undefined, "style");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.scope).toBe("style");
    const listed = listWorkbenchSnapshots();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.scope).toBe("style");
  });

  it("defaults legacy snapshots without scope to all", () => {
    const session = getWorkbenchSession();
    localStorage.setItem(
      WORKBENCH_SESSION_SNAPSHOTS_KEY,
      JSON.stringify({
        v: 1,
        snapshots: [
          {
            id: "legacy-1",
            name: "Legacy",
            updatedAt: new Date().toISOString(),
            session,
          },
        ],
      })
    );
    const listed = listWorkbenchSnapshots();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.scope).toBe("all");
  });
});
