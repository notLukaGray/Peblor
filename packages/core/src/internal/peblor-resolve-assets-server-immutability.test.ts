import { describe, expect, it } from "vitest";
import { buildRawBgDefinitions } from "./peblor-resolve-assets-server";
import { walkBgBlock } from "./resolved-assets/peblor-asset-tree-walk";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

describe("buildRawBgDefinitions immutability", () => {
  it("does not retain nested aliases that break later bg-walk mutation", () => {
    const definitions = deepFreeze({
      heroBg: {
        type: "backgroundTransition",
        from: { type: "backgroundImage", image: "work/hero-from.webp" },
        to: { type: "backgroundImage", image: "work/hero-to.webp" },
      },
    });

    const out = buildRawBgDefinitions(definitions as never);

    expect(() =>
      walkBgBlock(out.heroBg!, (key, value, node) => {
        if (typeof value === "string" && key === "image") {
          node[key] = `https://cdn.example/${value}`;
        }
      })
    ).not.toThrow();
  });
});
