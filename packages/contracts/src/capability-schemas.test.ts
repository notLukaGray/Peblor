import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  cmsAdapterCapabilitySchema,
  exporterCapabilitySchema,
  importerCapabilitySchema,
} from "./capability-schemas";

const CAPABILITY_FIXTURES_DIR = path.join(
  process.cwd(),
  "packages/contracts/fixtures/capabilities"
);

async function readFixture<T>(fileName: string): Promise<T> {
  const fullPath = path.join(CAPABILITY_FIXTURES_DIR, fileName);
  const raw = await fs.readFile(fullPath, "utf8");
  return JSON.parse(raw) as T;
}

describe("@pb/contracts capability schemas", () => {
  it("validates importer capability example fixture", async () => {
    const fixture = await readFixture<unknown>("importer-capability.example.json");
    const parsed = importerCapabilitySchema.safeParse(fixture);

    expect(parsed.success).toBe(true);
  });

  it("validates exporter capability example fixture", async () => {
    const fixture = await readFixture<unknown>("exporter-capability.example.json");
    const parsed = exporterCapabilitySchema.safeParse(fixture);

    expect(parsed.success).toBe(true);
  });

  it("validates CMS adapter capability example fixture", async () => {
    const fixture = await readFixture<unknown>("cms-adapter-capability.example.json");
    const parsed = cmsAdapterCapabilitySchema.safeParse(fixture);

    expect(parsed.success).toBe(true);
  });
});
