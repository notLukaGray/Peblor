import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility — automated axe-core scans", () => {
  const PAGES = [
    { path: "/", label: "Homepage" },
    { path: "/profile", label: "Profile" },
    { path: "/work", label: "Work" },
    { path: "/teaching", label: "Teaching" },
    { path: "/research", label: "Research" },
    { path: "/404", label: "404" },
  ] as const;

  for (const { path, label } of PAGES) {
    test(`${label} has no critical or serious violations (wcag2a, wcag2aa, wcag21a, wcag21aa)`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.waitForLoadState("load");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      // Filter to only critical and serious violations
      const criticalSerious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalSerious).toEqual([]);
    });
  }
});

test.describe("Accessibility — keyboard navigation", () => {
  test("Tab navigates through interactive elements on homepage", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Start tabbing from the body
    await page.keyboard.press("Tab");

    // The skip-to-content link should be the first focusable element
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    // Press Enter to skip to main content
    await skipLink.press("Enter");
    // Main content should now be focused
    const main = page.locator("main");
    await expect(main).toBeFocused();
  });

  test("focus-visible ring present on interactive elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const skipLink = page.locator('a[href="#main-content"]');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    // Additionally verify focus-visible ring via computed style
    const outlineStyle = await skipLink.evaluate((el) => {
      return window.getComputedStyle(el).outlineStyle;
    });
    expect(outlineStyle).not.toBe("none");
  });

  test("skip-to-content link redirects focus to main", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const skipLink = page.locator('a[href="#main-content"]');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");
    const main = page.locator("main");
    await expect(main).toBeFocused();
  });

  test("focus management after skip-to-content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const skipLink = page.locator('a[href="#main-content"]');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    // Activate via Enter key
    await page.keyboard.press("Enter");
    const main = page.locator("main");
    await expect(main).toBeFocused();
  });
});

test.describe("Accessibility — focus management", () => {
  test("main element has tabIndex=-1 for programmatic focus", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const mainTabIndex = await page.locator("main").getAttribute("tabindex");
    expect(mainTabIndex).toBe("-1");
  });
});

test.describe("Accessibility — color contrast", () => {
  test("body text and background colors are set (not transparent)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const body = page.locator("body");
    const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const color = await body.evaluate((el) => window.getComputedStyle(el).color);

    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(bgColor).not.toBe("transparent");
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
  });
});
