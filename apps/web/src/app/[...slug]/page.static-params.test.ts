import fsPromises from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PAGE_DATA_DIR } from "@pb/core/loader";
import { generateStaticParams } from "./page";

const visibilityProtectedSlug = "vitest-static-params-protected";
const visibilityProtectedRoot = path.join(PAGE_DATA_DIR, visibilityProtectedSlug);
const visibilityProtectedIndex = path.join(visibilityProtectedRoot, "index.json");

const passwordProtectedSlug = "vitest-static-params-password-protected";
const passwordProtectedRoot = path.join(PAGE_DATA_DIR, passwordProtectedSlug);
const passwordProtectedIndex = path.join(passwordProtectedRoot, "index.json");

const bothProtectedSlug = "vitest-static-params-both-protected";
const bothProtectedRoot = path.join(PAGE_DATA_DIR, bothProtectedSlug);
const bothProtectedIndex = path.join(bothProtectedRoot, "index.json");

describe("generateStaticParams visibility filter", () => {
  beforeAll(async () => {
    await fsPromises.mkdir(visibilityProtectedRoot, { recursive: true });
    await fsPromises.writeFile(
      visibilityProtectedIndex,
      JSON.stringify({ title: "Hidden", visibility: "protected", sectionOrder: [] }),
      "utf8"
    );

    await fsPromises.mkdir(passwordProtectedRoot, { recursive: true });
    await fsPromises.writeFile(
      passwordProtectedIndex,
      JSON.stringify({ title: "Hidden", passwordProtected: true, sectionOrder: [] }),
      "utf8"
    );

    await fsPromises.mkdir(bothProtectedRoot, { recursive: true });
    await fsPromises.writeFile(
      bothProtectedIndex,
      JSON.stringify(
        { title: "Hidden", visibility: "protected", passwordProtected: true, sectionOrder: [] },
        null,
        0
      ),
      "utf8"
    );
  });

  afterAll(async () => {
    await fsPromises.rm(visibilityProtectedRoot, { recursive: true, force: true });
    await fsPromises.rm(passwordProtectedRoot, { recursive: true, force: true });
    await fsPromises.rm(bothProtectedRoot, { recursive: true, force: true });
  });

  it("excludes protected pages", async () => {
    const params = await generateStaticParams();
    expect(params).not.toContainEqual({ slug: [visibilityProtectedSlug] });
    expect(params).not.toContainEqual({ slug: [passwordProtectedSlug] });
    expect(params).not.toContainEqual({ slug: [bothProtectedSlug] });
  });
});
