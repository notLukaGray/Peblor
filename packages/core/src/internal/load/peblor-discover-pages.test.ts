import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PAGE_DATA_DIR } from "./peblor-load-io";
import { discoverAllPages, resolvePagePath } from "./peblor-discover-pages";

describe("resolvePagePath reserved segments", () => {
  it("throws when mobile appears in slug segments", async () => {
    await expect(resolvePagePath(["work", "mobile"])).rejects.toThrow(/reserved/i);
  });

  it("throws when desktop appears in slug segments", async () => {
    await expect(resolvePagePath(["desktop"])).rejects.toThrow(/reserved/i);
  });

  it("returns null for empty slug segments", async () => {
    await expect(resolvePagePath([])).resolves.toBeNull();
  });

  it("returns null for unsafe segment values", async () => {
    await expect(resolvePagePath([".."])).resolves.toBeNull();
    await expect(resolvePagePath(["work/project"])).resolves.toBeNull();
    await expect(resolvePagePath([".hidden"])).resolves.toBeNull();
  });

  it("returns null when target index.json does not exist", async () => {
    const access = vi.spyOn(fs.promises, "access").mockRejectedValueOnce(new Error("missing"));
    const result = await resolvePagePath(["work", "missing-page"]);
    expect(result).toBeNull();
    expect(access).toHaveBeenCalled();
    access.mockRestore();
  });

  it("returns resolved index path when file exists", async () => {
    const expected = path.resolve(PAGE_DATA_DIR, "work", "existing-page", "index.json");
    const access = vi.spyOn(fs.promises, "access").mockResolvedValueOnce(undefined);
    const realpath = vi
      .spyOn(fs.promises, "realpath")
      .mockResolvedValueOnce(expected)
      .mockResolvedValueOnce(path.resolve(PAGE_DATA_DIR));
    const result = await resolvePagePath(["work", "existing-page"]);
    expect(result).toBe(expected);
    access.mockRestore();
    realpath.mockRestore();
  });
});

describe("discoverAllPages", () => {
  it("re-scans in dev when files are added between calls", async () => {
    const rootSlug = `vitest-dev-cache-${randomUUID()}`;
    const firstPageDir = path.join(PAGE_DATA_DIR, rootSlug, "one");
    const secondPageDir = path.join(PAGE_DATA_DIR, rootSlug, "two");
    await fsPromises.mkdir(firstPageDir, { recursive: true });
    await fsPromises.writeFile(path.join(firstPageDir, "index.json"), "{}", "utf8");

    try {
      const first = (await discoverAllPages()).filter((p) => p.slugSegments[0] === rootSlug);
      expect(first.length).toBe(1);

      await fsPromises.mkdir(secondPageDir, { recursive: true });
      await fsPromises.writeFile(path.join(secondPageDir, "index.json"), "{}", "utf8");

      const second = (await discoverAllPages()).filter((p) => p.slugSegments[0] === rootSlug);
      expect(second.length).toBe(2);
    } finally {
      await fsPromises.rm(path.join(PAGE_DATA_DIR, rootSlug), { recursive: true, force: true });
    }
  });
});
