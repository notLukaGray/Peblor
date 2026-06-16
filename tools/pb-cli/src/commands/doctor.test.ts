import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSectionFiles, deriveSlugSegments, runDoctor } from "./doctor.js";
import { PAGE_DATA_DIR } from "@pb/core/loader";

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── resolveSectionFiles ─────────────────────────────────────────────────────

describe("resolveSectionFiles", () => {
  it("counts loaded and failed section files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-doctor-"));
    const page = path.join(dir, "index.json");
    fs.writeFileSync(page, "{}", "utf8");

    fs.writeFileSync(path.join(dir, "good.json"), JSON.stringify({ type: "divider" }), "utf8");
    fs.writeFileSync(
      path.join(dir, "bad.json"),
      JSON.stringify({ type: "__not_a_valid_type__" }),
      "utf8"
    );

    const result = resolveSectionFiles(page, ["good", "bad", "missing"]);

    expect(result.sections).toBe(3);
    expect(result.loaded).toBe(1);
    expect(result.failed).toBe(2);
    expect(result.failures.map((f) => f.key).sort()).toEqual(["bad", "missing"]);
  });
});

// ─── deriveSlugSegments ──────────────────────────────────────────────────────

describe("deriveSlugSegments", () => {
  it("returns slug segments for a valid page index path", () => {
    const pagePath = path.join(PAGE_DATA_DIR, "presets", "cards-basic", "index.json");
    expect(deriveSlugSegments(pagePath)).toEqual(["presets", "cards-basic"]);
  });

  it("returns single segment for a top-level page", () => {
    const pagePath = path.join(PAGE_DATA_DIR, "unlock", "index.json");
    expect(deriveSlugSegments(pagePath)).toEqual(["unlock"]);
  });

  it("returns null for sidecar section fragments (non-index JSON)", () => {
    const sidecar = path.join(PAGE_DATA_DIR, "404", "hero.json");
    expect(deriveSlugSegments(sidecar)).toBeNull();
  });

  it("returns null for files outside PAGE_DATA_DIR", () => {
    const tmp = path.join(os.tmpdir(), "pb-doctor-tmp.json");
    expect(deriveSlugSegments(tmp)).toBeNull();
  });

  it("returns null for the root index.json (no slug segments)", () => {
    const root = path.join(PAGE_DATA_DIR, "index.json");
    expect(deriveSlugSegments(root)).toBeNull();
  });
});

// ─── runDoctor — load mode routing ──────────────────────────────────────────

describe("runDoctor — load mode", () => {
  it("uses strict-load for a real page under content/pages/", async () => {
    const unlockPage = path.join(PAGE_DATA_DIR, "unlock", "index.json");
    const { io, out } = makeIo();
    const code = await runDoctor([unlockPage, "--json"], io as never);

    expect(code).toBe(0);
    const payload = out[0] as {
      stages: {
        load: { ok: boolean; details?: { mode?: string } };
        validate: { ok: boolean; details?: { mode?: string } };
      };
    };
    expect(payload.stages.load.ok).toBe(true);
    expect(payload.stages.load.details?.mode).toBe("strict-load");
    expect(payload.stages.validate.ok).toBe(true);
    expect(payload.stages.validate.details?.mode).toBe("strict-load");
  });

  it("uses schema-only for a file inside the project but outside content/pages/", async () => {
    // content/validator-fragments/ is inside the project root (passes loadPage's CWD check)
    // but outside content/pages/ (so deriveSlugSegments returns null → schema-only path).
    // Any file there is a section/bg fragment, not a full page — validate will fail,
    // but the mode field is set at load time and is what we're testing here.
    const fragmentFile = path.join(process.cwd(), "content/validator-fragments/bg-gradient.json");

    const { io, out, err } = makeIo();
    await runDoctor([fragmentFile, "--json"], io as never);

    // Result lands in out (pass) or err (fail) — check either.
    const payload = (out[0] ?? err[0]) as {
      stages: {
        load: { ok: boolean; details?: { mode?: string } };
        validate: { ok: boolean; details?: { mode?: string } };
      };
    };
    expect(payload).toBeTruthy();
    expect(payload.stages.load.ok).toBe(true);
    expect(payload.stages.load.details?.mode).toBe("schema-only");
    // validate may pass or fail (it's a fragment not a page) — mode is what matters
    if (payload.stages.validate.details?.mode !== undefined) {
      expect(payload.stages.validate.details.mode).toBe("schema-only");
    }
  });
});

// ─── runDoctor — skipped stage semantics ────────────────────────────────────

describe("runDoctor — skipped stages", () => {
  it("marks stages after --stage load as skipped, not failed", async () => {
    const unlockPage = path.join(PAGE_DATA_DIR, "unlock", "index.json");
    const { io, out } = makeIo();
    await runDoctor([unlockPage, "--stage", "load", "--json"], io as never);

    const payload = out[0] as {
      stages: Record<
        string,
        { ok: boolean; error?: string; details?: { skipped?: boolean; mode?: string } }
      >;
    };

    expect(payload.stages.load?.ok).toBe(true);

    // With strict-load, load+validate are one atomic operation — validate is always
    // ok: true alongside load even with --stage load. That is correct behaviour.
    // Only expand, resolve, assets must be explicitly marked skipped.
    for (const s of ["expand", "resolve", "assets"]) {
      const stage = payload.stages[s]!;
      // Must never be ok: false with no error (indistinguishable from a failure)
      expect(stage.ok).toBe(true);
      expect(stage.details?.skipped).toBe(true);
    }
  });

  it("marks stages after --stage validate as skipped", async () => {
    const unlockPage = path.join(PAGE_DATA_DIR, "unlock", "index.json");
    const { io, out } = makeIo();
    await runDoctor([unlockPage, "--stage", "validate", "--json"], io as never);

    const payload = out[0] as {
      stages: Record<string, { ok: boolean; details?: { skipped?: boolean } }>;
    };

    expect(payload.stages.load?.ok).toBe(true);
    expect(payload.stages.validate?.ok).toBe(true);
    for (const s of ["expand", "resolve", "assets"]) {
      const stage = payload.stages[s]!;
      expect(stage.ok).toBe(true);
      expect(stage.details?.skipped).toBe(true);
    }
  });
});
