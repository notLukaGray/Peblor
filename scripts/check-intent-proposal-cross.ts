#!/usr/bin/env npx tsx

import { execSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const INTENT_DIR = "packages/catalog/src/intent";
const PROPOSALS_DIR = "proposals";

function getNewIntentFiles(): string[] {
  try {
    const output = execSync(
      `git diff origin/main...HEAD --diff-filter=A --name-only -- '${INTENT_DIR}/*.intent.yaml'`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function hasBaseBranch(): boolean {
  try {
    execSync("git rev-parse origin/main", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function extractIdFromIntent(filePath: string): string | null {
  try {
    const content = readFileSync(join(REPO_ROOT, filePath), "utf8");
    const match = content.match(/^id:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function getProposalIds(): Map<string, string> {
  const dir = join(REPO_ROOT, PROPOSALS_DIR);
  if (!existsSync(dir)) return new Map();

  const ids = new Map<string, string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".proposal.yaml")) continue;
    try {
      const content = readFileSync(join(dir, file), "utf8");
      const idMatch = content.match(/^id:\s*(.+)$/m);
      const statusMatch = content.match(/^status:\s*(.+)$/m);
      if (idMatch && statusMatch) {
        ids.set(idMatch[1].trim(), statusMatch[1].trim());
      }
    } catch {
      continue;
    }
  }
  return ids;
}

function hasBypassFlag(): boolean {
  try {
    const commitMsg = execSync("git log -1 --format=%B", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return /Catalog-Bypass:/i.test(commitMsg);
  } catch {
    return false;
  }
}

function main(): void {
  if (!hasBaseBranch()) {
    console.error(
      "ERROR: origin/main is not available (shallow clone or missing remote ref). Cannot verify new intents against the base branch."
    );
    process.exit(2);
  }

  const newIntents = getNewIntentFiles();

  if (newIntents.length === 0) {
    console.log("No new intent files detected. Pass.");
    process.exit(0);
  }

  if (hasBypassFlag()) {
    console.log("Catalog-Bypass trailer detected. Skipping cross-check.");
    process.exit(0);
  }

  const proposalIds = getProposalIds();
  let failed = false;

  for (const intentFile of newIntents) {
    const clusterId = extractIdFromIntent(intentFile);

    if (!clusterId) {
      console.error(`ERROR: ${intentFile} — could not extract 'id' field`);
      failed = true;
      continue;
    }

    if (!proposalIds.has(clusterId)) {
      console.error(
        `ERROR: ${intentFile} (id: ${clusterId}) — no matching proposal found in ${PROPOSALS_DIR}/`
      );
      console.error(
        `  A proposal with id: ${clusterId} and status: accepted is required for new clusters.`
      );
      failed = true;
      continue;
    }

    const status = proposalIds.get(clusterId)!;
    if (status !== "accepted") {
      console.error(
        `ERROR: ${intentFile} (id: ${clusterId}) — proposal status is '${status}', must be 'accepted'`
      );
      failed = true;
    }
  }

  if (failed) {
    console.error(
      "\nNew intent files require a matching accepted proposal in proposals/. Run:\n" +
        "  npm run pb-cli -- propose new --intent '<description>'\n" +
        "  # fill the proposal, then:\n" +
        "  npm run pb-cli -- propose --check proposals/<slug>.proposal.yaml\n" +
        "Commit with 'Catalog-Bypass: <reason>' trailer to override."
    );
    process.exit(1);
  }

  console.log(
    `All ${newIntents.length} new intent file(s) have matching accepted proposals. Pass.`
  );
}

main();
