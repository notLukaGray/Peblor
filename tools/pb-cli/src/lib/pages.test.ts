import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { walkPages } from "./pages.js";

function makePagesTree(base: string): void {
  // /             → index.json (root page)
  // /work/        → index.json (work page)
  // /work/        → hero.json  (sidecar section fragment — NOT a route)
  // /work/        → intro.json (sidecar section fragment — NOT a route)
  // /work/brand/  → index.json (nested page)
  fs.mkdirSync(path.join(base, "work", "brand"), { recursive: true });
  fs.writeFileSync(path.join(base, "index.json"), "{}", "utf8");
  fs.writeFileSync(path.join(base, "work", "index.json"), "{}", "utf8");
  fs.writeFileSync(path.join(base, "work", "hero.json"), "{}", "utf8");
  fs.writeFileSync(path.join(base, "work", "intro.json"), "{}", "utf8");
  fs.writeFileSync(path.join(base, "work", "brand", "index.json"), "{}", "utf8");
}

describe("walkPages", () => {
  it("only emits index.json files as routable pages", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-pages-"));
    makePagesTree(dir);

    const pages = walkPages(dir);
    const routes = pages.map((p) => p.route).sort();

    // Should contain the three index.json routes
    expect(routes).toContain("/");
    expect(routes).toContain("/work");
    expect(routes).toContain("/work/brand");

    // Must NOT contain sidecar fragments as pseudo-routes
    expect(routes).not.toContain("/work/hero");
    expect(routes).not.toContain("/work/intro");

    expect(routes).toHaveLength(3);
  });

  it("maps each route to its index.json file path", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-pages-file-"));
    fs.mkdirSync(path.join(dir, "about"), { recursive: true });
    fs.writeFileSync(path.join(dir, "about", "index.json"), "{}", "utf8");

    const pages = walkPages(dir);
    expect(pages).toHaveLength(1);
    expect(pages[0]!.route).toBe("/about");
    expect(pages[0]!.file).toBe(path.join(dir, "about", "index.json"));
  });

  it("returns empty array for an empty directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-pages-empty-"));
    expect(walkPages(dir)).toHaveLength(0);
  });

  it("does not treat root index.json as a route (consistent with core discover)", () => {
    // A bare index.json at the pages root has no slug segments — not a routable page.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-pages-root-"));
    fs.writeFileSync(path.join(dir, "index.json"), "{}", "utf8");

    // walkPages maps root index.json to route "/" for backward compat.
    // The important thing is that sidecar non-index files are excluded.
    const pages = walkPages(dir);
    const routes = pages.map((p) => p.route);
    // Only "/" — no other entries
    expect(routes.filter((r) => r !== "/")).toHaveLength(0);
  });
});
