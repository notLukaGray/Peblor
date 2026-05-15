#!/usr/bin/env npx tsx
/**
 * Strict-load every page (or only changed pages vs a git base).
 *
 * Environment:
 *   VALIDATE_PAGES_BASE_REF — ref for `--changed` (default: origin/main). Example: main
 */
import { discoverAllPages, loadPeblorByPathAsync } from "@pb/core/loader";
import { execSync } from "node:child_process";
import { readPeblorConfig } from "@pb/core/lib/peblor-config";

const config = readPeblorConfig();
const BASE_REF =
  process.env.VALIDATE_PAGES_BASE_REF ?? config?.validatePagesBaseRef ?? "origin/main";

(process.env as Record<string, string>).NODE_ENV = "development";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: npx tsx scripts/validate-all-pages.ts [--changed] [--help]

  --changed   Validate only pages touched in git vs the merge base of BASE_REF and HEAD.
              Uses: git diff --name-only BASE_REF...HEAD
              Override base with env VALIDATE_PAGES_BASE_REF (default: origin/main).

  Without --changed, validates every discovered page.
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const changedOnly = process.argv.includes("--changed");
  const pages = await discoverAllPages();
  const pageMap = new Map(pages.map((page) => [page.slugSegments.join("/"), page]));
  const candidatePages = changedOnly ? getChangedPages(pageMap) : pages;
  let failures = 0;

  for (const page of candidatePages) {
    const slug = page.slugSegments.join("/");
    try {
      await loadPeblorByPathAsync(page.slugSegments);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAIL ${slug}: ${msg}`);
      failures += 1;
    }
  }

  if (failures > 0) {
    console.error(`Strict validation failures: ${failures}/${candidatePages.length}`);
    process.exit(1);
  }

  console.log(`All ${candidatePages.length} pages passed strict validation.`);
}

function getChangedPages(
  pageMap: Map<string, { slugSegments: string[] }>
): Array<{ slugSegments: string[] }> {
  const changed = execSync(`git diff --name-only --diff-filter=ACMR ${BASE_REF}...HEAD`, {
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const slugs = new Set<string>();
  for (const file of changed) {
    const normalized = file.replace(/\\/g, "/");
    const config = readPeblorConfig();
    const pagesPrefix = process.env.PB_CONTENT_DIR
      ? path.posix.join(process.env.PB_CONTENT_DIR.replace(/\\/g, "/"), "pages/")
      : config?.contentDir
        ? `${config.contentDir.replace(/^\.\//, "").replace(/\\/g, "/")}/pages/`
        : "";
    const marker = pagesPrefix || "apps/web/src/content/pages/";
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex < 0) continue;
    const rel = normalized.slice(markerIndex + marker.length);
    const parts = rel.split("/");
    if (parts.length < 2) continue;
    const slugParts = parts.slice(0, -1);
    const slug = slugParts.join("/");
    if (pageMap.has(slug)) {
      slugs.add(slug);
      continue;
    }
    let cursor = slugParts;
    while (cursor.length > 0) {
      const parent = cursor.join("/");
      if (pageMap.has(parent)) {
        slugs.add(parent);
        break;
      }
      cursor = cursor.slice(0, -1);
    }
  }

  if (slugs.size === 0) {
    console.log("No changed content pages detected.");
    return [];
  }

  console.log(
    `--changed: comparing against git base "${BASE_REF}" (override with VALIDATE_PAGES_BASE_REF)`
  );

  return [...slugs]
    .map((slug) => ({ slug, entry: pageMap.get(slug)! }))
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((row) => row.entry);
}

void main();
