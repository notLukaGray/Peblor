import { describe, expect, it } from "vitest";
import { resolveNumericVar } from "./layout-var-resolve";

describe("resolveNumericVar", () => {
  it("uses resolvedVariableModes to pick mode-aware float fallback values", () => {
    (globalThis as unknown as { figma?: unknown }).figma = {
      variables: {
        getVariableById: (id: string) =>
          id === "v-space"
            ? {
                name: "Tokens/Space/L",
                resolvedType: "FLOAT",
                variableCollectionId: "collection-1",
                valuesByMode: {
                  "mode-default": 16,
                  "mode-dark": 24,
                },
              }
            : null,
      },
    };

    const value = resolveNumericVar(
      {
        itemSpacing: { type: "VARIABLE_ALIAS", id: "v-space" },
      },
      "itemSpacing",
      8,
      "px",
      {
        resolvedVariableModes: { "collection-1": "mode-dark" },
      } as unknown as SceneNode
    );

    expect(value).toBe("var(--tokens-space-l, 24px)");
  });

  it("supports array-valued alias maps and falls back when no mode is resolved", () => {
    (globalThis as unknown as { figma?: unknown }).figma = {
      variables: {
        getVariableById: (id: string) =>
          id === "v-size"
            ? {
                name: "Typography/Size/Base",
                resolvedType: "FLOAT",
                variableCollectionId: "collection-2",
                valuesByMode: {
                  "mode-default": 18,
                },
              }
            : null,
      },
    };

    const value = resolveNumericVar(
      {
        fontSize: [{ type: "VARIABLE_ALIAS", id: "v-size" }],
      },
      "fontSize",
      14,
      "px",
      {} as SceneNode
    );

    expect(value).toBe("var(--typography-size-base, 14px)");
  });
});
