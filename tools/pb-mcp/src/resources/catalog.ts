import type { StaticResource } from "../types.js";
import { runCli } from "../lib/cli.js";

export const catalog: StaticResource = {
  kind: "static",
  uri: "peblor://catalog",
  name: "Component Catalog",
  description: "Full catalog of all peblor components with schemas and metadata.",
  mimeType: "application/json",
  read: () => runCli(["explain", "--all"]),
};
