import { describe, expect, it } from "vitest";
import { explainActionType } from "./explain-action-type.js";
import { validateAction } from "./validate-action.js";

describe("action MCP tools", () => {
  it("explains a single action payload shape", async () => {
    const detail = (await explainActionType.run({ type: "setVariable" })) as {
      type: string;
      payload: Array<{ key: string }>;
    };
    expect(detail.type).toBe("setVariable");
    expect(detail.payload.map((p) => p.key)).toEqual(expect.arrayContaining(["key", "value"]));
  });

  it("validates malformed action and returns payload path diagnostics", async () => {
    const result = (await validateAction.run({
      action: { type: "setVariable", key: "a", value: 1 },
    })) as {
      valid: boolean;
      diagnostics: Array<{ path: string }>;
    };
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes("payload"))).toBe(true);
  });
});
