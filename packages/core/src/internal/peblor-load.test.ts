import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  readJsonFileSafe,
  coercePresetMap,
  loadPeblorAsync,
  loadPeblorByPathAsync,
  getPageSlugBases,
  getPageSlugsByBase,
  getPageSlugs,
  validatePeblor,
} from "./peblor-load";
import { resolvePagePath } from "./load/peblor-discover-pages";
import { isSafePathSegment } from "./peblor-paths";

describe("peblor-load", () => {
  describe("getPageSlugBases", () => {
    it("returns an array", async () => {
      const result = await getPageSlugBases();
      expect(Array.isArray(result)).toBe(true);
    });
    it("returns objects with non-empty slug and basePath", async () => {
      const result = await getPageSlugBases();
      for (const item of result) {
        expect(item).toHaveProperty("slug", expect.any(String));
        expect(item).toHaveProperty("basePath", expect.any(String));
        expect(item.slug.length).toBeGreaterThan(0);
        expect(item.basePath.length).toBeGreaterThan(0);
      }
    });
    it("returns only safe path segments for slug (no traversal)", async () => {
      const result = await getPageSlugBases();
      for (const item of result) {
        const slugSegments = item.slug.split("/").filter(Boolean);
        expect(slugSegments.length).toBeGreaterThan(0);
        for (const segment of slugSegments) {
          expect(isSafePathSegment(segment)).toBe(true);
        }
      }
    });
    it("returns same length and shape when called twice in same request", async () => {
      const a = await getPageSlugBases();
      const b = await getPageSlugBases();
      expect(a.length).toBe(b.length);
      if (a.length > 0) {
        expect(a[0]).toHaveProperty("slug");
        expect(a[0]).toHaveProperty("basePath");
      }
    });
  });

  describe("readJsonFileSafe", () => {
    it("returns null for non-existent file", async () => {
      const result = await readJsonFileSafe(
        path.join(process.cwd(), "nonexistent-preset-file.json")
      );
      expect(result).toBe(null);
    });

    it("returns null for invalid JSON content", async () => {
      const tempPath = path.join(os.tmpdir(), `peblor-invalid-${randomUUID()}.json`);
      fs.writeFileSync(tempPath, "{ invalid json", "utf-8");
      try {
        expect(await readJsonFileSafe(tempPath)).toBeNull();
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("loadPeblor path validation", () => {
    it("returns null for invalid slug (path traversal)", async () => {
      expect(await loadPeblorAsync("..")).toBe(null);
      expect(await loadPeblorAsync("../other")).toBe(null);
    });
    it("returns null for invalid slug (path separators)", async () => {
      expect(await loadPeblorAsync("a/b")).toBe(null);
      expect(await loadPeblorAsync("slug/../other")).toBe(null);
    });
    it("returns null for empty slug", async () => {
      expect(await loadPeblorAsync("")).toBe(null);
    });
    it("returns null for invalid slug characters", async () => {
      expect(await loadPeblorAsync(".hidden")).toBe(null);
      expect(await loadPeblorAsync("with space")).toBe(null);
    });
  });

  describe("loader parity", () => {
    it("both async entry points produce equal output for the same page", async () => {
      const slug = "unlock";
      const segments = [slug];
      const absolutePath = await resolvePagePath(segments);
      if (!absolutePath)
        throw new Error(`Page "${slug}" not found — check content/pages/${slug}/index.json exists`);

      const asyncSingle = await loadPeblorAsync(slug);
      const asyncByPath = await loadPeblorByPathAsync(segments);

      expect(asyncSingle).toEqual(asyncByPath);
    });
  });

  describe("validatePeblor", () => {
    it("returns ok true for valid page", () => {
      const result = validatePeblor(
        {
          slug: "ok",
          title: "OK",
          sectionOrder: ["hero"],
          definitions: { hero: { type: "contentBlock", elements: [] } },
        } as unknown as Parameters<typeof validatePeblor>[0],
        "ok"
      );
      expect(result.success).toBe(true);
    });

    it("returns error details for invalid page", () => {
      const result = validatePeblor(
        {
          slug: "bad",
          title: "Bad",
          sectionOrder: ["hero"],
          definitions: { hero: { type: "notASection" } },
        } as unknown as Parameters<typeof validatePeblor>[0],
        "bad"
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("coercePresetMap", () => {
    it("returns empty object for null or non-object", () => {
      expect(coercePresetMap(null)).toEqual({});
      expect(coercePresetMap(undefined)).toEqual({});
      expect(coercePresetMap("string")).toEqual({});
      expect(coercePresetMap(42)).toEqual({});
    });
    it("includes object values keyed by string", () => {
      const data = {
        a: { type: "elementVector", viewBox: "0 0 1 1", shapes: [] },
        b: { type: "elementHeading", text: "Title" },
      };
      const out = coercePresetMap(data);
      expect(Object.keys(out)).toEqual(["a", "b"]);
      expect(out.a).toMatchObject({ type: "elementVector", viewBox: "0 0 1 1" });
      expect(out.b).toMatchObject({ type: "elementHeading", text: "Title" });
    });
    it("skips non-object and invalid-block values", () => {
      const data = { skip: "string", skip2: 1, skip3: null };
      const out = coercePresetMap(data);
      expect(out).toEqual({});
    });
    it("merge order: later Object.assign overwrites earlier (caller responsibility)", () => {
      const first = { key: { type: "elementHeading", text: "First" } };
      const second = { key: { type: "elementBody", text: "Second" } };
      const merged = { ...coercePresetMap(first), ...coercePresetMap(second) };
      expect(merged.key).toMatchObject({ type: "elementBody", text: "Second" });
    });

    it("skips array values (not valid definition blocks)", () => {
      const data = { arr: [1, 2, 3] as unknown as { type: string } };
      const out = coercePresetMap(data);
      expect(out).not.toHaveProperty("arr");
    });
  });

  describe("slug-base helpers", () => {
    it("getPageSlugsByBase only returns slugs for the requested base", async () => {
      const base = "/work";
      const all = await getPageSlugBases();
      const expected = all.filter((p) => p.basePath === base).map((p) => p.slug);
      const byBase = await getPageSlugsByBase(base);
      expect(byBase).toEqual(expected);
    });

    it("getPageSlugs defaults to /work base", async () => {
      const all = await getPageSlugBases();
      const expected = all.filter((p) => p.basePath === "/work").map((p) => p.slug);
      const slugs = await getPageSlugs();
      expect(slugs).toEqual(expected);
    });
  });
});
