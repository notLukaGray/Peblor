import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runValidateAction } from "./validate-action.js";

function makeIo() {
  const out: unknown[] = [];
  const err: unknown[] = [];
  return {
    out,
    err,
    io: {
      printText: () => {},
      printErrorText: () => {},
      printUsage: () => {},
      printJson: (v: unknown) => out.push(v),
      printErrorJson: (v: unknown) => err.push(v),
    },
  };
}

describe("runValidateAction", () => {
  it("reports payload path diagnostics for invalid action", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-validate-action-"));
    const file = path.join(dir, "action.json");
    fs.writeFileSync(file, JSON.stringify({ type: "setVariable", key: "a", value: 1 }), "utf8");

    const { io, err } = makeIo();
    const code = await runValidateAction([file], io as never);
    expect(code).toBe(1);
    const payload = err[0] as { diagnostics: Array<{ path: string }> };
    expect(payload.diagnostics.some((d) => d.path.includes("payload"))).toBe(true);
  });
});
