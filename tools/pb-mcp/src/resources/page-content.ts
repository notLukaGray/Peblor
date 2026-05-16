import type { TemplateResource } from "../types.js";
import { findPage } from "../lib/fs.js";

export const pageContent: TemplateResource = {
  kind: "template",
  uriTemplate: "peblor://pages/{route}",
  name: "Page content",
  description: "Raw JSON for a specific page by route (e.g. peblor://pages/work).",
  mimeType: "application/json",
  match: (uri) => uri.match(/^peblor:\/\/pages\/(.+)$/),
  read: async (_uri, m) => {
    const { content } = await findPage(m[1]!);
    return content;
  },
};
