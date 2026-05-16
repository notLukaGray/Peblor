import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const checkRoutes: Tool = {
  def: {
    name: "check_routes",
    description:
      "Validate all internal navigation targets (button hrefs, navigate action payloads) against the known page route list. Surface broken links.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => runCli(["check-routes"]),
};
