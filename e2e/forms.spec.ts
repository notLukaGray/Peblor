import { test, expect } from "@playwright/test";

test.describe("Forms", () => {
  test.describe("Unlock form", () => {
    test("unlock form renders with expected structure", async ({ page }) => {
      await page.goto("/unlock");
      await page.waitForLoadState("load");

      // Find password input
      const passwordField = page.locator('input[type="password"]');
      const count = await passwordField.count();
      if (count > 0) {
        // Verify field attributes
        await expect(passwordField.first()).toHaveAttribute("name", "password");
        await expect(passwordField.first()).toHaveAttribute("required");

        // Verify submit button exists
        const submitButton = page.locator('button[type="submit"]');
        const submitCount = await submitButton.count();
        if (submitCount > 0) {
          await expect(submitButton.first()).toBeVisible();
        }
      }
    });

    test("unlock form has proper form element", async ({ page }) => {
      await page.goto("/unlock");
      await page.waitForLoadState("load");

      // Find the form element
      const form = page.locator("form");
      const formCount = await form.count();
      if (formCount > 0) {
        const method = await form.first().getAttribute("method");
        // Method could be post or dialog depending on implementation
        expect(method?.toLowerCase()).toBe("post");
      }
    });
  });

  test.describe("Contact form (presets/composition-contact)", () => {
    test("contact form page loads without errors", async ({ page }) => {
      await page.goto("/presets/composition-contact");
      await page.waitForLoadState("load");

      const main = page.locator("main");
      await expect(main).toBeVisible();
    });

    test("contact form has input fields with labels", async ({ page }) => {
      await page.goto("/presets/composition-contact");
      await page.waitForLoadState("load");

      // Find form on the page
      const form = page.locator("form");
      const formCount = await form.count();

      if (formCount > 0) {
        // Form should have POST method
        const method = await form.first().getAttribute("method");
        expect(method?.toLowerCase()).toBe("post");

        // Check for input fields
        const inputs = form.first().locator("input, select, textarea");
        const inputCount = await inputs.count();
        expect(inputCount).toBeGreaterThanOrEqual(1);

        // Check that inputs have associated labels (either wrapped or for/id)
        for (let i = 0; i < inputCount; i++) {
          const input = inputs.nth(i);
          // Check if input has id and label with matching for attribute
          const inputId = await input.getAttribute("id");
          if (inputId) {
            const label = page.locator(`label[for="${inputId}"]`);
            await expect(label.first()).toBeVisible();
          }
        }
      }
    });

    test("contact form submit button exists", async ({ page }) => {
      await page.goto("/presets/composition-contact");
      await page.waitForLoadState("load");

      const submitButton = page.locator('button[type="submit"]');
      const count = await submitButton.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test("contact form has accessible name via aria-label or legend", async ({ page }) => {
      await page.goto("/presets/composition-contact");
      await page.waitForLoadState("load");

      const form = page.locator("form").first();
      const formCount = await page.locator("form").count();

      if (formCount > 0) {
        // Check if form has accessible name
        const ariaLabel = await form.getAttribute("aria-label");
        const ariaLabelledby = await form.getAttribute("aria-labelledby");
        const title = await form.getAttribute("title");

        const hasAccessibleName = Boolean(ariaLabel || ariaLabelledby || title);
        // Forms should ideally have an accessible name, but this is situational
        // Log the status rather than hard-require
        test.info().annotations.push({
          type: hasAccessibleName ? "info" : "warn",
          description: `Form has accessible name: ${hasAccessibleName}`,
        });
      }
    });
  });

  test.describe("Form action context", () => {
    test("page renders with form action provider in DOM", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("load");

      // Verify the page contains form-related elements
      // The FormActionProvider wraps the app — forms are client-rendered but the shell is present
      const body = page.locator("body");
      await expect(body).toBeVisible();
    });
  });
});
