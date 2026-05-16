import type { TemplateResource } from "../types.js";
import { runCli } from "../lib/cli.js";

export const schemas: TemplateResource = {
  kind: "template",
  uriTemplate: "peblor://schemas/{clusterId}",
  name: "Component schema",
  description:
    "Full field schema + examples for any component (e.g. peblor://schemas/element.heading).",
  mimeType: "application/json",
  match: (uri) => uri.match(/^peblor:\/\/schemas\/(.+)$/),
  read: (_uri, m) => runCli(["explain", m[1]!, "--fields", "--examples"]),
};
