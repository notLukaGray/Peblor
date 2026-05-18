import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateElement } from "./validate-element.js";

describe("validate_element", () => {
  it("validates element files through pb-cli wrapper", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-mcp-validate-element-"));
    const file = path.join(dir, "element.json");
    fs.writeFileSync(file, JSON.stringify({ type: "elementButton", label: "Hi" }), "utf8");

    const result = (await validateElement.run({ file })) as { valid: boolean };
    expect(typeof result.valid).toBe("boolean");
  });
});
