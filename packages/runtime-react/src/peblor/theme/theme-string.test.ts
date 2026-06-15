import { describe, expect, it } from "vitest";
import {
  lowerThemeStringToCss,
  resolveThemeString,
  resolveThemeStyleObject,
  resolveThemeValueDeep,
} from "./theme-string";

describe("theme paint string resolution", () => {
  it("keeps plain strings as the default path", () => {
    expect(resolveThemeString("#abc", "dark")).toBe("#abc");
  });

  it("prefers the active theme over value and the opposite theme", () => {
    expect(resolveThemeString({ value: "#base", light: "#light", dark: "#dark" }, "dark")).toBe(
      "#dark"
    );
    expect(resolveThemeString({ value: "#base", light: "#light", dark: "#dark" }, "light")).toBe(
      "#light"
    );
  });

  it("falls back through value, opposite theme, then undefined", () => {
    expect(resolveThemeString({ value: "#base", light: "#light" }, "dark")).toBe("#base");
    expect(resolveThemeString({ light: "#light" }, "dark")).toBe("#light");
    expect(resolveThemeString(undefined, "dark")).toBeUndefined();
  });

  it("lowers theme strings into css that preserves light/dark fallbacks", () => {
    expect(lowerThemeStringToCss("#abc")).toBe("#abc");
    expect(lowerThemeStringToCss({ light: "#fff", dark: "#000" })).toBe("light-dark(#fff, #000)");
    expect(lowerThemeStringToCss({ value: "#base", light: "#fff" })).toBe(
      "light-dark(#fff, #base)"
    );
  });

  it("resolves inline style values shallowly", () => {
    expect(
      resolveThemeStyleObject(
        {
          background: { light: "#fff", dark: "#000" },
          opacity: 0.5,
        },
        "dark"
      )
    ).toEqual({ background: "#000", opacity: 0.5 });
  });

  it("resolves nested paint values for effects and motion targets", () => {
    expect(
      resolveThemeValueDeep(
        {
          animate: {
            color: { light: "#111", dark: "#eee" },
          },
        },
        "dark"
      )
    ).toEqual({ animate: { color: "#eee" } });
  });
});
