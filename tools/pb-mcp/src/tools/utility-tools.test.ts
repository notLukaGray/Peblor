import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scaffoldPreset } from "./scaffold-preset.js";
import { explainFieldPath } from "./explain-field-path.js";
import { batchValidateFragments } from "./batch-validate-fragments.js";

describe("utility tools", () => {
  it("scaffolds a trigger preset template", async () => {
    const out = (await scaffoldPreset.run({ category: "trigger" })) as {
      scaffold: Record<string, unknown>;
    };
    expect(out.scaffold.type).toBe("setVariable");
  });

  it("explains an element field path", async () => {
    const out = (await explainFieldPath.run({ clusterId: "element.heading", path: "motion" })) as {
      node: unknown;
    };
    expect(out.node).toBeTruthy();
  });

  it("batch validates action fragments in a directory", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-frags-"));
    fs.writeFileSync(
      path.join(dir, "good.json"),
      JSON.stringify({ type: "setVariable", payload: { key: "a", value: 1 } }),
      "utf8"
    );
    const out = (await batchValidateFragments.run({ dir, kind: "action" })) as {
      total: number;
      invalid: number;
    };
    expect(out.total).toBe(1);
    expect(out.invalid).toBe(0);
  });
});
