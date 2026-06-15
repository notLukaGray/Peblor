import { test, expect } from "@playwright/test";

test.describe("SEO — meta tags", () => {
  const KEY_PAGES = [
    { path: "/", label: "Homepage" },
    { path: "/profile", label: "Profile" },
    { path: "/work", label: "Work" },
    { path: "/teaching", label: "Teaching" },
    { path: "/research", label: "Research" },
  ] as const;

  for (const { path, label } of KEY_PAGES) {
    test.describe(label, () => {
      test("has title tag", async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("load");

        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
      });

      test("has description meta tag", async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("load");

        const description = page.locator('meta[name="description"]');
        await expect(description).toHaveAttribute("content");
        const content = await description.getAttribute("content");
        expect(content?.length).toBeGreaterThan(0);
      });

      test("has OG:title, OG:description, OG:type meta tags", async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("load");

        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content");
        await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content");
        await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content");
        await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
          "content",
          "en_US"
        );
      });

      test("has Twitter card meta tags", async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("load");

        await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content");
        await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content");
        await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content");
      });

      test("has canonical URL", async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("load");

        const canonical = page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveAttribute("href");
      });
    });
  }

  test.describe("OG image tag", () => {
    test("homepage OG image exists when signed URL is available", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("load");

      const ogImage = page.locator('meta[property="og:image"]');
      const count = await ogImage.count();
      if (count > 0) {
        const content = await ogImage.first().getAttribute("content");
        expect(content?.length).toBeGreaterThan(0);
      }
    });
  });
});

test.describe("SEO — JSON-LD structured data", () => {
  test("homepage has Person JSON-LD structured data", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const ldScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldScripts.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Check that at least one contains Person schema
    let hasPersonSchema = false;
    for (let i = 0; i < count; i++) {
      const text = await ldScripts.nth(i).textContent();
      if (text && text.includes('"Person"')) {
        hasPersonSchema = true;
        break;
      }
    }
    expect(hasPersonSchema).toBeTruthy();
  });

  test("profile page has WebPage JSON-LD", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("load");

    const ldScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldScripts.count();
    expect(count).toBeGreaterThanOrEqual(1);

    let hasWebPageSchema = false;
    for (let i = 0; i < count; i++) {
      const text = await ldScripts.nth(i).textContent();
      if (text && (text.includes('"WebPage"') || text.includes('"BreadcrumbList"'))) {
        hasWebPageSchema = true;
        break;
      }
    }
    expect(hasWebPageSchema).toBeTruthy();
  });

  test("research sub-page has Article JSON-LD", async ({ page }) => {
    await page.goto("/research/adaptive-systems");
    await page.waitForLoadState("load");

    const ldScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldScripts.count();
    expect(count).toBeGreaterThanOrEqual(1);

    let hasArticleSchema = false;
    for (let i = 0; i < count; i++) {
      const text = await ldScripts.nth(i).textContent();
      if (text && text.includes('"Article"')) {
        hasArticleSchema = true;
        break;
      }
    }
    expect(hasArticleSchema).toBeTruthy();
  });

  test("sub-pages have BreadcrumbList JSON-LD", async ({ page }) => {
    await page.goto("/work/lenero");
    await page.waitForLoadState("load");

    const ldScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldScripts.count();
    expect(count).toBeGreaterThanOrEqual(1);

    let hasBreadcrumbList = false;
    for (let i = 0; i < count; i++) {
      const text = await ldScripts.nth(i).textContent();
      if (text && text.includes('"BreadcrumbList"')) {
        hasBreadcrumbList = true;
        break;
      }
    }
    expect(hasBreadcrumbList).toBeTruthy();
  });
});

test.describe("SEO — heading hierarchy", () => {
  const PAGES = [
    { path: "/", label: "Homepage" },
    { path: "/profile", label: "Profile" },
    { path: "/work", label: "Work" },
    { path: "/teaching", label: "Teaching" },
    { path: "/research", label: "Research" },
  ] as const;

  for (const { path, label } of PAGES) {
    test(`${label} has at least one h1`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("load");

      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });
  }
});

test.describe("SEO — sitemap", () => {
  test("sitemap.xml is accessible", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.ok()).toBeTruthy();
    expect(response?.headers()["content-type"]).toContain("xml");
  });

  test("sitemap contains expected entries", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    const text = await response?.text();
    expect(text).toBeTruthy();
    expect(text).toContain("<urlset");
    // Should contain at least the root entry
    expect(text).toContain("<loc>");
  });
});
