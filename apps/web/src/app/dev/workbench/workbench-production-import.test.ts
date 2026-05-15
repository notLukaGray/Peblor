import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductionWorkbenchSession } from "@/app/dev/workbench/workbench-defaults";
import {
  applyImportedWorkbenchSession,
  getWorkbenchSession,
} from "@/app/dev/workbench/workbench-session";
import * as workbenchSnapshotDiff from "@/app/dev/workbench/workbench-snapshot-diff";
import { importWorkbenchProductionDefaultsWithDiffPrompt } from "./workbench-production-import";

function mockConfirm(value: boolean) {
  Object.defineProperty(window, "confirm", {
    value: vi.fn().mockReturnValue(value),
    writable: true,
    configurable: true,
  });
}

function setModifiedSession(): void {
  const base = getWorkbenchSession();
  applyImportedWorkbenchSession({
    ...base,
    colors: {
      ...base.colors,
      seedsLight: { ...base.colors.seedsLight, primary: "#123456" },
    },
  });
}

describe("importWorkbenchProductionDefaultsWithDiffPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns canceled when confirm is rejected", () => {
    setModifiedSession();
    mockConfirm(false);
    expect(importWorkbenchProductionDefaultsWithDiffPrompt()).toEqual({
      ok: false,
      error: "Import canceled",
    });
    expect(getWorkbenchSession().colors.seedsLight.primary).toBe("#123456");
  });

  it("imports production defaults when confirm is accepted", () => {
    setModifiedSession();
    mockConfirm(true);
    const result = importWorkbenchProductionDefaultsWithDiffPrompt();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diffKeys.length).toBeGreaterThan(0);
    expect(getWorkbenchSession().colors).toEqual(getProductionWorkbenchSession().colors);
  });

  it("skips prompt when there is no diff to apply", () => {
    vi.spyOn(workbenchSnapshotDiff, "getWorkbenchSnapshotDiffKeys").mockReturnValue([]);
    const confirmSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(window, "confirm", {
      value: confirmSpy,
      writable: true,
      configurable: true,
    });
    const result = importWorkbenchProductionDefaultsWithDiffPrompt();
    expect(result).toEqual({ ok: true, diffKeys: [] });
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
