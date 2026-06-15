import { describe, expect, it } from "vitest";
import { inferFragmentKind, fragmentKindToCliCommand, SECTION_TYPES } from "./fragment-kind.js";

describe("inferFragmentKind", () => {
  it("returns 'element' for element type strings", () => {
    expect(inferFragmentKind({ type: "elementHeading" })).toBe("element");
    expect(inferFragmentKind({ type: "elementBody" })).toBe("element");
    expect(inferFragmentKind({ type: "elementImage" })).toBe("element");
  });

  it("returns 'bg' for background type strings", () => {
    expect(inferFragmentKind({ type: "backgroundImage" })).toBe("bg");
    expect(inferFragmentKind({ type: "backgroundVideo" })).toBe("bg");
  });

  it("returns 'module' for module type", () => {
    expect(inferFragmentKind({ type: "module" })).toBe("module");
  });

  it("returns 'section' for all known section types", () => {
    for (const t of SECTION_TYPES) {
      expect(inferFragmentKind({ type: t })).toBe("section");
    }
  });

  it("returns 'action' for other type strings", () => {
    expect(inferFragmentKind({ type: "navigate" })).toBe("action");
    expect(inferFragmentKind({ type: "modalOpen" })).toBe("action");
  });

  it("returns 'fragment' for null/array/non-typed objects", () => {
    expect(inferFragmentKind(null)).toBe("fragment");
    expect(inferFragmentKind([])).toBe("fragment");
    expect(inferFragmentKind({})).toBe("fragment");
    expect(inferFragmentKind("string")).toBe("fragment");
  });

  it("unwraps preset file wrappers", () => {
    expect(inferFragmentKind({ "my-preset": { type: "elementHeading", text: "hi" } })).toBe(
      "element"
    );
    expect(inferFragmentKind({ hero: { type: "contentBlock" } })).toBe("section");
  });
});

describe("fragmentKindToCliCommand", () => {
  it("maps each kind to the correct CLI command", () => {
    expect(fragmentKindToCliCommand("section")).toBe("validate-section");
    expect(fragmentKindToCliCommand("element")).toBe("validate-element");
    expect(fragmentKindToCliCommand("action")).toBe("validate-action");
    expect(fragmentKindToCliCommand("bg")).toBe("validate-bg");
    expect(fragmentKindToCliCommand("module")).toBe("validate-module-fragment");
    expect(fragmentKindToCliCommand("overlay")).toBe("validate-overlay-fragment");
    expect(fragmentKindToCliCommand("fragment")).toBe("validate-fragment");
    expect(fragmentKindToCliCommand("motion")).toBe("validate-fragment");
  });
});
