import { describe, expect, it } from "vitest";
import { validateSlugSegments } from "./peblor-validate-slug";

describe("validateSlugSegments", () => {
  it("throws for reserved mobile segment", () => {
    expect(() => validateSlugSegments(["work", "mobile"])).toThrow(/reserved/i);
  });

  it("throws for reserved desktop segment", () => {
    expect(() => validateSlugSegments(["desktop"])).toThrow(/reserved/i);
  });

  it("allows non-reserved segments", () => {
    expect(() => validateSlugSegments(["work", "project-brand"])).not.toThrow();
  });
});
