import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { CONTENT_DIR } from "./loader";

function collectJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dev" || entry.name === "presets") continue;
      results.push(...collectJsonFiles(fullPath));
    } else if (entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

function readTextIfPresent(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

describe("content lint: placeholder strings absent from production content", () => {
  const pagesDir = path.join(CONTENT_DIR, "pages");
  const siteDir = path.join(CONTENT_DIR, "site");

  it("no production content file contains example.com", () => {
    const files = [...collectJsonFiles(pagesDir), ...collectJsonFiles(siteDir)];
    const violations: string[] = [];

    for (const file of files) {
      const raw = readTextIfPresent(file);
      if (raw == null) continue;
      if (raw.includes("example.com")) {
        violations.push(path.relative(CONTENT_DIR, file));
      }
    }

    expect(violations).toEqual([]);
  });

  it("no production content file contains FPO in ariaLabel or text", () => {
    const files = [...collectJsonFiles(pagesDir), ...collectJsonFiles(siteDir)];
    const violations: string[] = [];

    for (const file of files) {
      const raw = readTextIfPresent(file);
      if (raw == null) continue;
      if (raw.includes('"FPO')) {
        violations.push(path.relative(CONTENT_DIR, file));
      }
    }

    expect(violations).toEqual([]);
  });
});
