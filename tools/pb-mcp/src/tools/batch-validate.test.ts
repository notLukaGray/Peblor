import { describe, expect, it } from "vitest";
import { batchValidate } from "./batch-validate.js";

describe("batch_validate", () => {
  it("delegates to validate-all and returns strict-load results", async () => {
    const result = (await batchValidate.run({})) as {
      command: string;
      mode: string;
      total: number;
      valid: number;
      failed: number;
      pages: Record<string, { valid: boolean }>;
    };

    // Must be the validate-all output shape, not the old per-page structure.
    expect(result.command).toBe("validate-all");
    expect(result.mode).toBe("strict-load");
    expect(typeof result.total).toBe("number");
    expect(result.total).toBeGreaterThan(0);
    expect(result.valid).toBe(result.total);
    expect(result.failed).toBe(0);
  });

  it("passes changed:true to validate-all when requested", async () => {
    // Compare HEAD vs itself — no changed pages, returns the empty payload.
    const result = (await batchValidate.run({ changed: true, baseRef: "HEAD" })) as {
      command: string;
      changed?: boolean;
      total: number;
    };

    expect(result.command).toBe("validate-all");
    expect(result.total).toBe(0);
  });
});
