import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.claude/**", "apps/studio/**"],
    setupFiles: ["./vitest.setup.ts"],
    pool: "threads",
    fileParallelism: false,
    // Cold `import()` after `vi.resetModules()` can exceed 5s under parallel vitest load.
    testTimeout: 30_000,
  },
  resolve: {
    alias: [
      {
        find: "@/peblor",
        replacement: path.resolve(__dirname, "./packages/runtime-react/src/peblor"),
      },
      {
        find: "@/core",
        replacement: path.resolve(__dirname, "./apps/web/src/core"),
      },
      {
        find: "@/content",
        replacement: path.resolve(__dirname, "./content"),
      },
      {
        find: "@content",
        replacement: path.resolve(__dirname, "./content"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./apps/web/src"),
      },
    ],
  },
});
