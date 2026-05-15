import fs from "node:fs/promises";
import path from "node:path";
import { CONTRACT_VERSION, type ExporterCapability, type Peblor } from "@pb/contracts";
import { describe, expect, it } from "vitest";
import type { ExportResult, ExporterPlugin } from "./index";
import { createReferenceJsonExporter } from "./reference-exporters";
import { runExporterFixtureSuite, type ExporterFixture } from "./testkit";

const FIXTURES_DIR = path.join(process.cwd(), "packages/contracts/fixtures");

async function loadFixtureFiles(): Promise<string[]> {
  const entries = await fs.readdir(FIXTURES_DIR);
  return entries
    .filter((entry) => entry.endsWith(".index.json"))
    .sort((a, b) => a.localeCompare(b));
}

async function buildExporterFixtures(): Promise<ExporterFixture[]> {
  const files = await loadFixtureFiles();
  const fixtures: ExporterFixture[] = [];

  for (const file of files) {
    const fullPath = path.join(FIXTURES_DIR, file);
    const raw = await fs.readFile(fullPath, "utf8");
    fixtures.push({
      id: file,
      page: JSON.parse(raw) as Peblor,
    });
  }

  return fixtures;
}

function createSilentDropExporter(): ExporterPlugin {
  const capability: ExporterCapability = {
    type: "exporter",
    name: "silent-drop-exporter",
    version: "1.0.0",
    inputContractVersions: [CONTRACT_VERSION],
    outputTargets: ["peblor-json"],
    fidelityLevel: "low",
    diagnosticCodes: [],
  };

  return {
    capability,
    async export(page: Peblor): Promise<ExportResult> {
      const clone = JSON.parse(JSON.stringify(page)) as Peblor;
      if (typeof clone.title === "string" && clone.title.length > 0) {
        clone.title = "";
      }

      return {
        target: "peblor-json",
        output: clone,
        diagnostics: [],
      };
    },
  };
}

describe("@pb/extensions exporter reference adapters", () => {
  it("scores the reference json exporter at 100", async () => {
    const exporter = createReferenceJsonExporter();
    const fixtures = await buildExporterFixtures();
    const scorecard = await runExporterFixtureSuite(exporter, fixtures);

    expect(scorecard.total).toBeGreaterThan(0);
    expect(scorecard.failed).toBe(0);
    expect(scorecard.score).toBe(100);
  });

  it("fails when unsupported output changes are not diagnosed", async () => {
    const exporter = createSilentDropExporter();
    const fixtures = await buildExporterFixtures();
    const [first] = fixtures;
    expect(first).toBeDefined();

    const scorecard = await runExporterFixtureSuite(exporter, [
      {
        id: first!.id,
        page: first!.page,
        unsupportedPaths: ["$.title"],
      },
    ]);

    expect(scorecard.total).toBe(1);
    expect(scorecard.failed).toBe(1);
    expect(scorecard.score).toBe(0);
    expect(
      scorecard.results[0]?.diagnostics.some(
        (d) => d.code === "PB_EXT_EXPORT_MISSING_UNSUPPORTED_DIAGNOSTIC"
      )
    ).toBe(true);
  });
});
