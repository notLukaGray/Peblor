import { describe, expect, it } from "vitest";
import { evaluateConditions, getScrollProgress } from "./conditions";

describe("evaluateConditions", () => {
  it("returns true when config is undefined", () => {
    expect(evaluateConditions(undefined)).toBe(true);
  });

  it("returns true when conditions is undefined", () => {
    expect(evaluateConditions({})).toBe(true);
  });

  it("returns true when conditions is empty object", () => {
    expect(evaluateConditions({ conditions: {} })).toBe(true);
  });

  it("returns false when viewport is below minViewportWidth", () => {
    expect(
      evaluateConditions(
        { conditions: { minViewportWidth: 768 } },
        { viewportWidth: 375, scrollProgress: 0 }
      )
    ).toBe(false);
  });

  it("returns true when viewport meets minViewportWidth", () => {
    expect(
      evaluateConditions(
        { conditions: { minViewportWidth: 768 } },
        { viewportWidth: 1024, scrollProgress: 0 }
      )
    ).toBe(true);
  });

  it("returns true at exact minViewportWidth boundary", () => {
    expect(
      evaluateConditions(
        { conditions: { minViewportWidth: 768 } },
        { viewportWidth: 768, scrollProgress: 0 }
      )
    ).toBe(true);
  });

  it("returns false when viewport is above maxViewportWidth", () => {
    expect(
      evaluateConditions(
        { conditions: { maxViewportWidth: 768 } },
        { viewportWidth: 1024, scrollProgress: 0 }
      )
    ).toBe(false);
  });

  it("returns true when viewport is within maxViewportWidth", () => {
    expect(
      evaluateConditions(
        { conditions: { maxViewportWidth: 1024 } },
        { viewportWidth: 768, scrollProgress: 0 }
      )
    ).toBe(true);
  });

  it("returns false when scroll progress is below threshold", () => {
    expect(
      evaluateConditions(
        { conditions: { scrollProgress: 0.5 } },
        { viewportWidth: 1024, scrollProgress: 0.3 }
      )
    ).toBe(false);
  });

  it("returns true when scroll progress meets threshold", () => {
    expect(
      evaluateConditions(
        { conditions: { scrollProgress: 0.5 } },
        { viewportWidth: 1024, scrollProgress: 0.7 }
      )
    ).toBe(true);
  });

  it("returns true at exact scrollProgress boundary", () => {
    expect(
      evaluateConditions(
        { conditions: { scrollProgress: 0.5 } },
        { viewportWidth: 1024, scrollProgress: 0.5 }
      )
    ).toBe(true);
  });

  it("evaluates combined conditions — both pass", () => {
    expect(
      evaluateConditions(
        { conditions: { minViewportWidth: 768, scrollProgress: 0.5 } },
        { viewportWidth: 1024, scrollProgress: 0.7 }
      )
    ).toBe(true);
  });

  it("evaluates combined conditions — viewport fails", () => {
    expect(
      evaluateConditions(
        { conditions: { minViewportWidth: 768, scrollProgress: 0.5 } },
        { viewportWidth: 375, scrollProgress: 0.7 }
      )
    ).toBe(false);
  });

  it("evaluates combined conditions — scroll fails", () => {
    expect(
      evaluateConditions(
        { conditions: { minViewportWidth: 768, scrollProgress: 0.5 } },
        { viewportWidth: 1024, scrollProgress: 0.2 }
      )
    ).toBe(false);
  });
});

describe("getScrollProgress", () => {
  it("returns 0 when document has zero scrollable height", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    expect(getScrollProgress()).toBe(0);
  });
});
