import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listModuleTypes } from "./list-module-types.js";
import { explainModuleType } from "./explain-module-type.js";
import { validateModuleFragment } from "./validate-module-fragment.js";

describe("module tools", () => {
  it("lists module definition types", async () => {
    const rows = (await listModuleTypes.run({})) as Array<{ id: string }>;
    expect(Array.isArray(rows)).toBe(true);
  });

  it("explains one module type if available", async () => {
    const rows = (await listModuleTypes.run({})) as Array<{ id: string }>;
    if (rows.length === 0) return;
    const detail = (await explainModuleType.run({ id: rows[0]!.id })) as { id: string };
    expect(detail.id).toBe(rows[0]!.id);
  });

  it("validates module fragment through cli wrapper", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-module-"));
    const file = path.join(dir, "module.json");
    fs.writeFileSync(
      file,
      JSON.stringify({ type: "module", contentSlot: "content", slots: {} }),
      "utf8"
    );
    const result = (await validateModuleFragment.run({ file })) as { valid: boolean };
    expect(result.valid).toBe(true);
  });
});
