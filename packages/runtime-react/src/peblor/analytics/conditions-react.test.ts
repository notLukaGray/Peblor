import { describe, expect, it } from "vitest";
import { evaluateConditions } from "./conditions";

describe("runtime evaluateConditions", () => {
  it("returns true for undefined conditions", () => {
    expect(evaluateConditions(undefined)).toBe(true);
  });

  it("returns true for empty conditions", () => {
    expect(evaluateConditions({})).toBe(true);
  });

  it("returns false when viewport is below minViewportWidth", () => {
    expect(evaluateConditions({ minViewportWidth: 768 }, 375, 0)).toBe(false);
  });

  it("returns true when viewport meets minViewportWidth", () => {
    expect(evaluateConditions({ minViewportWidth: 768 }, 1024, 0)).toBe(true);
  });

  it("returns false when scroll progress is below threshold", () => {
    expect(evaluateConditions({ scrollProgress: 0.5 }, 1024, 0.3)).toBe(false);
  });

  it("returns true when scroll progress meets threshold", () => {
    expect(evaluateConditions({ scrollProgress: 0.5 }, 1024, 0.7)).toBe(true);
  });

  it("returns true when scroll progress equals threshold", () => {
    expect(evaluateConditions({ scrollProgress: 0.5 }, 1024, 0.5)).toBe(true);
  });
});
