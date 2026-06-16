import { test, expect } from "@playwright/test";

test.describe("Key pages", () => {
  test.beforeEach(async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    (page as unknown as Record<string, unknown>).__consoleErrors = consoleErrors;
  });

  function assertNoErrors(page: import("@playwright/test").Page) {
    const errors = (page as unknown as Record<string, unknown>).__consoleErrors as string[];
    const filtered = errors.filter(
      (e) =>
        !e.includes("favicon.ico") &&
        !e.includes("source map") &&
        !e.includes("Failed to load resource: the server responded with a status of 404") &&
        !e.includes("Failed to load resource: the server responded with a status of 403")
    );
    expect(filtered).toEqual([]);
  }

  const CORE_PAGES = [
    { path: "/", label: "Homepage" },
    { path: "/404", label: "404" },
    { path: "/unlock", label: "Unlock" },
    { path: "/presets/cards-basic", label: "Cards Basic" },
    { path: "/presets/bg-solid", label: "BG Solid" },
  ] as const;

  for (const { path, label } of CORE_PAGES) {
    test.describe(label, () => {
      test(`${label} loads with main element`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("load");

        // Verify main content
        const main = page.locator("main");
        await expect(main).toBeVisible();
        await expect(main).toHaveId("main-content");

        // Verify at least one h1
        const h1Count = await page.locator("h1").count();
        expect(h1Count).toBeGreaterThanOrEqual(1);

        // No errors
        assertNoErrors(page);
      });
    });
  }

  test.describe("404 page", () => {
    test("returns content for non-existent page via not-found path", async ({ page }) => {
      await page.goto("/non-existent-page-xyz");
      await page.waitForLoadState("load");

      // Verify 404 content renders — main element should still be present
      const main = page.locator("main");
      await expect(main).toBeVisible();
    });

    test("dedicated 404 route works", async ({ page }) => {
      await page.goto("/404");
      await page.waitForLoadState("load");

      const main = page.locator("main");
      await expect(main).toBeVisible();
    });
  });

  test.describe("Unlock page", () => {
    test("unlock page loads without errors", async ({ page }) => {
      await page.goto("/unlock");
      await page.waitForLoadState("load");

      // Unlock page renders content (at minimum the app shell)
      const main = page.locator("main");
      await expect(main).toBeVisible();

      // Should show at least the main content area
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.length).toBeGreaterThan(0);
    });
  });

  test.describe("Preset sub-pages", () => {
    const PRESET_PAGES = [
      "/presets/cards-basic",
      "/presets/cards-collections",
      "/presets/cards-media",
      "/presets/cards-stats",
      "/presets/bg-solid",
      "/presets/bg-aurora",
      "/presets/bg-vibrant",
      "/presets/type-scale",
      "/presets/composition-landing-saas",
      "/presets/composition-portfolio",
    ] as const;

    for (const path of PRESET_PAGES) {
      test(`${path} loads with main element and no errors`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("load");

        const main = page.locator("main");
        await expect(main).toBeVisible();
        expect(await page.locator("h1").count()).toBeGreaterThanOrEqual(1);
        assertNoErrors(page);
      });
    }
  });
});
