import type { TemplateResource } from "../types.js";
import { getPresetsInCategory } from "../lib/fs.js";

export const presets: TemplateResource = {
  kind: "template",
  uriTemplate: "peblor://presets/{category}",
  name: "Presets by category",
  description:
    "Full preset JSON for every preset in a category (motion, trigger, element, bg, etc.).",
  mimeType: "application/json",
  match: (uri) => uri.match(/^peblor:\/\/presets\/(.+)$/),
  read: (_uri, m) => getPresetsInCategory(m[1]!),
};
