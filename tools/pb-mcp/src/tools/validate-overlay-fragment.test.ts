import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateOverlayFragment } from "./validate-overlay-fragment.js";

describe("validate_overlay_fragment", () => {
  it("validates overlay fragment through cli wrapper", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-overlay-"));
    const file = path.join(dir, "overlay.json");
    fs.writeFileSync(file, JSON.stringify({ type: "divider" }), "utf8");
    const result = (await validateOverlayFragment.run({ file })) as { valid: boolean };
    expect(result.valid).toBe(true);
  });
});
