import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const setAnalytics: Tool = {
  def: {
    name: "set_analytics",
    description: "Set or clear the analytics config on a page.",
    inputSchema: {
      type: "object",
      properties: {
        route: { type: "string", description: "Page route (e.g. '/about')" },
        config: {
          type: "object",
          description: "Analytics config to set (omit to clear)",
          properties: {
            enabled: { type: "boolean" },
            event: { type: "string" },
          },
        },
        write: { type: "boolean", description: "Write changes to disk (default: dry-run)" },
      },
      required: ["route"],
    },
  },
  run: async (args) => {
    const { route, config, write } = args as {
      route: string;
      config?: { enabled?: boolean; event?: string };
      write?: boolean;
    };
    const cliArgs = ["set-analytics", route];
    if (!config) {
      cliArgs.push("--clear");
    } else {
      if (config.enabled !== undefined) cliArgs.push("--enabled", String(config.enabled));
      if (config.event) cliArgs.push("--event", config.event);
    }
    if (write) cliArgs.push("--write");
    return runCli(cliArgs);
  },
};
