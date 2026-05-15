import { describe, expect, it } from "vitest";
import type { ElementBlock, SectionBlock } from "@pb/contracts";
import { discoverAllPages, loadPeblorByPathAsync } from "@pb/core/loader";
import { expandPeblor } from "@pb/core/expand";
import { SECTION_COMPONENTS } from "@/peblor/section";
import { ELEMENT_COMPONENTS } from "@/peblor/elements";

function collectElementsFromSection(section: SectionBlock): ElementBlock[] {
  const out: ElementBlock[] = [];
  const visitElement = (element: ElementBlock): void => {
    out.push(element);
    const el = element as ElementBlock & {
      section?: { definitions?: Record<string, unknown> };
      moduleConfig?: {
        slots?: Record<string, { section?: { definitions?: Record<string, unknown> } }>;
      };
    };
    if (el.section?.definitions) {
      for (const def of Object.values(el.section.definitions)) {
        if (def && typeof def === "object" && "type" in def) {
          visitElement(def as ElementBlock);
        }
      }
    }
    if (el.moduleConfig?.slots) {
      for (const slot of Object.values(el.moduleConfig.slots)) {
        const defs = slot?.section?.definitions;
        if (!defs) continue;
        for (const def of Object.values(defs)) {
          if (def && typeof def === "object" && "type" in def) {
            visitElement(def as ElementBlock);
          }
        }
      }
    }
  };

  const main = (section as { elements?: ElementBlock[] }).elements;
  if (Array.isArray(main)) {
    for (const element of main) {
      if (element && typeof element === "object") visitElement(element);
    }
  }

  if (section.type === "revealSection") {
    const reveal = section as SectionBlock & {
      collapsedElements?: ElementBlock[];
      revealedElements?: ElementBlock[];
    };
    for (const element of reveal.collapsedElements ?? []) visitElement(element);
    for (const element of reveal.revealedElements ?? []) visitElement(element);
  }

  return out;
}

describe("peblor render registry smoke", () => {
  it("ensures every discovered page resolves to known section/element renderer types", async () => {
    const pages = await discoverAllPages();
    const unknownSectionTypes = new Set<string>();
    const unknownElementTypes = new Set<string>();

    for (const page of pages) {
      const loaded = await loadPeblorByPathAsync(page.slugSegments);
      expect(loaded).not.toBeNull();
      if (!loaded) continue;

      const expanded = expandPeblor(loaded);
      for (const section of expanded.sections) {
        if (!SECTION_COMPONENTS[section.type]) unknownSectionTypes.add(section.type);
        for (const element of collectElementsFromSection(section)) {
          if (!ELEMENT_COMPONENTS[element.type]) unknownElementTypes.add(element.type);
        }
      }
    }

    expect(Array.from(unknownSectionTypes)).toEqual([]);
    expect(Array.from(unknownElementTypes)).toEqual([]);
  });
});
