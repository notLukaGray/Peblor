import { describe, expect, it } from "vitest";
import { elementHeadingSchema } from "./element-content-schemas";
// Importing element-block-schemas ensures registerElementSchema() is called (needed for unions).
import "./element-block-schemas";

/**
 * Gap 1.3 — element-level layout gap fields added to elementLayoutSchemaBase.
 * Tests parse acceptance of the new optional fields and rejection of invalid enum values.
 */
describe("element base layout gaps (gap 1.3)", () => {
  describe("aspectRatio", () => {
    it("accepts string aspect ratio", () => {
      const result = elementHeadingSchema.safeParse({
        type: "elementHeading",
        text: "Title",
        aspectRatio: "16 / 9",
      });
      expect(result.success).toBe(true);
    });

    it("accepts numeric aspect ratio", () => {
      const result = elementHeadingSchema.safeParse({
        type: "elementHeading",
        text: "Title",
        aspectRatio: 1.777,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("scrollX / scrollY", () => {
    it("accepts valid scrollX values", () => {
      for (const val of ["hidden", "visible", "auto", "scroll", "clip"] as const) {
        expect(
          elementHeadingSchema.safeParse({
            type: "elementHeading",
            text: "T",
            scrollX: val,
          }).success
        ).toBe(true);
      }
    });

    it("rejects invalid scrollX value", () => {
      const result = elementHeadingSchema.safeParse({
        type: "elementHeading",
        text: "T",
        scrollX: "bogus",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid scrollY values", () => {
      for (const val of ["hidden", "visible", "auto", "scroll", "clip"] as const) {
        expect(
          elementHeadingSchema.safeParse({
            type: "elementHeading",
            text: "T",
            scrollY: val,
          }).success
        ).toBe(true);
      }
    });

    it("rejects invalid scrollY value", () => {
      const result = elementHeadingSchema.safeParse({
        type: "elementHeading",
        text: "T",
        scrollY: "marquee",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("transformOrigin", () => {
    it("accepts string transform origin", () => {
      const result = elementHeadingSchema.safeParse({
        type: "elementHeading",
        text: "T",
        transformOrigin: "top left",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("isolation", () => {
    it("accepts 'isolate'", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          isolation: "isolate",
        }).success
      ).toBe(true);
    });

    it("accepts 'auto'", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          isolation: "auto",
        }).success
      ).toBe(true);
    });

    it("rejects invalid isolation value", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          isolation: "inherit",
        }).success
      ).toBe(false);
    });
  });

  describe("maskImage", () => {
    it("accepts raw CSS mask-image string", () => {
      const result = elementHeadingSchema.safeParse({
        type: "elementHeading",
        text: "T",
        maskImage: "linear-gradient(black, transparent)",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("scrollMarginTop", () => {
    it("accepts string value", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          scrollMarginTop: "80px",
        }).success
      ).toBe(true);
    });

    it("accepts numeric value (px)", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          scrollMarginTop: 80,
        }).success
      ).toBe(true);
    });
  });

  describe("contentVisibility", () => {
    it("accepts valid contentVisibility values", () => {
      for (const val of ["visible", "auto", "hidden"] as const) {
        expect(
          elementHeadingSchema.safeParse({
            type: "elementHeading",
            text: "T",
            contentVisibility: val,
          }).success
        ).toBe(true);
      }
    });

    it("rejects invalid contentVisibility value", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          contentVisibility: "collapse",
        }).success
      ).toBe(false);
    });
  });

  describe("contain", () => {
    it("accepts contain string", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          contain: "layout paint",
        }).success
      ).toBe(true);
    });
  });

  describe("visuallyHidden", () => {
    it("accepts visuallyHidden: true", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "Screen-reader only label",
          visuallyHidden: true,
        }).success
      ).toBe(true);
    });

    it("accepts visuallyHidden: false", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          visuallyHidden: false,
        }).success
      ).toBe(true);
    });

    it("accepts visuallyHidden alongside hidden (independent fields)", () => {
      // Both can coexist — they're independent. hidden => display:none, visuallyHidden => sr-only.
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          hidden: false,
          visuallyHidden: true,
        }).success
      ).toBe(true);
    });

    it("rejects non-boolean visuallyHidden", () => {
      expect(
        elementHeadingSchema.safeParse({
          type: "elementHeading",
          text: "T",
          visuallyHidden: "yes",
        }).success
      ).toBe(false);
    });
  });

  describe("JSON null treated as absent (SCHEMA-2 compat)", () => {
    it("accepts null for all new optional fields", () => {
      const result = elementHeadingSchema.safeParse({
        type: "elementHeading",
        text: "T",
        aspectRatio: null,
        scrollX: null,
        scrollY: null,
        transformOrigin: null,
        isolation: null,
        maskImage: null,
        scrollMarginTop: null,
        contentVisibility: null,
        contain: null,
        visuallyHidden: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
