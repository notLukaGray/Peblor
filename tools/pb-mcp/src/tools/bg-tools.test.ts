import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listBgTypes } from "./list-bg-types.js";
import { explainBgType } from "./explain-bg-type.js";
import { validateBg } from "./validate-bg.js";

describe("background tools", () => {
  it("lists background type literals", async () => {
    const rows = (await listBgTypes.run({})) as Array<{ type: string }>;
    expect(rows.some((r) => r.type === "backgroundImage")).toBe(true);
  });

  it("explains one background type", async () => {
    const detail = (await explainBgType.run({ type: "backgroundTransition" })) as {
      type: string;
      rootFields: string[];
    };
    expect(detail.type).toBe("backgroundTransition");
    expect(detail.rootFields).toContain("from");
  });

  it("validates background file through cli wrapper", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-bg-"));
    const file = path.join(dir, "bg.json");
    fs.writeFileSync(file, JSON.stringify({ type: "backgroundImage", image: "/x.jpg" }), "utf8");
    const result = (await validateBg.run({ file })) as { valid: boolean };
    expect(result.valid).toBe(true);
  });
});
