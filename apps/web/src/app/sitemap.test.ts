import fsPromises from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PAGE_DATA_DIR } from "@pb/core/loader";
import sitemap from "./sitemap";

const fixtures = {
  protectedVisibility: path.join(PAGE_DATA_DIR, "vitest-sitemap-protected-visibility"),
  protectedPassword: path.join(PAGE_DATA_DIR, "vitest-sitemap-protected-password"),
  unlisted: path.join(PAGE_DATA_DIR, "vitest-sitemap-unlisted"),
  noindex: path.join(PAGE_DATA_DIR, "vitest-sitemap-noindex"),
  public: path.join(PAGE_DATA_DIR, "vitest-sitemap-public"),
};

describe("sitemap page indexing filters", () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    await fsPromises.mkdir(fixtures.protectedVisibility, { recursive: true });
    await fsPromises.writeFile(
      path.join(fixtures.protectedVisibility, "index.json"),
      JSON.stringify({ title: "Protected", visibility: "protected", sectionOrder: [] }),
      "utf8"
    );

    await fsPromises.mkdir(fixtures.protectedPassword, { recursive: true });
    await fsPromises.writeFile(
      path.join(fixtures.protectedPassword, "index.json"),
      JSON.stringify({ title: "Protected", passwordProtected: true, sectionOrder: [] }),
      "utf8"
    );

    await fsPromises.mkdir(fixtures.unlisted, { recursive: true });
    await fsPromises.writeFile(
      path.join(fixtures.unlisted, "index.json"),
      JSON.stringify({ title: "Unlisted", visibility: "unlisted", sectionOrder: [] }),
      "utf8"
    );

    await fsPromises.mkdir(fixtures.noindex, { recursive: true });
    await fsPromises.writeFile(
      path.join(fixtures.noindex, "index.json"),
      JSON.stringify({ title: "Noindex", robots: "noindex, follow", sectionOrder: [] }),
      "utf8"
    );

    await fsPromises.mkdir(fixtures.public, { recursive: true });
    await fsPromises.writeFile(
      path.join(fixtures.public, "index.json"),
      JSON.stringify({ title: "Public", sectionOrder: [] }),
      "utf8"
    );
  });

  afterAll(async () => {
    await Promise.all(
      Object.values(fixtures).map((dir) => fsPromises.rm(dir, { recursive: true, force: true }))
    );
  });

  it("excludes protected and unlisted pages while keeping public pages", async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((entry) => new URL(entry.url).pathname));

    expect(urls.has("/vitest-sitemap-protected-visibility")).toBe(false);
    expect(urls.has("/vitest-sitemap-protected-password")).toBe(false);
    expect(urls.has("/vitest-sitemap-unlisted")).toBe(false);
    expect(urls.has("/vitest-sitemap-noindex")).toBe(false);
    expect(urls.has("/vitest-sitemap-disabled")).toBe(false);
    expect(urls.has("/vitest-sitemap-public")).toBe(true);
  });
});
