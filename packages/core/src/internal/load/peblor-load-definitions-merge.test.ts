import { describe, expect, it, vi } from "vitest";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { mergeNestedSectionDefinitions } from "./peblor-load-definitions-merge";

describe("mergeNestedSectionDefinitions", () => {
  it("does not let nested defs overwrite a section key", () => {
    const definitions: Record<string, PeblorDefinitionBlock> = {
      hero: { type: "contentBlock" } as unknown as PeblorDefinitionBlock,
    };
    const sectionSet = new Set(["hero"]);
    const globalKeys = new Set<string>();
    const nested = {
      hero: { type: "SHOULD_NOT_WIN" },
      extra: { type: "elementBody", text: "x" },
    };

    mergeNestedSectionDefinitions(definitions, nested, sectionSet, "hero.json", globalKeys);

    expect((definitions.hero as { type?: string }).type).toBe("contentBlock");
    expect((definitions.extra as { type?: string }).type).toBe("elementBody");
  });

  it("logs error and skips when a section definition tries to override a globals key", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const definitions: Record<string, PeblorDefinitionBlock> = {
      globalsShared: {
        type: "elementBody",
        text: "global",
      } as unknown as PeblorDefinitionBlock,
    };
    const sectionSet = new Set<string>();
    const globalKeys = new Set<string>(["globalsShared"]);

    mergeNestedSectionDefinitions(
      definitions,
      {
        globalsShared: { type: "elementBody", text: "section" },
      },
      sectionSet,
      "hero",
      globalKeys
    );

    expect(error).toHaveBeenCalledWith(
      "[content] section file hero attempted to override global key 'globalsShared' — skipped. Rename the local definition to avoid collision."
    );
    expect((definitions.globalsShared as { text?: string }).text).toBe("global");
    error.mockRestore();
  });
});
