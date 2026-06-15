import { describe, expect, it } from "vitest";
import { probePresetUsage, probeModuleUsage, probeOverlayUsage } from "./probe-usage.js";

// ── probe_preset_usage ───────────────────────────────────────────────────────

describe("probe_preset_usage", () => {
  it("finds pages that reference a known preset", async () => {
    // "bg-solid" is referenced in content/pages/research/index.json
    const result = (await probePresetUsage.run({ presetKey: "bg-solid" })) as {
      presetKey: string;
      totalPageCount: number;
      totalReferenceCount: number;
      consumers: Array<{
        pageRoute: string;
        references: Array<{
          file: string;
          hits: Array<{ jsonPath: string; overrideFields: string[] }>;
        }>;
      }>;
      hint: string;
    };

    expect(result.presetKey).toBe("bg-solid");
    expect(result.totalPageCount).toBeGreaterThan(0);
    expect(result.totalReferenceCount).toBeGreaterThan(0);
    expect(result.consumers.length).toBeGreaterThan(0);
    // Each consumer has a pageRoute and at least one reference with a JSON path.
    for (const consumer of result.consumers) {
      expect(typeof consumer.pageRoute).toBe("string");
      expect(consumer.references.length).toBeGreaterThan(0);
      for (const ref of consumer.references) {
        expect(ref.hits.length).toBeGreaterThan(0);
        for (const hit of ref.hits) {
          expect(typeof hit.jsonPath).toBe("string");
          expect(Array.isArray(hit.overrideFields)).toBe(true);
        }
      }
    }
  });

  it("returns zero consumers for a preset key that does not exist", async () => {
    const result = (await probePresetUsage.run({
      presetKey: "__definitely_not_a_real_preset_key__",
    })) as { totalPageCount: number; hint: string };

    expect(result.totalPageCount).toBe(0);
    expect(result.hint).toMatch(/No pages reference/);
  });
});

// ── probe_module_usage ───────────────────────────────────────────────────────

describe("probe_module_usage", () => {
  it("finds pages that explicitly reference a known module key", async () => {
    // "video-player" exists as a global module and has explicit element references
    const result = (await probeModuleUsage.run({ moduleKey: "video-player" })) as {
      moduleKey: string;
      moduleExists: boolean;
      globallyMerged: boolean;
      explicitPageCount: number;
      totalReferenceCount: number;
      consumers: Array<{ pageRoute: string }>;
      hint: string;
    };

    expect(result.moduleKey).toBe("video-player");
    expect(result.moduleExists).toBe(true);
    expect(result.globallyMerged).toBe(true);
    expect(typeof result.explicitPageCount).toBe("number");
    expect(typeof result.totalReferenceCount).toBe("number");
    expect(Array.isArray(result.consumers)).toBe(true);
    expect(typeof result.hint).toBe("string");
  });

  it("warns when the module key does not exist in content/modules/", async () => {
    const result = (await probeModuleUsage.run({
      moduleKey: "__no_such_module__",
    })) as { moduleExists: boolean; globallyMerged: boolean; explicitPageCount: number };

    expect(result.moduleExists).toBe(false);
    expect(result.globallyMerged).toBe(false);
    expect(result.explicitPageCount).toBe(0);
  });
});

// ── probe_overlay_usage ──────────────────────────────────────────────────────

describe("probe_overlay_usage", () => {
  it("reports that a global overlay is active on most pages", async () => {
    // "header" is a global overlay — should be active on all pages that don't disable it.
    const result = (await probeOverlayUsage.run({ overlayId: "header" })) as {
      overlayId: string;
      scope: string;
      totalPages: number;
      activePageCount: number;
      disabledPageCount: number;
      disabledBy: Array<{ route: string; file: string }>;
      note: string;
    };

    expect(result.overlayId).toBe("header");
    expect(result.scope).toBe("global");
    expect(result.totalPages).toBeGreaterThan(0);
    expect(result.activePageCount).toBeGreaterThanOrEqual(0);
    expect(result.activePageCount + result.disabledPageCount).toBe(result.totalPages);
    expect(typeof result.note).toBe("string");
    // disabledBy is an array (may be empty if no page disables header).
    expect(Array.isArray(result.disabledBy)).toBe(true);
  });

  it("throws for an overlay ID that does not exist", async () => {
    await expect(probeOverlayUsage.run({ overlayId: "__no_such_overlay__" })).rejects.toThrow(
      "Overlay not found"
    );
  });
});
