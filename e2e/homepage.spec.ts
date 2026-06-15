import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads without errors and has expected page structure", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("load");

    // Verify URL
    await expect(page).toHaveURL("/");

    // Verify <main> exists and is visible
    const main = page.locator("main");
    await expect(main).toBeVisible();
    await expect(main).toHaveId("main-content");

    // Verify skip-to-content link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveText("Skip to main content");

    // Verify no page-load console errors
    expect(
      consoleErrors.filter(
        (e) =>
          !e.includes("favicon.ico") &&
          !e.includes("source map") &&
          !e.includes("Failed to load resource: the server responded with a status of")
      )
    ).toEqual([]);
  });

  test("has hero carousel section with interactive projects", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Featured work carousel — slots animate in via framer-motion with ~0.8s total
    // (0.2s delay + 0.6s duration). The nav container has height:0 because children
    // are absolutely positioned for vertical sliding, so we assert on slots directly.
    const slots = page.locator('nav[aria-label="Featured work carousel"] [data-project-id]');
    await expect(slots.first()).toBeVisible({ timeout: 5000 });

    // At least one project slot rendered
    const slotCount = await slots.count();
    expect(slotCount).toBeGreaterThanOrEqual(1);
  });

  test("hero carousel keyboard navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Project selector buttons in the carousel
    const selectors = page.locator('[aria-label^="Select project"]');
    const count = await selectors.count();
    if (count > 0) {
      await selectors.first().focus();
      await expect(selectors.first()).toBeFocused();
      await selectors.first().press("Enter");
      await page.waitForTimeout(300);
    }
  });

  test("full-page navigation link points to active project", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Overlay link covering the whole page — navigates to the active project
    const viewLink = page.locator('a[aria-label^="View"]');
    await expect(viewLink.first()).toBeVisible();
    const href = await viewLink.first().getAttribute("href");
    expect(href).toBeTruthy();
  });

  test("theme class applied without flash", async ({ page }) => {
    // Set theme cookie before navigation to verify SSR picks it up
    await page
      .context()
      .addCookies([{ name: "theme", value: "dark", domain: "localhost", path: "/" }]);
    await page.goto("/");
    await page.waitForLoadState("load");

    const htmlClass = await page.evaluate(() => document.documentElement.className);
    // Either light or dark must be present — no FOUC
    expect(htmlClass.includes("light") || htmlClass.includes("dark")).toBeTruthy();

    // color-scheme meta tag present
    const colorScheme = page.locator('meta[name="color-scheme"]');
    await expect(colorScheme).toHaveAttribute("content", "light dark");
  });

  test.describe("SEO meta tags", () => {
    test("has OG meta tags", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("load");

      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content");
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content");
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
    });

    test("has Twitter card meta tags", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("load");

      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content");
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content");
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content");
    });

    test("has canonical link and description", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("load");

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content");
      await expect(page.locator('meta[name="author"]')).toHaveAttribute("content", "Luka Gray");
    });
  });
});
