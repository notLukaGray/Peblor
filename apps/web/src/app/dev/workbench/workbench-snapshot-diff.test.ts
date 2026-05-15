import { describe, expect, it } from "vitest";
import { getDefaultWorkbenchSession } from "@/app/dev/workbench/workbench-defaults";
import { getWorkbenchSnapshotDiffKeys } from "./workbench-snapshot-diff";

describe("workbench-snapshot-diff", () => {
  it("reports diffs for expanded element slices", () => {
    const current = getDefaultWorkbenchSession();
    const snapshot = {
      ...current,
      elements: {
        ...current.elements,
        scrollProgressBar: {
          ...current.elements.scrollProgressBar,
          defaultVariant: "bold" as const,
        },
      },
    };
    expect(getWorkbenchSnapshotDiffKeys(current, snapshot)).toContain("elements.scrollProgressBar");
  });
});
