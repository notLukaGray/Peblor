#!/usr/bin/env npx tsx
/**
 * Strict-load every page (or only changed pages vs a git base).
 *
 * Environment:
 *   VALIDATE_PAGES_BASE_REF — ref for `--changed` (default: origin/main). Example: main
 */
import { discoverAllPages, loadPeblorByPathAsync, getChangedSlugs } from "@pb/core/loader";
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

  let candidatePages = pages;
  if (changedOnly) {
    const changedSlugs = getChangedSlugs(pages, BASE_REF);
    if (changedSlugs.size === 0) {
      console.log("No changed content pages detected.");
      process.exit(0);
    }
    candidatePages = pages.filter((p) => changedSlugs.has(p.slugSegments.join("/")));
    console.log(
      `--changed: comparing against git base "${BASE_REF}" (override with VALIDATE_PAGES_BASE_REF)`
    );
  }

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

void main();
