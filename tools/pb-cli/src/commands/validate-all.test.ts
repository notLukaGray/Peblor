import { describe, expect, it } from "vitest";
import { runValidateAll } from "./validate-all.js";

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

describe("runValidateAll", () => {
  it("validates all real content pages and reports strict-load mode", async () => {
    const { io, out, err } = makeIo();
    const code = await runValidateAll(["--json"], io as never);

    // All real pages should pass
    expect(code).toBe(0);
    expect(out).toHaveLength(1);
    expect(err).toHaveLength(0);

    const payload = out[0] as {
      command: string;
      mode: string;
      total: number;
      valid: number;
      failed: number;
    };
    expect(payload.command).toBe("validate-all");
    // Must advertise strict-load so callers know which guarantee they got
    expect(payload.mode).toBe("strict-load");
    expect(payload.total).toBeGreaterThan(0);
    expect(payload.valid).toBe(payload.total);
    expect(payload.failed).toBe(0);
  });

  it("exits 0 and prints human-readable summary without --json", async () => {
    const lines: string[] = [];
    const io = {
      printText: (s: string) => lines.push(s),
      printErrorText: () => {},
      printUsage: () => {},
      printJson: () => {},
      printErrorJson: () => {},
    };
    const code = await runValidateAll([], io as never);
    expect(code).toBe(0);
    // Summary line should mention "strict-load"
    expect(lines.some((l) => l.includes("strict-load"))).toBe(true);
  });

  it("returns 0 and prints help with --help", async () => {
    const { io, out } = makeIo();
    const code = await runValidateAll(["--help"], io as never);
    expect(code).toBe(0);
    expect(out).toHaveLength(0);
  });
});
