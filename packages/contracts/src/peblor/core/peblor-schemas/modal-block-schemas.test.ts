import { describe, expect, it } from "vitest";
import { modalBuilderSchema, modalBehaviorSchema } from "./modal-block-schemas";

describe("modalBuilderSchema", () => {
  it("accepts modal definitions with section-order + definitions", () => {
    const result = modalBuilderSchema.safeParse({
      id: "signup-modal",
      title: "Sign up",
      sectionOrder: ["hero"],
      definitions: {
        hero: {
          type: "contentBlock",
          gap: "1rem",
          elements: [],
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid definition blocks", () => {
    const result = modalBuilderSchema.safeParse({
      id: "broken-modal",
      sectionOrder: ["hero"],
      definitions: {
        hero: { foo: "bar" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("parses a modal with no behavior block (backward compat)", () => {
    const result = modalBuilderSchema.safeParse({
      id: "legacy-modal",
      sectionOrder: [],
      definitions: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.behavior).toBeUndefined();
    }
  });

  it("parses a modal with a full behavior block", () => {
    const result = modalBuilderSchema.safeParse({
      id: "full-behavior-modal",
      sectionOrder: [],
      definitions: {},
      behavior: {
        size: "lg",
        position: "center",
        closeOnBackdropClick: false,
        closeOnEscape: true,
        trapFocus: true,
        backdrop: { color: "rgba(0,0,0,0.6)", blur: "8px", hidden: false },
        zIndex: 1000,
        ariaLabel: "Subscribe to newsletter",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.behavior?.size).toBe("lg");
      expect(result.data.behavior?.position).toBe("center");
      expect(result.data.behavior?.closeOnBackdropClick).toBe(false);
      expect(result.data.behavior?.ariaLabel).toBe("Subscribe to newsletter");
    }
  });

  it("parses a drawer modal with explicit dimensions", () => {
    const result = modalBuilderSchema.safeParse({
      id: "right-drawer",
      sectionOrder: [],
      definitions: {},
      behavior: {
        position: "right",
        width: "24rem",
        maxWidth: "80vw",
        maxHeight: "100vh",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.behavior?.position).toBe("right");
      expect(result.data.behavior?.width).toBe("24rem");
    }
  });
});

describe("modalBehaviorSchema", () => {
  it("rejects an invalid size enum value", () => {
    const result = modalBehaviorSchema.safeParse({ size: "2xl" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid position enum value", () => {
    const result = modalBehaviorSchema.safeParse({ position: "diagonal" });
    expect(result.success).toBe(false);
  });

  it("accepts partial behavior (only some fields set)", () => {
    const result = modalBehaviorSchema.safeParse({ closeOnEscape: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.closeOnEscape).toBe(false);
      expect(result.data.size).toBeUndefined();
    }
  });

  it("accepts all valid size enum values", () => {
    for (const size of ["sm", "md", "lg", "xl", "full"] as const) {
      const result = modalBehaviorSchema.safeParse({ size });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid position enum values", () => {
    for (const position of ["center", "top", "bottom", "left", "right"] as const) {
      const result = modalBehaviorSchema.safeParse({ position });
      expect(result.success).toBe(true);
    }
  });

  it("parses backdrop with hidden: true", () => {
    const result = modalBehaviorSchema.safeParse({ backdrop: { hidden: true } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.backdrop?.hidden).toBe(true);
    }
  });
});
