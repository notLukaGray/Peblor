import { describe, it, expect } from "vitest";
import { resolveElementBlockForBreakpoint } from "./breakpoint-resolution";
import type { ElementBlock } from "@pb/contracts/types";

/** Minimal valid element block for testing layout resolution. */
function makeBlock(overrides: Record<string, unknown>): ElementBlock {
  return { type: "elementHeading", ...overrides } as unknown as ElementBlock;
}

describe("resolveElementBlockForBreakpoint", () => {
  describe("tier-map layout props (regression: were not recognized by valueNeedsResolution)", () => {
    it("resolves {base, md} width tier map — mobile picks base", () => {
      const block = makeBlock({ width: { base: "100%", md: "72%" } });
      const resolved = resolveElementBlockForBreakpoint(block, true);
      expect(resolved.width).toBe("100%");
      expect(typeof resolved.width).toBe("string");
    });

    it("resolves {base, md} width tier map — desktop picks md", () => {
      const block = makeBlock({ width: { base: "100%", md: "72%" } });
      const resolved = resolveElementBlockForBreakpoint(block, false);
      expect(resolved.width).toBe("72%");
      expect(typeof resolved.width).toBe("string");
    });

    it("resolved width is NOT a plain object (regression guard)", () => {
      const block = makeBlock({ width: { base: "100%", md: "72%" } });
      expect(typeof resolveElementBlockForBreakpoint(block, true).width).not.toBe("object");
      expect(typeof resolveElementBlockForBreakpoint(block, false).width).not.toBe("object");
    });

    it("resolves {base, md} align tier map", () => {
      const block = makeBlock({ align: { base: "left", md: "center" } });
      expect((resolveElementBlockForBreakpoint(block, true) as Record<string, unknown>).align).toBe(
        "left"
      );
      expect(
        (resolveElementBlockForBreakpoint(block, false) as Record<string, unknown>).align
      ).toBe("center");
    });

    it("resolves multi-tier map with lg key (lg ignored in JS, falls back to md)", () => {
      const block = makeBlock({ width: { base: "100%", md: "72%", lg: "60%" } });
      // JS resolution uses representative widths: mobile=0 (→base), desktop=768px (→md).
      // lg (1024px) is above desktop representative so JS resolution picks md for desktop.
      expect(resolveElementBlockForBreakpoint(block, true).width).toBe("100%");
      expect(resolveElementBlockForBreakpoint(block, false).width).toBe("72%");
    });

    it("resolves {base}-only tier map — both mobile and desktop pick base", () => {
      const block = makeBlock({ borderRadius: { base: "8px" } });
      expect(
        (resolveElementBlockForBreakpoint(block, true) as Record<string, unknown>).borderRadius
      ).toBe("8px");
      expect(
        (resolveElementBlockForBreakpoint(block, false) as Record<string, unknown>).borderRadius
      ).toBe("8px");
    });
  });

  describe("objectFit tier-map resolution (regression: only Array.isArray was checked)", () => {
    it("resolves {base, md} objectFit tier map — mobile", () => {
      const block = makeBlock({ objectFit: { base: "cover", md: "contain" } });
      expect(
        (resolveElementBlockForBreakpoint(block, true) as Record<string, unknown>).objectFit
      ).toBe("cover");
    });

    it("resolves {base, md} objectFit tier map — desktop", () => {
      const block = makeBlock({ objectFit: { base: "cover", md: "contain" } });
      expect(
        (resolveElementBlockForBreakpoint(block, false) as Record<string, unknown>).objectFit
      ).toBe("contain");
    });

    it("leaves scalar objectFit unchanged", () => {
      const block = makeBlock({ objectFit: "cover" });
      const resolved = resolveElementBlockForBreakpoint(block, true);
      expect((resolved as Record<string, unknown>).objectFit).toBe("cover");
    });
  });

  describe("constraints tier-map resolution (regression: only Array.isArray was checked)", () => {
    it("resolves {base, md} constraints tier map — mobile", () => {
      const mobile = { maxWidth: "100%" };
      const desktop = { maxWidth: "800px" };
      const block = makeBlock({ constraints: { base: mobile, md: desktop } });
      expect(
        (resolveElementBlockForBreakpoint(block, true) as Record<string, unknown>).constraints
      ).toEqual(mobile);
    });

    it("resolves {base, md} constraints tier map — desktop", () => {
      const mobile = { maxWidth: "100%" };
      const desktop = { maxWidth: "800px" };
      const block = makeBlock({ constraints: { base: mobile, md: desktop } });
      expect(
        (resolveElementBlockForBreakpoint(block, false) as Record<string, unknown>).constraints
      ).toEqual(desktop);
    });

    it("leaves non-responsive scalar constraints object unchanged (not a responsive wrapper)", () => {
      // A plain {minWidth, maxWidth} object has no tier/mobile/desktop keys → must NOT be resolved
      const scalar = { minWidth: "200px", maxWidth: "600px" };
      const block = makeBlock({ constraints: scalar });
      expect(
        (resolveElementBlockForBreakpoint(block, true) as Record<string, unknown>).constraints
      ).toEqual(scalar);
      expect(
        (resolveElementBlockForBreakpoint(block, false) as Record<string, unknown>).constraints
      ).toEqual(scalar);
    });
  });

  describe("no-op when nothing is responsive", () => {
    it("returns the same block reference when no layout key is responsive", () => {
      const block = makeBlock({ width: "100%", align: "center" });
      expect(resolveElementBlockForBreakpoint(block, true)).toBe(block);
      expect(resolveElementBlockForBreakpoint(block, false)).toBe(block);
    });

    it("returns the same reference for a block with no layout keys", () => {
      const block = makeBlock({});
      expect(resolveElementBlockForBreakpoint(block, false)).toBe(block);
    });
  });

  describe("@container map resolution", () => {
    it("resolves {@container: {base, md}} width — mobile collapses to base", () => {
      const block = makeBlock({ width: { "@container": { base: "100%", md: "72%" } } });
      expect(resolveElementBlockForBreakpoint(block, true).width).toBe("100%");
    });

    it("resolves {@container: {base, md}} width — desktop collapses to md", () => {
      const block = makeBlock({ width: { "@container": { base: "100%", md: "72%" } } });
      expect(resolveElementBlockForBreakpoint(block, false).width).toBe("72%");
    });
  });
});
