import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSectionFiles } from "./doctor.js";

describe("resolveSectionFiles", () => {
  it("counts loaded and failed section files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-doctor-"));
    const page = path.join(dir, "index.json");
    fs.writeFileSync(page, "{}", "utf8");

    fs.writeFileSync(path.join(dir, "good.json"), JSON.stringify({ type: "divider" }), "utf8");
    fs.writeFileSync(path.join(dir, "bad.json"), JSON.stringify({ type: "contentBlock" }), "utf8");

    const result = resolveSectionFiles(page, ["good", "bad", "missing"]);

    expect(result.sections).toBe(3);
    expect(result.loaded).toBe(1);
    expect(result.failed).toBe(2);
    expect(result.failures.map((f) => f.key).sort()).toEqual(["bad", "missing"]);
  });
});
