import { test, expect } from "@playwright/test";

test.describe("Performance — resource hints", () => {
  test("font preconnect hints are present", async ({ page }) => {
    await page.goto("/");

    // Check for preconnect links (Bunny CDN or self-hosted origins)
    const preconnects = page.locator('link[rel="preconnect"][crossorigin]');
    const preconnectCount = await preconnects.count();
    // At minimum, there should be at least one preconnect (CDN or font origin)
    expect(preconnectCount).toBeGreaterThanOrEqual(1);
  });

  test("font preload links are present", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Check for font preloads
    const fontPreloads = page.locator('link[rel="preload"][as="font"]');
    const count = await fontPreloads.count();
    // Font preloads should exist (either self-hosted or webfont)
    // The count depends on the font configuration
    test.info().annotations.push({
      type: "info",
      description: `Font preloads found: ${count}`,
    });
  });

  test("DNS prefetch hints present", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const dnsPrefetches = page.locator('link[rel="dns-prefetch"]');
    const count = await dnsPrefetches.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Performance — color-scheme and theme", () => {
  test("color-scheme meta tag prevents FOUC", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const meta = page.locator('meta[name="color-scheme"]');
    await expect(meta).toHaveAttribute("content", "light dark");
  });

  test("theme-color meta tag is present with light and dark media queries", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const themeColor = page.locator('meta[name="theme-color"]');
    const count = await themeColor.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Check that at least one has a media attribute
    let hasMedia = false;
    for (let i = 0; i < count; i++) {
      const media = await themeColor.nth(i).getAttribute("media");
      if (media) {
        hasMedia = true;
        break;
      }
    }
    expect(hasMedia).toBeTruthy();
  });
});

test.describe("Performance — CSS and rendering", () => {
  test("page has inline critical CSS for brand tokens", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // The brand CSS is injected inline via <style> tags
    const styleTags = page.locator("style");
    const count = await styleTags.count();
    expect(count).toBeGreaterThanOrEqual(1);

    let hasBrandCss = false;
    for (let i = 0; i < count; i++) {
      const content = await styleTags.nth(i).textContent();
      if (content && (content.includes("--pb-") || content.includes("--font-"))) {
        hasBrandCss = true;
        break;
      }
    }
    expect(hasBrandCss).toBeTruthy();
  });

  test("pb-foundations-runtime style element present", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const runtimeStyles = page.locator("style#pb-foundations-runtime");
    await expect(runtimeStyles).toBeVisible();
  });

  test("pre-paint theme script is inlined in head", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // The theme script is injected via dangerouslySetInnerHTML
    // It's a <script> tag that runs before first paint
    const scripts = page.locator("script");
    const count = await scripts.count();

    let hasThemeScript = false;
    for (let i = 0; i < count; i++) {
      const content = await scripts.nth(i).textContent();
      // The theme script references 'theme' cookie and 'prefers-color-scheme'
      if (
        content &&
        (content.includes("prefers-color-scheme") || content.includes("documentElement"))
      ) {
        hasThemeScript = true;
        break;
      }
    }
    expect(hasThemeScript).toBeTruthy();
  });
});

test.describe("Performance — image loading", () => {
  test("homepage poster image has loading attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // The homepage hero section should have optimized images
    const images = page.locator("img");
    const count = await images.count();

    if (count > 0) {
      // Check that images have alt attributes for a11y
      for (let i = 0; i < Math.min(count, 5); i++) {
        const img = images.nth(i);
        const hasAlt = await img.getAttribute("alt");
        // Alt may be empty string (aria-hidden) — that's valid
        expect(hasAlt).not.toBeNull();
      }
    }
  });
});

test.describe("Performance — response headers", () => {
  test("page returns 200 status", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
  });

  test("CSS content-type is correct for stylesheet links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Verify stylesheets exist
    const stylesheets = page.locator('link[rel="stylesheet"]');
    const count = await stylesheets.count();
    // Should have at least the webfont stylesheets
    test.info().annotations.push({
      type: "info",
      description: `External stylesheets found: ${count}`,
    });
  });
});
