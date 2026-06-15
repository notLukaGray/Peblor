import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || "3000";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: process.env.CI ? "on-first-retry" : "off",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/visual/**",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
    {
      name: "visual",
      testMatch: "visual/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
      snapshotDir: "e2e/visual/__screenshots__",
      expect: {
        toHaveScreenshot: {
          maxDiffPixelRatio: 0.01,
        },
      },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
        cwd: __dirname,
        stdout: "pipe",
        stderr: "pipe",
      },
});
