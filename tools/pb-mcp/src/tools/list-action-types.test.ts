import { describe, expect, it } from "vitest";
import { listActionTypes } from "./list-action-types.js";

describe("list_action_types", () => {
  it("returns sorted action types with payload field summaries", async () => {
    const rows = (await listActionTypes.run({})) as Array<{
      type: string;
      payload: Array<{ key: string; type: string }>;
    }>;

    expect(rows.length).toBeGreaterThan(10);
    const types = rows.map((r) => r.type);
    expect(types).toEqual([...types].sort((a, b) => a.localeCompare(b)));

    const setVariable = rows.find((r) => r.type === "setVariable");
    expect(setVariable).toBeTruthy();
    expect(setVariable?.payload.map((p) => p.key)).toContain("key");
    expect(setVariable?.payload.map((p) => p.key)).toContain("value");
  });
});
