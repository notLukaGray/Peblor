import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const batchValidate: Tool = {
  def: {
    name: "batch_validate",
    description:
      "Strict-load validate every page in the project. Uses the same route-aware pipeline as the app (presets, global modules, section hydration, cross-ref checks) — equivalent to the CI validate-all-pages.ts script. Returns per-page results and a summary.",
    inputSchema: {
      type: "object",
      properties: {
        changed: {
          type: "boolean",
          description:
            "When true, only validate pages that changed since the merge base of origin/main and HEAD (fast for pre-commit checks).",
        },
        baseRef: {
          type: "string",
          description: "Git base ref for changed-only mode (default: origin/main).",
        },
      },
    },
  },
  run: async (args) => {
    const { changed, baseRef } = (args ?? {}) as { changed?: boolean; baseRef?: string };
    const cliArgs = ["validate-all"];
    if (changed) cliArgs.push("--changed");
    if (baseRef) cliArgs.push("--base", baseRef);
    return runCli(cliArgs);
  },
};
