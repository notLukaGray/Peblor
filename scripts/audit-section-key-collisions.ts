#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";
import { discoverAllPages } from "@pb/core/load";
import { parseJsonSafe } from "@pb/core/loader";

type Collision = {
  slug: string;
  file: string;
  key: string;
  where: "top-level" | "definitions";
};

function collectDefinitionKeys(value: unknown): string[] {
  const out: string[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const record = node as Record<string, unknown>;
    const defs = record.definitions;
    if (defs && typeof defs === "object" && !Array.isArray(defs)) {
      out.push(...Object.keys(defs as Record<string, unknown>));
    }
    for (const child of Object.values(record)) visit(child);
  };
  visit(value);
  return out;
}

async function main(): Promise<void> {
  const pages = await discoverAllPages();
  const collisions: Collision[] = [];

  for (const page of pages) {
    const pageDir = path.dirname(page.contentPath);
    const slug = page.slugSegments.join("/");
    const rawIndex = fs.readFileSync(page.contentPath, "utf8");
    const parsedIndex = parseJsonSafe<Record<string, unknown>>(rawIndex);
    if (!parsedIndex.ok || !parsedIndex.data || typeof parsedIndex.data !== "object") continue;

    const orderRaw = parsedIndex.data.sectionOrder;
    if (!Array.isArray(orderRaw) || orderRaw.length === 0) continue;
    const sectionOrder = new Set(
      orderRaw.filter((value): value is string => typeof value === "string")
    );

    const siblings = fs
      .readdirSync(pageDir)
      .filter((name) => name.endsWith(".json") && name !== "index.json")
      .sort((a, b) => a.localeCompare(b));

    for (const sibling of siblings) {
      const siblingPath = path.join(pageDir, sibling);
      const raw = fs.readFileSync(siblingPath, "utf8");
      const parsed = parseJsonSafe<Record<string, unknown>>(raw);
      if (!parsed.ok || !parsed.data || typeof parsed.data !== "object") continue;

      for (const topKey of Object.keys(parsed.data)) {
        if (sectionOrder.has(topKey)) {
          collisions.push({ slug, file: sibling, key: topKey, where: "top-level" });
        }
      }

      for (const defKey of collectDefinitionKeys(parsed.data)) {
        if (sectionOrder.has(defKey)) {
          collisions.push({ slug, file: sibling, key: defKey, where: "definitions" });
        }
      }
    }
  }

  if (collisions.length === 0) {
    console.log(`No section-key collisions found across ${pages.length} pages.`);
    return;
  }

  console.error(`Found ${collisions.length} section-key collisions:`);
  for (const hit of collisions) {
    console.error(`- ${hit.slug}: ${hit.file} -> ${hit.where} key \"${hit.key}\"`);
  }
  process.exit(1);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
