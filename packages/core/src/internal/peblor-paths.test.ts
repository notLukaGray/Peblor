import path from "path";
import { describe, it, expect } from "vitest";
import { isSafePathSegment, isSafeJsonFilename, resolvePathUnder } from "./peblor-paths";

describe("peblor-paths", () => {
  describe("isSafePathSegment", () => {
    it("accepts alphanumeric, hyphen, underscore", () => {
      expect(isSafePathSegment("home")).toBe(true);
      expect(isSafePathSegment("my-page")).toBe(true);
      expect(isSafePathSegment("section_1")).toBe(true);
      expect(isSafePathSegment("a")).toBe(true);
      expect(isSafePathSegment("ABC123")).toBe(true);
    });
    it("rejects empty or non-string", () => {
      expect(isSafePathSegment("")).toBe(false);
      expect(isSafePathSegment(null as unknown as string)).toBe(false);
      expect(isSafePathSegment(undefined as unknown as string)).toBe(false);
    });
    it("rejects path traversal and separators", () => {
      expect(isSafePathSegment("..")).toBe(false);
      expect(isSafePathSegment(".")).toBe(false);
      expect(isSafePathSegment("a/b")).toBe(false);
      expect(isSafePathSegment("a\\b")).toBe(false);
      expect(isSafePathSegment("../etc/passwd")).toBe(false);
    });
    it("rejects dots and other disallowed chars", () => {
      expect(isSafePathSegment("my.page")).toBe(false);
      expect(isSafePathSegment("file.json")).toBe(false);
      expect(isSafePathSegment("a b")).toBe(false);
      expect(isSafePathSegment("a\x00b")).toBe(false);
    });
    it("rejects over-long segment", () => {
      expect(isSafePathSegment("a".repeat(201))).toBe(false);
      expect(isSafePathSegment("a".repeat(200))).toBe(true);
    });
  });

  describe("isSafeJsonFilename", () => {
    it("accepts safe basename with .json", () => {
      expect(isSafeJsonFilename("home.json")).toBe(true);
      expect(isSafeJsonFilename("my-page.json")).toBe(true);
      expect(isSafeJsonFilename("section_1.json")).toBe(true);
    });
    it("rejects non-.json suffix", () => {
      expect(isSafeJsonFilename("home")).toBe(false);
      expect(isSafeJsonFilename("home.txt")).toBe(false);
    });
    it("rejects empty basename", () => {
      expect(isSafeJsonFilename(".json")).toBe(false);
    });
    it("rejects invalid basename chars", () => {
      expect(isSafeJsonFilename("my.page.json")).toBe(false);
      expect(isSafeJsonFilename("a/b.json")).toBe(false);
    });
  });

  describe("resolvePathUnder", () => {
    const base = path.join(process.cwd(), "src", "data", "work");

    it("returns resolved path when segments are safe and under base", () => {
      const result = resolvePathUnder(base, "home.json");
      expect(result).toBe(path.resolve(base, "home.json"));
    });
    it("returns path for safe multi-segment", () => {
      const result = resolvePathUnder(base, "my-slug", "section_1.json");
      expect(result).toBe(path.resolve(base, "my-slug", "section_1.json"));
    });
    it("returns null when segment is invalid", () => {
      expect(resolvePathUnder(base, "..")).toBe(null);
      expect(resolvePathUnder(base, "../other")).toBe(null);
      expect(resolvePathUnder(base, "a/b")).toBe(null);
      expect(resolvePathUnder(base, "")).toBe(null);
    });
    it("returns null when path escapes base", () => {
      const result = resolvePathUnder(base, "..", "other");
      expect(result).toBe(null);
    });
    it("accepts .json filename segment", () => {
      const result = resolvePathUnder(base, "slug-sections.json");
      expect(result).toBe(path.resolve(base, "slug-sections.json"));
    });
  });
});
