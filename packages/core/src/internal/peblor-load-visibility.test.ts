import fsPromises from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PAGE_DATA_DIR } from "./load/peblor-load-io";
import { loadPageVisibilityOnly } from "./peblor-load";

const slug = "vitest-visibility-only";
const passwordSlug = "vitest-password-protected-only";
const pageDir = path.join(PAGE_DATA_DIR, slug);
const pagePath = path.join(pageDir, "index.json");
const passwordPageDir = path.join(PAGE_DATA_DIR, passwordSlug);
const passwordPagePath = path.join(passwordPageDir, "index.json");

describe("loadPageVisibilityOnly", () => {
  beforeAll(async () => {
    await fsPromises.mkdir(pageDir, { recursive: true });
    await fsPromises.writeFile(
      pagePath,
      JSON.stringify({ title: "Private", visibility: "protected", sectionOrder: [] }),
      "utf8"
    );
    await fsPromises.mkdir(passwordPageDir, { recursive: true });
    await fsPromises.writeFile(
      passwordPagePath,
      JSON.stringify({ title: "Private", passwordProtected: true, sectionOrder: [] }),
      "utf8"
    );
  });

  afterAll(async () => {
    await fsPromises.rm(pageDir, { recursive: true, force: true });
    await fsPromises.rm(passwordPageDir, { recursive: true, force: true });
  });

  it("reads only visibility metadata from page JSON", async () => {
    expect(await loadPageVisibilityOnly([slug])).toEqual({
      visibility: "protected",
      slugSegments: [slug],
    });
  });

  it("includes passwordProtected when true", async () => {
    expect(await loadPageVisibilityOnly([passwordSlug])).toEqual({
      passwordProtected: true,
      slugSegments: [passwordSlug],
      visibility: undefined,
    });
  });
});
