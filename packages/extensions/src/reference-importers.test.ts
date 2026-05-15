import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createReferenceJsonFileImporter,
  createThirdPartyPayloadImporter,
} from "./reference-importers";
import { runImporterFixtureSuite, type ImporterFixture } from "./testkit";

const FIXTURES_DIR = path.join(process.cwd(), "packages/contracts/fixtures");

async function loadFixtureFiles(): Promise<string[]> {
  const entries = await fs.readdir(FIXTURES_DIR);
  return entries
    .filter((entry) => entry.endsWith(".index.json"))
    .sort((a, b) => a.localeCompare(b));
}

async function buildFileFixtures(): Promise<ImporterFixture[]> {
  const files = await loadFixtureFiles();
  return files.map((file) => ({
    id: file,
    source: { path: path.join(FIXTURES_DIR, file) },
  }));
}

async function buildThirdPartyFixtures(): Promise<ImporterFixture[]> {
  const files = await loadFixtureFiles();
  const fixtures: ImporterFixture[] = [];
  for (const file of files) {
    const fullPath = path.join(FIXTURES_DIR, file);
    const raw = await fs.readFile(fullPath, "utf8");
    fixtures.push({
      id: file,
      source: {
        payload: JSON.parse(raw) as unknown,
        metadata: {
          source: "fixture",
          path: fullPath,
        },
      },
    });
  }
  return fixtures;
}

describe("@pb/extensions importer reference adapters", () => {
  it("scores the reference json-file importer at 100", async () => {
    const importer = createReferenceJsonFileImporter();
    const fixtures = await buildFileFixtures();
    const scorecard = await runImporterFixtureSuite(importer, fixtures);

    expect(scorecard.total).toBeGreaterThan(0);
    expect(scorecard.failed).toBe(0);
    expect(scorecard.score).toBe(100);
  });

  it("scores the third-party payload importer at 100", async () => {
    const importer = createThirdPartyPayloadImporter();
    const fixtures = await buildThirdPartyFixtures();
    const scorecard = await runImporterFixtureSuite(importer, fixtures);

    expect(scorecard.total).toBeGreaterThan(0);
    expect(scorecard.failed).toBe(0);
    expect(scorecard.score).toBe(100);
  });
});
