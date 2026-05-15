import fs from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { PAGE_DATA_DIR } from "./peblor-load-io";
import { hydrateSectionFilesBySegmentsAsync } from "./peblor-load-definitions-hydrate";

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

describe("hydrateSectionFilesBySegmentsAsync", () => {
  it("keeps section keys protected and applies deterministic fragment order", async () => {
    const slug = `loader-test-${randomUUID()}`;
    const pageDir = path.join(PAGE_DATA_DIR, slug);
    fs.mkdirSync(pageDir, { recursive: true });

    try {
      writeJson(path.join(pageDir, "hero.json"), {
        type: "contentBlock",
        definitions: {
          hero: { type: "SHOULD_NOT_WIN" },
          nestedOnly: { type: "elementBody", text: "nested" },
        },
      });
      writeJson(path.join(pageDir, "z-fragment.json"), {
        shared: { type: "elementBody", text: "z" },
      });
      writeJson(path.join(pageDir, "a-fragment.json"), {
        shared: { type: "elementBody", text: "a" },
      });

      const defs = (await hydrateSectionFilesBySegmentsAsync({}, [slug], ["hero"])) as Record<
        string,
        PeblorDefinitionBlock & { text?: string }
      >;

      expect((defs.hero as { type?: string }).type).toBe("contentBlock");
      expect((defs.nestedOnly as { type?: string }).type).toBe("elementBody");
      // Last fragment wins when duplicate keys exist
      expect((defs.shared as { text?: string }).text).toBe("z");
    } finally {
      fs.rmSync(pageDir, { recursive: true, force: true });
    }
  });

  it("produces identical merged output across different file creation orders", async () => {
    const slugA = `loader-order-a-${randomUUID()}`;
    const slugB = `loader-order-b-${randomUUID()}`;
    const dirA = path.join(PAGE_DATA_DIR, slugA);
    const dirB = path.join(PAGE_DATA_DIR, slugB);
    fs.mkdirSync(dirA, { recursive: true });
    fs.mkdirSync(dirB, { recursive: true });

    try {
      writeJson(path.join(dirA, "hero.json"), {
        type: "contentBlock",
        definitions: {
          fromSection: { type: "elementBody", text: "section" },
        },
      });
      writeJson(path.join(dirA, "z-fragment.json"), {
        shared: { type: "elementBody", text: "z" },
      });
      writeJson(path.join(dirA, "a-fragment.json"), {
        shared: { type: "elementBody", text: "a" },
      });

      writeJson(path.join(dirB, "a-fragment.json"), {
        shared: { type: "elementBody", text: "a" },
      });
      writeJson(path.join(dirB, "z-fragment.json"), {
        shared: { type: "elementBody", text: "z" },
      });
      writeJson(path.join(dirB, "hero.json"), {
        type: "contentBlock",
        definitions: {
          fromSection: { type: "elementBody", text: "section" },
        },
      });

      const defsA = await hydrateSectionFilesBySegmentsAsync({}, [slugA], ["hero"]);
      const defsB = await hydrateSectionFilesBySegmentsAsync({}, [slugB], ["hero"]);

      expect(defsA).toEqual(defsB);
    } finally {
      fs.rmSync(dirA, { recursive: true, force: true });
      fs.rmSync(dirB, { recursive: true, force: true });
    }
  });
});
