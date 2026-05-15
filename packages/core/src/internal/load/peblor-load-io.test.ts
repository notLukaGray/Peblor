import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  readJsonFileSafe,
  coercePresetMap,
  parseJsonSafe,
  PAGE_DATA_DIR,
  PAGE_IGNORE,
  resolveSlugDir,
} from "../load/peblor-load-io";

describe("peblor-load-io", () => {
  describe("readJsonFileSafe", () => {
    it("returns null for non-existent file", async () => {
      await expect(
        readJsonFileSafe(path.join(process.cwd(), "nonexistent-file-xyz.json"))
      ).resolves.toBe(null);
    });

    it("returns null for invalid json", async () => {
      const tempPath = path.join(os.tmpdir(), `load-io-invalid-${randomUUID()}.json`);
      fs.writeFileSync(tempPath, "{bad json", "utf-8");
      try {
        await expect(readJsonFileSafe(tempPath)).resolves.toBeNull();
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe("parseJsonSafe", () => {
    it("returns ok and data for valid JSON", () => {
      const r = parseJsonSafe<{ a: number }>('{"a":1}');
      expect(r).toEqual({ ok: true, data: { a: 1 } });
    });
    it("returns ok false for invalid JSON", () => {
      const r = parseJsonSafe("not json");
      expect(r.ok).toBe(false);
      expect("error" in r && r.error).toBeDefined();
    });
    it("parses array JSON payloads", () => {
      const r = parseJsonSafe<number[]>("[1,2,3]");
      expect(r).toEqual({ ok: true, data: [1, 2, 3] });
    });
  });

  describe("coercePresetMap", () => {
    it("returns empty object for null or non-object", () => {
      expect(coercePresetMap(null)).toEqual({});
      expect(coercePresetMap("x")).toEqual({});
    });
    it("includes object values keyed by string", () => {
      const data = { k: { type: "elementVector", shapes: [] } };
      expect(coercePresetMap(data)).toEqual(data);
    });
    it("skips primitive values and keeps object-like values", () => {
      const out = coercePresetMap({ keep: { type: "x" }, skip: 1, skip2: "s" });
      expect(out).toEqual({ keep: { type: "x" } });
    });
  });

  describe("constants", () => {
    it("PAGE_DATA_DIR is a string path", () => {
      expect(typeof PAGE_DATA_DIR).toBe("string");
      expect(PAGE_DATA_DIR).toContain("content");
      expect(PAGE_DATA_DIR).toContain("pages");
    });
    it("PAGE_IGNORE is a Set", () => {
      expect(PAGE_IGNORE).toBeInstanceOf(Set);
      expect(PAGE_IGNORE.has("schema.example.json")).toBe(true);
    });
  });

  describe("resolveSlugDir", () => {
    it("returns null for unsafe slug", () => {
      expect(resolveSlugDir("../bad")).toBeNull();
      expect(resolveSlugDir("with space")).toBeNull();
    });

    it("returns path under PAGE_DATA_DIR for safe slug", () => {
      const resolved = resolveSlugDir("unlock");
      expect(resolved).toBe(path.resolve(PAGE_DATA_DIR, "unlock"));
    });
  });
});
