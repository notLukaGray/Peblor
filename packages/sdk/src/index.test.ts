import { describe, expect, it } from "vitest";
import { createPbClient } from "./index";

describe("sdk guards", () => {
  it("throws when diff recursion exceeds max depth", async () => {
    const client = createPbClient();
    const deepA: Record<string, unknown> = {};
    const deepB: Record<string, unknown> = {};
    let cursorA: Record<string, unknown> = deepA;
    let cursorB: Record<string, unknown> = deepB;
    for (let i = 0; i < 40; i += 1) {
      cursorA.nested = {};
      cursorB.nested = {};
      cursorA = cursorA.nested as Record<string, unknown>;
      cursorB = cursorB.nested as Record<string, unknown>;
    }
    cursorA.leaf = 1;
    cursorB.leaf = 2;

    await expect(client.diff(deepA, deepB)).rejects.toThrow("Diff recursion depth exceeded");
  });
});
