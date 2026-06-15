#!/usr/bin/env npx tsx
/**
 * B-6: Stamp contractVersion on all page JSON files.
 *
 * Reads every content/pages\/**\/index.json, adds `"contractVersion": "1.0.0"`
 * at the top level if not already present, then writes the file back.
 *
 * Idempotent: pages that already carry a contractVersion field are left unchanged.
 *
 * Usage:
 *   npx tsx scripts/stamp-contract-version.ts
 *   npx tsx scripts/stamp-contract-version.ts --dry-run   # print what would change
 */
import fs from "fs";
import path from "path";
import { glob } from "fast-glob";

const CONTRACT_VERSION = "1.0.0";
const isDryRun = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const pattern = path.join(repoRoot, "content/pages/**/index.json").replace(/\\/g, "/");

  const files = await glob(pattern, { nodir: true });
  files.sort();

  let stamped = 0;
  let skipped = 0;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf-8");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error(`  SKIP (parse error): ${filePath}`);
      continue;
    }

    if (parsed.contractVersion !== undefined) {
      skipped++;
      continue;
    }

    // Insert contractVersion as the first field so it is visible at the top of the file.
    const stamped_obj: Record<string, unknown> = { contractVersion: CONTRACT_VERSION, ...parsed };

    if (isDryRun) {
      const rel = path.relative(repoRoot, filePath);
      console.log(`  would stamp: ${rel}`);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(stamped_obj, null, 2) + "\n", "utf-8");
    }
    stamped++;
  }

  if (isDryRun) {
    console.log(
      `\nDry run: ${stamped} files would be stamped, ${skipped} already have contractVersion.`
    );
  } else {
    console.log(
      `Stamped ${stamped} pages with contractVersion "${CONTRACT_VERSION}". ${skipped} already had contractVersion.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
