import { describe, it, expect } from "vitest";
import {
  getElementLayoutStyle,
  getLayoutRotateFlipStyle,
  normalizeLayoutInput,
  computePositioningStyle,
  computeSizingStyle,
  peblorFlexGapToCss,
  resolveFrameGapCss,
  resolveFrameRowGapCss,
  resolveFrameColumnGapCss,
  coalesceEmptyString,
  normalizeFlexAlignItemsValue,
  normalizeFlexJustifyContentValue,
  peblorJustifyContentForGap,
  peblorOverlapGapToCss,
  type ResolvedElementLayout,
} from "./element-layout-utils";

describe("element-layout-utils", () => {
  describe("getLayoutRotateFlipStyle", () => {
    it("combines rotate and flip scales", () => {
      expect(
        getLayoutRotateFlipStyle({ rotate: 12, flipHorizontal: true, flipVertical: true }).transform
      ).toContain("rotate(12deg)");
      expect(getLayoutRotateFlipStyle({ flipHorizontal: true }).transform).toContain("scaleX(-1)");
      expect(getLayoutRotateFlipStyle({ flipVertical: true }).transform).toContain("scaleY(-1)");
    });

    it("returns empty when no transform fields", () => {
      expect(getLayoutRotateFlipStyle({})).toEqual({});
      expect(getLayoutRotateFlipStyle(undefined)).toEqual({});
    });
  });

  describe("normalizeLayoutInput", () => {
    it("returns undefined for undefined layout", () => {
      expect(normalizeLayoutInput(undefined)).toBeUndefined();
      expect(normalizeLayoutInput(undefined, true)).toBeUndefined();
    });

    it("returns layout as-is when isMobile is omitted (already resolved)", () => {
      const layout = { width: "100%", align: "center" as const };
      expect(normalizeLayoutInput(layout)).toEqual(layout);
    });
  });

  describe("computePositioningStyle", () => {
    it("maps align to alignSelf and applies margins and zIndex", () => {
      const resolved: ResolvedElementLayout = {
        align: "right",
        textAlign: "center",
        marginTop: "8px",
        marginBottom: "8px",
        zIndex: 10,
      };
      expect(computePositioningStyle(resolved)).toEqual({
        alignSelf: "flex-end",
        textAlign: "center",
        marginTop: "8px",
        marginBottom: "8px",
        zIndex: 10,
      });
    });

    it("returns empty object for empty resolved", () => {
      expect(computePositioningStyle({})).toEqual({});
    });

    it("supports vertical self-alignment via alignY using auto margins", () => {
      expect(computePositioningStyle({ alignY: "center" })).toMatchObject({
        marginTop: "auto",
        marginBottom: "auto",
      });
      expect(computePositioningStyle({ alignY: "bottom" })).toMatchObject({
        marginTop: "auto",
      });
    });
  });

  describe("computeSizingStyle", () => {
    it("converts hug to fit-content and sets minWidth/minHeight for non-hug", () => {
      const resolved: ResolvedElementLayout = {
        width: "100%",
        height: "hug",
      };
      expect(computeSizingStyle(resolved)).toEqual({
        width: "100%",
        minWidth: 0,
        height: "fit-content",
      });
    });

    it("applies constraints when present", () => {
      const resolved: ResolvedElementLayout = {
        width: "50%",
        constraints: {
          minWidth: "200px",
          maxWidth: "600px",
          minHeight: "100px",
        },
      };
      const style = computeSizingStyle(resolved);
      expect(style.minWidth).toBe("200px");
      expect(style.maxWidth).toBe("600px");
      expect(style.minHeight).toBe("100px");
    });

    it("lets explicit sizing bounds override exported constraints", () => {
      const resolved: ResolvedElementLayout = {
        width: "50%",
        minWidth: "240px",
        constraints: {
          minWidth: "200px",
          maxWidth: "600px",
        },
      };
      const style = computeSizingStyle(resolved);
      expect(style.minWidth).toBe("240px");
      expect(style.maxWidth).toBe("600px");
    });
  });

  describe("getElementLayoutStyle", () => {
    it("returns empty object for undefined layout", () => {
      expect(getElementLayoutStyle(undefined)).toEqual({});
      expect(getElementLayoutStyle(undefined, true)).toEqual({});
    });

    it("representative: minimal layout (width only)", () => {
      const style = getElementLayoutStyle({ width: "200px" });
      expect(style).toMatchObject({ width: "200px", minWidth: 0 });
    });

    it("representative: hug width/height (fit-content)", () => {
      const style = getElementLayoutStyle({ width: "hug", height: "hug" });
      expect(style).toMatchObject({ width: "fit-content", height: "fit-content" });
    });

    it("representative: full layout (align, margins, constraints)", () => {
      const layout: ResolvedElementLayout = {
        width: "100%",
        height: "auto",
        align: "center",
        textAlign: "center",
        marginTop: "16px",
        marginBottom: "16px",
        zIndex: 5,
        constraints: { maxWidth: "800px" },
      };
      const style = getElementLayoutStyle(layout);
      expect(style.width).toBe("100%");
      expect(style.minWidth).toBe(0);
      expect(style.height).toBe("auto");
      expect(style.minHeight).toBe(0);
      expect(style.alignSelf).toBe("center");
      expect(style.textAlign).toBe("center");
      expect(style.marginTop).toBe("16px");
      expect(style.marginBottom).toBe("16px");
      expect(style.zIndex).toBe(5);
      expect(style.maxWidth).toBe("800px");
    });

    it("representative: responsive resolved via isMobile (desktop)", () => {
      const layout: Parameters<typeof getElementLayoutStyle>[0] = {
        width: { base: "80%", md: "100%" },
        selfAlign: { base: "left", md: "center" },
      };
      const style = getElementLayoutStyle(layout, false);
      expect(style.width).toBe("100%");
      expect(style.alignSelf).toBe("center");
    });

    it("representative: responsive resolved via isMobile (mobile)", () => {
      const layout: Parameters<typeof getElementLayoutStyle>[0] = {
        width: { base: "80%", md: "100%" },
        selfAlign: { base: "left", md: "center" },
      };
      const style = getElementLayoutStyle(layout, true);
      expect(style.width).toBe("80%");
      expect(style.alignSelf).toBe("flex-start");
    });

    it("applies responsive borderRadius", () => {
      const layout: Parameters<typeof getElementLayoutStyle>[0] = {
        width: "100%",
        borderRadius: { base: "12px", md: "24px" },
      };
      expect(getElementLayoutStyle(layout, true).borderRadius).toBe("12px");
      expect(getElementLayoutStyle(layout, false).borderRadius).toBe("24px");
    });

    it("applies responsive alignY", () => {
      const layout: Parameters<typeof getElementLayoutStyle>[0] = {
        alignY: { base: "top", md: "center" },
      };
      expect(getElementLayoutStyle(layout, true)).not.toHaveProperty("marginTop", "auto");
      expect(getElementLayoutStyle(layout, false)).toMatchObject({
        marginTop: "auto",
        marginBottom: "auto",
      });
    });

    it("applies figmaConstraints after wrapperStyle (absolute positioning)", () => {
      const style = getElementLayoutStyle({
        width: "200px",
        figmaConstraints: {
          horizontal: "LEFT",
          vertical: "TOP",
          x: 8,
          y: 12,
          width: 96,
          height: 48,
        },
        wrapperStyle: { left: "1px", top: "2px" },
      });
      expect(style).toMatchObject({
        position: "absolute",
        left: "8px",
        top: "12px",
        width: "96px",
        height: "48px",
      });
    });

    it("uses width/height auto for LEFT_RIGHT / TOP_BOTTOM stretch modes", () => {
      const h = getElementLayoutStyle({
        width: "500px",
        figmaConstraints: {
          horizontal: "LEFT_RIGHT",
          vertical: "TOP",
          x: 0,
          y: 0,
          right: 10,
          width: 400,
          height: 40,
          parentWidth: 800,
        },
      });
      expect(h.width).toBe("auto");
      expect(h.left).toBe("0px");
      expect(h.right).toBe("10px");

      const v = getElementLayoutStyle({
        height: "300px",
        figmaConstraints: {
          horizontal: "LEFT",
          vertical: "TOP_BOTTOM",
          x: 0,
          y: 5,
          bottom: 8,
          width: 40,
          height: 200,
          parentHeight: 400,
        },
      });
      expect(v.height).toBe("auto");
      expect(v.top).toBe("5px");
      expect(v.bottom).toBe("8px");
    });
  });

  describe("gap helpers", () => {
    it("omits CSS gap for auto and negative values", () => {
      expect(peblorFlexGapToCss("auto")).toBeUndefined();
      expect(peblorFlexGapToCss("-100px")).toBeUndefined();
      expect(peblorFlexGapToCss("12px")).toBe("12px");
    });

    it("extracts negative overlap offsets for supported units", () => {
      expect(peblorOverlapGapToCss("-110.93px")).toBe("-110.93px");
      expect(peblorOverlapGapToCss("20px")).toBeUndefined();
    });

    it("normalizes space-between to center for overlap rows", () => {
      expect(peblorJustifyContentForGap("space-between", "-130px")).toBe("center");
      expect(peblorJustifyContentForGap("center", "-130px")).toBe("center");
      expect(peblorJustifyContentForGap("space-between", "20px")).toBe("space-between");
    });

    it("resolveFrameGapCss falls back when gap is omitted", () => {
      expect(resolveFrameGapCss(undefined)).toBe(
        "calc((1rem) * var(--pb-density-space-multiplier, 1))"
      );
      expect(resolveFrameGapCss("")).toBe("calc((1rem) * var(--pb-density-space-multiplier, 1))");
      expect(resolveFrameGapCss("12px")).toBe("12px");
      expect(resolveFrameGapCss("auto")).toBeUndefined();
      expect(resolveFrameGapCss("-5px")).toBeUndefined();
    });

    it("resolveFrameRowGapCss and resolveFrameColumnGapCss fall back when unset in config", () => {
      expect(resolveFrameRowGapCss(undefined)).toBeUndefined();
      expect(resolveFrameRowGapCss("")).toBeUndefined();
      expect(resolveFrameColumnGapCss(undefined)).toBeUndefined();
      expect(resolveFrameColumnGapCss("8px")).toBe("8px");
    });

    it("coalesceEmptyString treats whitespace like unset", () => {
      expect(coalesceEmptyString(undefined)).toBeUndefined();
      expect(coalesceEmptyString("")).toBeUndefined();
      expect(coalesceEmptyString("  ")).toBeUndefined();
      expect(coalesceEmptyString("center")).toBe("center");
      expect(coalesceEmptyString(12)).toBe("12");
    });

    it("normalizes left/start/right/end to flex keywords", () => {
      expect(normalizeFlexAlignItemsValue("left")).toBe("flex-start");
      expect(normalizeFlexAlignItemsValue("end")).toBe("flex-end");
      expect(normalizeFlexJustifyContentValue("start")).toBe("flex-start");
      expect(normalizeFlexJustifyContentValue("right")).toBe("flex-end");
      expect(normalizeFlexJustifyContentValue("space-between")).toBe("space-between");
    });
  });
});
