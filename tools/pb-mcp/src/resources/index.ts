import { catalog } from "./catalog.js";
import { pages } from "./pages.js";
import { config } from "./config.js";
import { pageContent } from "./page-content.js";
import { components } from "./components.js";
import { presets } from "./presets.js";
import { schemas } from "./schemas.js";
import { data } from "./data.js";
import { graph } from "./graph.js";
import { overlaysList, overlayContent } from "./overlays.js";
import { tags } from "./tags.js";
import { projectGroups } from "./project-groups.js";
import type { Resource } from "../types.js";

export const allResources: Resource[] = [
  // static
  catalog,
  pages,
  config,
  graph,
  overlaysList,
  tags,
  projectGroups,
  // templates
  pageContent,
  components,
  presets,
  schemas,
  data,
  overlayContent,
];
