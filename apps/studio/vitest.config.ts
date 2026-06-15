import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    root: path.resolve(__dirname),
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["**/node_modules/**"],
    setupFiles: [path.resolve(__dirname, "../../vitest.setup.ts")],
    pool: "threads",
    fileParallelism: false,
    testTimeout: 30_000,
  },
  resolve: {
    alias: [
      // @/peblor/* → runtime-react package source (needed for runtime components)
      {
        find: "@/peblor",
        replacement: path.resolve(__dirname, "../../packages/runtime-react/src/peblor"),
      },
      // Specific overrides that mirror studio tsconfig: @/app/theme/* and @/app/fonts/* live in apps/web
      {
        find: "@/app/theme",
        replacement: path.resolve(__dirname, "../web/src/app/theme"),
      },
      {
        find: "@/app/fonts",
        replacement: path.resolve(__dirname, "../web/src/app/fonts"),
      },
      {
        find: "@/core/lib/assert-dev",
        replacement: path.resolve(__dirname, "../web/src/core/lib/assert-dev"),
      },
      {
        find: "@/core/providers/theme-provider",
        replacement: path.resolve(__dirname, "../web/src/core/providers/theme-provider"),
      },
      {
        find: "@/content",
        replacement: path.resolve(__dirname, "../../content"),
      },
      {
        find: "@content",
        replacement: path.resolve(__dirname, "../../content"),
      },
      // Generic @/ fallback — must come LAST; maps to studio's own src/
      {
        find: "@/",
        replacement: path.resolve(__dirname, "src") + "/",
      },
    ],
  },
});
