import { describe, expect, it } from "vitest";
import type { FilterConfig } from "@pb/contracts";
import { buildFilterQueryString, parseFiltersFromQuery } from "./parse-page-filters";

const config: FilterConfig = {
  categories: [
    { key: "brand", label: "Brand" },
    { key: "ability", label: "Ability" },
  ],
};

describe("parseFiltersFromQuery", () => {
  it("returns empty when no query or no config", () => {
    expect(parseFiltersFromQuery(undefined, config)).toEqual({});
    expect(parseFiltersFromQuery({ brand: "alpha" }, undefined)).toEqual({});
  });

  it("reads single string values for declared categories", () => {
    expect(parseFiltersFromQuery({ brand: "alpha" }, config)).toEqual({
      brand: ["alpha"],
    });
  });

  it("reads array form (?brand=a&brand=b)", () => {
    expect(parseFiltersFromQuery({ brand: ["alpha", "echo"] }, config)).toEqual({
      brand: ["alpha", "echo"],
    });
  });

  it("reads csv form (?brand=a,b)", () => {
    expect(parseFiltersFromQuery({ brand: "alpha,echo" }, config)).toEqual({
      brand: ["alpha", "echo"],
    });
  });

  it("ignores unknown categories not declared in filterConfig", () => {
    expect(
      parseFiltersFromQuery({ brand: "alpha", topic: "anything", unlock: "1" }, config)
    ).toEqual({ brand: ["alpha"] });
  });

  it("strips whitespace and skips empty entries", () => {
    expect(parseFiltersFromQuery({ brand: " alpha , , echo " }, config)).toEqual({
      brand: ["alpha", "echo"],
    });
  });

  it("omits categories whose only values are empty", () => {
    expect(parseFiltersFromQuery({ brand: ",,," }, config)).toEqual({});
  });
});

describe("buildFilterQueryString", () => {
  it("returns empty string for no filters", () => {
    expect(buildFilterQueryString({})).toBe("");
  });

  it("builds repeating-key query string for multi-value", () => {
    expect(buildFilterQueryString({ brand: ["alpha", "echo"] })).toBe("?brand=alpha&brand=echo");
  });
});
