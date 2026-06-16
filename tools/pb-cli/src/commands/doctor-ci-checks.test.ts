import path from "node:path";
import { describe, expect, it } from "vitest";
import { runDoctor } from "./doctor.js";
import { PAGE_DATA_DIR } from "@pb/core/loader";

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

describe("runDoctor — CI checks integration", () => {
  it("runs CI checks for a valid page without emitting ci-check diagnostics", async () => {
    // unlock is a simple, well-formed page with no tags/filterConfig/projectGroups.
    const pagePath = path.join(PAGE_DATA_DIR, "unlock", "index.json");
    const { io, out, err } = makeIo();
    const code = await runDoctor([pagePath, "--json"], io as never);

    // Should succeed overall.
    expect(code).toBe(0);
    const payload = (out[0] ?? err[0]) as { diagnostics: Array<{ stage: string }> };
    const ciDiags = payload.diagnostics.filter((d) => d.stage === "ci-checks");
    expect(ciDiags).toHaveLength(0);
  });

  it("reports ci-checks diagnostic stage in output shape", async () => {
    // Verify the output always has a `diagnostics` array (even if empty).
    const pagePath = path.join(PAGE_DATA_DIR, "unlock", "index.json");
    const { io, out, err } = makeIo();
    await runDoctor([pagePath, "--json"], io as never);

    const payload = (out[0] ?? err[0]) as { diagnostics: unknown[] };
    expect(Array.isArray(payload.diagnostics)).toBe(true);
  });
});
