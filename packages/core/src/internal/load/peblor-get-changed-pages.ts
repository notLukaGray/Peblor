/**
 * Git-based changed-page discovery.
 *
 * Both the pb-cli validate-all command and scripts/validate-all-pages.ts need to
 * determine which content pages were touched since a git base ref. This module
 * extracts the shared logic so both callers use the same implementation.
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { PAGE_DATA_DIR } from "./peblor-load-io";
import type { PageEntry } from "./peblor-discover-pages";

/**
 * Run `git diff --name-only --diff-filter=ACMR <baseRef>...HEAD` and return the
 * set of page slug strings (e.g. "work/project-brand") whose content files
 * changed.
 *
 * A changed sidecar section file (e.g. work/project/hero.json) maps back to
 * its parent page slug ("work/project") via a longest-prefix walk over the
 * known page map using `PAGE_DATA_DIR` as the content root.
 *
 * Returns an empty set when the git command fails or no content changes are found.
 */
export function getChangedSlugs(
  pages: PageEntry[],
  baseRef: string,
  pagesDir?: string
): Set<string> {
  const dataDir = path.resolve(pagesDir ?? PAGE_DATA_DIR).replace(/\\/g, "/");
  const pageMap = new Map(pages.map((p) => [p.slugSegments.join("/"), p]));

  let changedFiles: string[];
  try {
    changedFiles = execSync(`git diff --name-only --diff-filter=ACMR ${baseRef}...HEAD`, {
      encoding: "utf8",
    })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (err) {
    console.warn("[pb-core] Failed to get changed pages from git diff", err);
    return new Set();
  }

  const slugs = new Set<string>();
  for (const file of changedFiles) {
    const normalized = path.resolve(file).replace(/\\/g, "/");
    // Strip trailing "/index.json" if present so the prefix check catches it.
    const stripped = normalized.endsWith("/index.json")
      ? normalized.slice(0, -"/index.json".length)
      : normalized;
    if (!stripped.startsWith(dataDir + "/")) continue;
    const rel = stripped.slice(dataDir.length + 1);
    const parts = rel.split("/");
    // Walk from the most specific to least specific segment to find the owning page.
    for (let len = parts.length; len > 0; len--) {
      const candidate = parts.slice(0, len).join("/");
      if (pageMap.has(candidate)) {
        slugs.add(candidate);
        break;
      }
    }
  }

  return slugs;
}

/**
 * Return only the pages whose slugs appear in `changedSlugs`, sorted lexicographically
 * by slug.
 */
export function filterChangedPages(pages: PageEntry[], changedSlugs: Set<string>): PageEntry[] {
  return pages
    .filter((p) => changedSlugs.has(p.slugSegments.join("/")))
    .sort((a, b) => a.slugSegments.join("/").localeCompare(b.slugSegments.join("/")));
}
