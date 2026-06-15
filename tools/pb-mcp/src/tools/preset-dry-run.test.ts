import { describe, it, expect } from "vitest";
import { previewPresetChange } from "./preset-dry-run.js";

describe("preview_preset_change", () => {
  it("shows preset diff and consumer pages for a known preset", async () => {
    const result = (await previewPresetChange.run({
      presetKey: "type-h1-display",
      patch: { fontSize: "clamp(2.5rem, 5vw, 4rem)" },
      sampleSize: 3,
    })) as {
      presetKey: string;
      totalConsumerCount: number;
      presetDiff: { changeCount: number; changes: Array<{ path: string }> };
      previewSamples: Array<{ pageRoute: string }>;
      note: string;
    };

    expect(result.presetKey).toBe("type-h1-display");
    expect(result.totalConsumerCount).toBeGreaterThan(0);
    expect(result.presetDiff.changeCount).toBeGreaterThan(0);
    expect(result.presetDiff.changes.length).toBeGreaterThan(0);
    expect(result.previewSamples.length).toBeGreaterThan(0);
    expect(result.note).toContain("Nothing is written");
  });

  it("returns zero changes when patch is a no-op", async () => {
    // Read the actual preset to get a field value to patch back to itself
    const result = (await previewPresetChange.run({
      presetKey: "type-h1-display",
      patch: {},
    })) as { presetDiff: { changeCount: number }; hint: string };

    expect(result.presetDiff.changeCount).toBe(0);
    expect(result.hint).toContain("no changes");
  });

  it("throws for a non-existent preset key", async () => {
    await expect(
      previewPresetChange.run({ presetKey: "__fake-preset-key__", patch: {} })
    ).rejects.toThrow("Preset not found");
  });

  it("respects sampleSize cap", async () => {
    const result = (await previewPresetChange.run({
      presetKey: "type-h1-display",
      patch: { fontSize: "2rem" },
      sampleSize: 2,
    })) as { previewSamples: unknown[]; sampledCount: number };

    expect(result.previewSamples.length).toBeLessThanOrEqual(2);
    expect(result.sampledCount).toBeLessThanOrEqual(2);
  });
});
