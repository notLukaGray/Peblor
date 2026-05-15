import { describe, expect, it } from "vitest";
import { ELEMENT_DEV_ENTRIES } from "@/app/dev/elements/element-dev-registry";
import {
  LAYOUT_PREVIEW_SURFACE_IDS,
  PREVIEW_FIDELITY_INVENTORY,
} from "@/app/dev/workbench/preview-fidelity-inventory";

function sortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

describe("preview fidelity inventory", () => {
  it("covers every live element editor", () => {
    const expected = sortStrings(
      ELEMENT_DEV_ENTRIES.filter((entry) => entry.status === "live").map(
        (entry) => `elements/${entry.slug}`
      )
    );
    const actual = sortStrings(
      PREVIEW_FIDELITY_INVENTORY.filter((entry) => entry.surfaceId.startsWith("elements/")).map(
        (entry) => entry.surfaceId
      )
    );
    expect(actual).toEqual(expected);
  });

  it("covers all live layout editors", () => {
    const expected = sortStrings([...LAYOUT_PREVIEW_SURFACE_IDS]);
    const actual = sortStrings(
      PREVIEW_FIDELITY_INVENTORY.filter((entry) => entry.surfaceId.startsWith("layout/")).map(
        (entry) => entry.surfaceId
      )
    );
    expect(actual).toEqual(expected);
  });

  it("keeps metadata complete and deduplicated", () => {
    const ids = PREVIEW_FIDELITY_INVENTORY.map((entry) => entry.surfaceId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of PREVIEW_FIDELITY_INVENTORY) {
      expect(entry.status).toBe("live");
      expect(entry.owner.trim().length).toBeGreaterThan(0);
      expect(entry.supportsViewport).toBe(true);
      expect(entry.fidelityModeDefault).toBe("raw");
    }
  });
});
