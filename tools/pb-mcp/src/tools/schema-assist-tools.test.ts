import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateFragment } from "./validate-fragment.js";
import { listFieldPaths } from "./list-field-paths.js";
import { suggestFix } from "./suggest-fix.js";

describe("schema assist tools", () => {
  it("validates a fragment file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-preset-"));
    const file = path.join(dir, "preset.json");
    fs.writeFileSync(
      file,
      JSON.stringify({ type: "setVariable", payload: { key: "a", value: 1 } }),
      "utf8"
    );
    const out = (await validateFragment.run({ file })) as { valid: boolean };
    expect(out.valid).toBe(true);
  });

  it("lists nested field paths for a cluster", async () => {
    const out = (await listFieldPaths.run({ clusterId: "element.heading" })) as {
      count: number;
      paths: string[];
    };
    expect(out.count).toBeGreaterThan(0);
    expect(out.paths.some((p) => p.startsWith("motion"))).toBe(true);
  });

  it("suggests fixes for common diagnostics", async () => {
    const out = (await suggestFix.run({
      diagnostics: [{ path: "$.cursorTriggers.0.action", message: "expected payload object" }],
    })) as Array<{ suggestion: string }>;
    expect(out[0]?.suggestion.toLowerCase()).toContain("payload");
  });
});
