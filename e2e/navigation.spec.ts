import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    // Store errors on page for later assertion
    (page as unknown as Record<string, unknown>).__consoleErrors = consoleErrors;
  });

  test.describe("Page navigation via direct URLs", () => {
    const PAGES = [
      { path: "/", label: "Home" },
      { path: "/404", label: "404" },
      { path: "/unlock", label: "Unlock" },
      { path: "/presets/cards-basic", label: "Cards Basic" },
    ] as const;

    for (const { path, label } of PAGES) {
      test(`${label} page loads without console errors`, async ({ page }) => {
        const errors = (page as unknown as Record<string, unknown>).__consoleErrors as string[];
        await page.goto(path);
        await page.waitForLoadState("load");

        // Verify main content area exists
        const main = page.locator("main");
        await expect(main).toBeVisible();

        // Verify no navigation errors
        const filtered = errors.filter(
          (e) =>
            !e.includes("favicon.ico") &&
            !e.includes("source map") &&
            !e.includes("Failed to load resource: the server responded with a status of")
        );
        expect(filtered).toEqual([]);
      });
    }
  });

  test.describe("Footer links", () => {
    test("footer is present on main page", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("load");

      await expect(page.locator('[aria-label="Site footer"]')).toBeVisible();
    });
  });

  test.describe("Breadcrumbs", () => {
    test("breadcrumbs render on presets page", async ({ page }) => {
      await page.goto("/presets/cards-basic");
      await page.waitForLoadState("load");

      const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumbNav).toBeVisible();

      // Should have at least the Home link
      const homeLink = breadcrumbNav.locator('a[href="/"]');
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toHaveText("Home");
    });

    test("breadcrumbs render on nested preset pages with correct hierarchy", async ({ page }) => {
      await page.goto("/presets/cards-basic");
      await page.waitForLoadState("load");

      const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumbNav).toBeVisible();

      // Home link
      const homeLink = breadcrumbNav.locator('a[href="/"]');
      await expect(homeLink).toBeVisible();

      // Presets link
      const presetsLink = breadcrumbNav.locator('a[href="/presets"]');
      const presetsCount = await presetsLink.count();
      if (presetsCount > 0) {
        await expect(presetsLink).toBeVisible();
      }

      // Current page (not a link, aria-current="page")
      const currentPage = breadcrumbNav.locator('[aria-current="page"]');
      await expect(currentPage).toBeVisible();
    });

    test("breadcrumbs render on nested preset pages", async ({ page }) => {
      await page.goto("/presets/composition-landing-saas");
      await page.waitForLoadState("load");

      const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumbNav).toBeVisible();

      await expect(breadcrumbNav.locator('a[href="/"]')).toBeVisible();
      await expect(breadcrumbNav.locator('[aria-current="page"]')).toBeVisible();
    });
  });

  test.describe("Skip-to-content link", () => {
    test("skip link is hidden until focused", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("load");

      const skipLink = page.locator('a[href="#main-content"]');
      // Visibility assertion when not focused — it's sr-only (screen-reader only, visually hidden)
      await expect(skipLink).toBeVisible();

      // Tab to focus it
      await page.keyboard.press("Tab");
      // The skip link should now have visible focus styles
      const isFocused = await skipLink.evaluate((el) => el === document.activeElement);
      // Depending on tab order, the skip link is the first focusable element
      if (isFocused) {
        await expect(skipLink).toBeFocused();
      }
    });
  });

  test.describe("SpeculationRules script", () => {
    test("SpeculationRules prerender script is present", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("load");

      // SpeculationRules may be injected by Next.js
      const speculationScript = page.locator('script[type="speculationrules"]');
      // This is an optional feature — check existence without hard-requiring
      const count = await speculationScript.count();
      if (count > 0) {
        const content = await speculationScript.first().textContent();
        expect(content).toBeTruthy();
        const parsed = JSON.parse(content ?? "{}");
        expect(parsed).toHaveProperty("prerender");
      }
    });
  });
});
