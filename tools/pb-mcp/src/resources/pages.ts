import type { StaticResource } from "../types.js";
import { listPages } from "../lib/fs.js";

export const pages: StaticResource = {
  kind: "static",
  uri: "peblor://pages",
  name: "Pages",
  description: "All pages in the project — routes and file paths.",
  mimeType: "application/json",
  read: () => listPages(),
};
