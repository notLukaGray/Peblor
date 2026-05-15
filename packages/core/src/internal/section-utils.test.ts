import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseCssValueToPixels,
  normalizeCssValue,
  parseNumericWithUnit,
  convertToPixels,
  computeParallaxOffset,
  type ParseCssContext,
} from "./section-utils";

describe("section-utils", () => {
  const baseCtx: ParseCssContext = {
    rootFontSizePx: 16,
    viewportWidth: 1920,
    viewportHeight: 1080,
    isVertical: true,
  };

  describe("normalizeCssValue", () => {
    it("trims whitespace", () => {
      expect(normalizeCssValue("  20px ")).toBe("20px");
    });
  });

  describe("parseNumericWithUnit", () => {
    it("parses px", () => {
      expect(parseNumericWithUnit("16px")).toEqual({ num: 16, unit: "px" });
    });
    it("parses rem", () => {
      expect(parseNumericWithUnit("1rem")).toEqual({ num: 1, unit: "rem" });
    });
    it("parses decimal rem", () => {
      expect(parseNumericWithUnit("1.5rem")).toEqual({ num: 1.5, unit: "rem" });
    });
    it("parses em", () => {
      expect(parseNumericWithUnit("2em")).toEqual({ num: 2, unit: "em" });
    });
    it("returns null for invalid string", () => {
      expect(parseNumericWithUnit("abc")).toBe(null);
      expect(parseNumericWithUnit("16")).toBe(null);
      expect(parseNumericWithUnit("")).toBe(null);
    });
  });

  describe("convertToPixels", () => {
    it("converts px directly", () => {
      expect(convertToPixels({ num: 16, unit: "px" }, baseCtx)).toBe(16);
    });
    it("converts rem using root font size", () => {
      expect(convertToPixels({ num: 1, unit: "rem" }, baseCtx)).toBe(16);
      expect(convertToPixels({ num: 1.5, unit: "rem" }, baseCtx)).toBe(24);
    });
    it("converts vh when isVertical", () => {
      expect(convertToPixels({ num: 50, unit: "vh" }, baseCtx)).toBe(540);
    });
    it("converts vw when !isVertical", () => {
      const ctx = { ...baseCtx, isVertical: false };
      expect(convertToPixels({ num: 50, unit: "vw" }, ctx)).toBe(960);
    });
    it("returns null when axis and viewport unit do not match orientation", () => {
      expect(convertToPixels({ num: 50, unit: "vh" }, { ...baseCtx, isVertical: false })).toBe(
        null
      );
      expect(convertToPixels({ num: 50, unit: "vw" }, { ...baseCtx, isVertical: true })).toBe(null);
    });
    it("returns null for %", () => {
      expect(convertToPixels({ num: 50, unit: "%" }, baseCtx)).toBe(null);
    });
    it("returns null when ctx is null for rem/vh/vw", () => {
      expect(convertToPixels({ num: 1, unit: "rem" }, null)).toBe(null);
      expect(convertToPixels({ num: 1, unit: "em" }, null)).toBe(null);
      expect(convertToPixels({ num: 50, unit: "vh" }, null)).toBe(null);
      expect(convertToPixels({ num: 50, unit: "vw" }, null)).toBe(null);
    });
    it("px works without ctx", () => {
      expect(convertToPixels({ num: 16, unit: "px" }, null)).toBe(16);
    });
  });

  describe("parseCssValueToPixels", () => {
    beforeEach(() => {
      vi.stubGlobal("document", {
        documentElement: {
          getAttribute: () => null,
        },
      });
      vi.stubGlobal("window", {
        innerWidth: 1920,
        innerHeight: 1080,
      });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('"16px" => 16', () => {
      expect(parseCssValueToPixels("16px", true)).toBe(16);
    });
    it('"1rem" => expected based on ctx (16 with default root)', () => {
      Object.defineProperty(document, "documentElement", {
        get: () => ({
          getAttribute: () => null,
        }),
      });
      const getComputedStyle = vi.fn(() => ({ fontSize: "16px" }));
      vi.stubGlobal("document", {
        documentElement: {},
        defaultView: { getComputedStyle },
      });
      (global as unknown as { getComputedStyle: unknown }).getComputedStyle = getComputedStyle;
      expect(parseCssValueToPixels("1rem", true)).toBe(16);
    });
    it('"1.5rem" => 24 with 16px root', () => {
      const getComputedStyle = vi.fn(() => ({ fontSize: "16px" }));
      vi.stubGlobal("document", {
        documentElement: {},
      });
      (global as unknown as { getComputedStyle: unknown }).getComputedStyle = getComputedStyle;
      expect(parseCssValueToPixels("1.5rem", true)).toBe(24);
    });
    it("em uses root font size context like rem", () => {
      const getComputedStyle = vi.fn(() => ({ fontSize: "10px" }));
      vi.stubGlobal("document", {
        documentElement: {},
      });
      (global as unknown as { getComputedStyle: unknown }).getComputedStyle = getComputedStyle;
      expect(parseCssValueToPixels("1.5em", true)).toBe(15);
    });
    it('"  20px " trims and works', () => {
      expect(parseCssValueToPixels("  20px ", true)).toBe(20);
    });
    it("invalid string returns null", () => {
      expect(parseCssValueToPixels("invalid", true)).toBe(null);
      expect(parseCssValueToPixels("", true)).toBe(null);
    });
    it("% behaves as current (null)", () => {
      expect(parseCssValueToPixels("50%", true)).toBe(null);
    });
    it("number passes through", () => {
      expect(parseCssValueToPixels(42, true)).toBe(42);
    });
    it("undefined returns null", () => {
      expect(parseCssValueToPixels(undefined, true)).toBe(null);
    });
    it("non-finite number returns null", () => {
      expect(parseCssValueToPixels(NaN, true)).toBe(null);
      expect(parseCssValueToPixels(Infinity, true)).toBe(null);
    });
  });

  describe("computeParallaxOffset", () => {
    const defaultSpeed = 1;

    it("returns 0 when scrollSpeed equals defaultScrollSpeed", () => {
      expect(
        computeParallaxOffset(100, {
          scrollSpeed: 1,
          defaultScrollSpeed: defaultSpeed,
          basePosition: null,
          sectionTop: 0,
        })
      ).toBe(0);
    });

    it("absolute mode (basePosition set): offset = -(scrollTop * multiplier)", () => {
      expect(
        computeParallaxOffset(200, {
          scrollSpeed: 1.5,
          defaultScrollSpeed: defaultSpeed,
          basePosition: 0,
          sectionTop: 0,
        })
      ).toBe(-100);
    });

    it("section-relative: offset is continuous when scrollTop < sectionTop", () => {
      expect(
        computeParallaxOffset(50, {
          scrollSpeed: 1.2,
          defaultScrollSpeed: defaultSpeed,
          basePosition: null,
          sectionTop: 100,
        })
      ).toBeCloseTo(-10); // (50 - 100) * 0.2
    });

    it("section-relative: offset = (scrollTop - sectionTop) * multiplier when scrollTop >= sectionTop", () => {
      expect(
        computeParallaxOffset(200, {
          scrollSpeed: 1.2,
          defaultScrollSpeed: defaultSpeed,
          basePosition: null,
          sectionTop: 100,
        })
      ).toBeCloseTo(20);
    });
  });
});
