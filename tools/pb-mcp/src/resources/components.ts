import type { TemplateResource } from "../types.js";
import { runCli } from "../lib/cli.js";

export const components: TemplateResource = {
  kind: "template",
  uriTemplate: "peblor://components/{kind}",
  name: "Components by kind",
  description: "All components of a kind. kind = element | trigger | motion | section | background",
  mimeType: "application/json",
  match: (uri) => uri.match(/^peblor:\/\/components\/(.+)$/),
  read: (_uri, m) => runCli(["explain", "--all", "--kind", m[1]!]),
};
