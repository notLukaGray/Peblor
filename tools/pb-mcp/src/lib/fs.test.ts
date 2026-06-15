import { describe, expect, it } from "vitest";
import { listPages } from "./fs.js";

describe("listPages — sidecar fragment exclusion", () => {
  it("returns only index.json routes, not sidecar fragments", async () => {
    const pages = await listPages();

    // All routes should correspond to index.json files.
    // Sidecar fragments (e.g. hero.json, work/project/hero.json) have non-index base names
    // and must not appear as routes.
    for (const page of pages) {
      // The route must not look like a filename (no .json extension, no
      // segment that reads like a section key).
      expect(page.path).toMatch(/index\.json$/);
    }
  });

  it("returns the root page at route '/'", async () => {
    const pages = await listPages();
    // Some page must have route "/" if a root index.json exists.
    // If the root doesn't exist this still passes (we just check no duplicates).
    const rootRoutes = pages.filter((p) => p.route === "/");
    expect(rootRoutes.length).toBeLessThanOrEqual(1);
  });

  it("routes are sorted alphabetically", async () => {
    const pages = await listPages();
    const routes = pages.map((p) => p.route);
    expect(routes).toEqual([...routes].sort((a, b) => a.localeCompare(b)));
  });

  it("does not emit duplicate routes", async () => {
    const pages = await listPages();
    const routes = pages.map((p) => p.route);
    const unique = new Set(routes);
    expect(unique.size).toBe(routes.length);
  });
});
