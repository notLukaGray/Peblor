import { beforeEach, describe, expect, it } from "vitest";
import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import { applyWorkbenchSnapshotScope } from "./workbench-snapshot-apply";

describe("workbench-snapshot-apply", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("applies elements scope changes for expanded element slices", () => {
    const base = getWorkbenchSession();
    const snapshot = {
      ...base,
      elements: {
        ...base.elements,
        button: {
          ...base.elements.button,
          defaultVariant: "accent" as const,
        },
      },
    };

    applyWorkbenchSnapshotScope(snapshot, "elements");
    const after = getWorkbenchSession();

    expect(after.elements.button.defaultVariant).toBe("accent");
    expect(after.elements.video).toEqual(base.elements.video);
  });
});
