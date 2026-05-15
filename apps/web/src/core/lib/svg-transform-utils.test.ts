import { describe, it, expect } from "vitest";
import {
  parseTransformString,
  buildGradientTransformMatrix,
  serializeTransformMatrix,
  convertRotateToMatrix,
} from "./svg-transform-utils";

describe("svg-transform-utils", () => {
  describe("parseTransformString", () => {
    it("parses rotate(angle)", () => {
      expect(parseTransformString("rotate(90)")).toEqual({
        type: "rotate",
        angle: 90,
        cx: 0,
        cy: 0,
      });
    });

    it("parses rotate(angle cx cy)", () => {
      expect(parseTransformString("rotate(167 0.5 0.5)")).toEqual({
        type: "rotate",
        angle: 167,
        cx: 0.5,
        cy: 0.5,
      });
    });

    it("returns null for non-rotate", () => {
      expect(parseTransformString("matrix(1 0 0 1 0 0)")).toBeNull();
      expect(parseTransformString("translate(10 20)")).toBeNull();
      expect(parseTransformString("")).toBeNull();
      expect(parseTransformString(null)).toBeNull();
    });
  });

  describe("buildGradientTransformMatrix + serializeTransformMatrix", () => {
    it("rotate(0) produces identity-like matrix", () => {
      const parsed = parseTransformString("rotate(0)");
      const matrix = buildGradientTransformMatrix(parsed);
      expect(matrix).not.toBeNull();
      expect(matrix![0]).toBeCloseTo(1);
      expect(matrix![1]).toBeCloseTo(0);
      expect(matrix![2]).toBeCloseTo(0);
      expect(matrix![3]).toBeCloseTo(1);
      expect(serializeTransformMatrix(matrix!)).toMatch(/^matrix\([\d.\s-]+\)$/);
    });

    it("rotate(90 0.5 0.5) produces expected matrix string", () => {
      const parsed = parseTransformString("rotate(90 0.5 0.5)");
      const matrix = buildGradientTransformMatrix(parsed);
      expect(matrix).not.toBeNull();
      const out = serializeTransformMatrix(matrix!);
      expect(out).toMatch(/^matrix\([\d.\s-]+\)$/);
      // cos(90°)=0, sin(90°)=1 => m11=0, m21=1, m12=-1, m22=0
      expect(matrix![0]).toBeCloseTo(0);
      expect(matrix![1]).toBeCloseTo(1);
      expect(matrix![2]).toBeCloseTo(-1);
      expect(matrix![3]).toBeCloseTo(0);
    });
  });

  describe("convertRotateToMatrix (gradient transform behavior)", () => {
    it("converts rotate(167 0.5 0.5) to matrix string", () => {
      const input = "rotate(167 0.5 0.5)";
      const result = convertRotateToMatrix(input);
      expect(result).not.toBe(input);
      expect(result).toMatch(/^matrix\([\d.\s-]+\)$/);
    });

    it("passes through non-rotate transform unchanged", () => {
      const input = "matrix(1 0 0 1 0 0)";
      expect(convertRotateToMatrix(input)).toBe(input);
    });

    it("returns undefined for null", () => {
      expect(convertRotateToMatrix(null)).toBeUndefined();
    });
  });
});
