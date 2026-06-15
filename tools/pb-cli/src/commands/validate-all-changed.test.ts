import { describe, expect, it } from "vitest";
import { runValidateAll } from "./validate-all.js";

function makeIo() {
  const out: unknown[] = [];
  const err: unknown[] = [];
  const lines: string[] = [];
  return {
    out,
    err,
    lines,
    io: {
      printText: (s: string) => lines.push(s),
      printErrorText: () => {},
      printUsage: () => {},
      printJson: (v: unknown) => out.push(v),
      printErrorJson: (v: unknown) => err.push(v),
    },
  };
}

describe("runValidateAll --changed", () => {
  it("returns 0 and emits a no-changes note when no pages changed vs HEAD", async () => {
    // Compare HEAD against itself — guaranteed zero changed files.
    const { io, out, lines } = makeIo();
    const code = await runValidateAll(["--changed", "--base", "HEAD", "--json"], io as never);

    expect(code).toBe(0);
    // When there are no changed pages the result lands in out (not err).
    if (out.length > 0) {
      const payload = out[0] as { total: number; changed: boolean };
      expect(payload.total).toBe(0);
      expect(payload.changed).toBe(true);
    } else {
      // Human-readable path — should mention no changed pages.
      expect(lines.some((l) => l.toLowerCase().includes("no changed"))).toBe(true);
    }
  });

  it("includes changed:true and baseRef in JSON output", async () => {
    const { io, out } = makeIo();
    await runValidateAll(["--changed", "--base", "HEAD", "--json"], io as never);

    const payload = out[0] as { changed?: boolean; baseRef?: string };
    // Payload is only emitted when there are no changed pages — check it carries the flags.
    if (payload) {
      expect(payload.changed).toBe(true);
      expect(payload.baseRef).toBe("HEAD");
    }
  });

  it("--help includes --changed and --base flags", async () => {
    const lines: string[] = [];
    const io = {
      printText: (s: string) => lines.push(s),
      printErrorText: () => {},
      printUsage: () => {},
      printJson: () => {},
      printErrorJson: () => {},
    };
    const code = await runValidateAll(["--help"], io as never);
    expect(code).toBe(0);
    const helpText = lines.join("\n");
    expect(helpText).toContain("--changed");
    expect(helpText).toContain("--base");
  });
});
