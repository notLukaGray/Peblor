import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import type { Catalog, CatalogEntry, Category } from "./types.js";

export type {
  Catalog,
  CatalogEntry,
  Kind,
  Category,
  Stability,
  VariantAxis,
  CoverEntry,
  DoesNotCoverEntry,
  ComposesWith,
  ProposalHints,
} from "./types.js";

let _catalog: Catalog | null = null;

function catalogJsonPath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, "generated", "catalog.json");
}

export function loadCatalog(): Catalog {
  if (_catalog) return _catalog;
  const raw = readFileSync(catalogJsonPath(), "utf-8");
  _catalog = JSON.parse(raw) as Catalog;
  return _catalog;
}

export function findCluster(id: string): CatalogEntry | undefined {
  return loadCatalog().entries.find((e) => e.id === id);
}

export function clustersByCategory(category: Category): CatalogEntry[] {
  const prefix = category + ".";
  return loadCatalog().entries.filter((e) => e.id.startsWith(prefix));
}

/** Keyword match against `feels_like` — used by `pb-cli probe --explain`. */
export function findCoveringClusters(intent: string): CatalogEntry[] {
  const lower = intent.toLowerCase();
  return loadCatalog().entries.filter(
    (e) =>
      e.feels_like.toLowerCase().includes(lower) ||
      e.not_this_if.some((n) => n.toLowerCase().includes(lower))
  );
}
