import { describe, expect, it } from "vitest";
import { resolveResponsiveValue } from "./responsive-value";

describe("resolveResponsiveValue", () => {
  describe("scalar passthrough", () => {
    it("returns the scalar for mobile", () => {
      expect(resolveResponsiveValue(42, true)).toBe(42);
    });

    it("returns the scalar for desktop", () => {
      expect(resolveResponsiveValue(42, false)).toBe(42);
    });

    it("returns undefined for undefined", () => {
      expect(resolveResponsiveValue(undefined, true)).toBeUndefined();
      expect(resolveResponsiveValue(undefined, false)).toBeUndefined();
    });
  });

  describe("named tier map", () => {
    it("{ base: 14, md: 18 } → mobile 14, desktop 18", () => {
      expect(resolveResponsiveValue({ base: 14, md: 18 }, true)).toBe(14);
      expect(resolveResponsiveValue({ base: 14, md: 18 }, false)).toBe(18);
    });

    it("{ base: 14 } → mobile 14, desktop 14 (md cascades from base)", () => {
      expect(resolveResponsiveValue({ base: 14 }, true)).toBe(14);
      expect(resolveResponsiveValue({ base: 14 }, false)).toBe(14);
    });

    it("{ md: 18 } → mobile undefined, desktop 18", () => {
      expect(resolveResponsiveValue({ md: 18 }, true)).toBeUndefined();
      expect(resolveResponsiveValue({ md: 18 }, false)).toBe(18);
    });

    it("{ base: 14, sm: 16, md: 18, lg: 22, xl: 26 } → mobile 14, desktop 18 (lg/xl ignored in JS)", () => {
      expect(resolveResponsiveValue({ base: 14, sm: 16, md: 18, lg: 22, xl: 26 }, true)).toBe(14);
      expect(resolveResponsiveValue({ base: 14, sm: 16, md: 18, lg: 22, xl: 26 }, false)).toBe(18);
    });

    it("{ sm: 16, md: 18 } → mobile undefined, desktop 18", () => {
      expect(resolveResponsiveValue({ sm: 16, md: 18 }, true)).toBeUndefined();
      expect(resolveResponsiveValue({ sm: 16, md: 18 }, false)).toBe(18);
    });

    it("{ lg: 22 } → mobile undefined, desktop undefined (lg > md, ignored in JS)", () => {
      expect(resolveResponsiveValue({ lg: 22 }, true)).toBeUndefined();
      expect(resolveResponsiveValue({ lg: 22 }, false)).toBeUndefined();
    });

    it("{ base: 14, sm: 16 } → mobile 14, desktop 16 (sm cascades to desktop boundary)", () => {
      expect(resolveResponsiveValue({ base: 14, sm: 16 }, true)).toBe(14);
      expect(resolveResponsiveValue({ base: 14, sm: 16 }, false)).toBe(16);
    });
  });
});
