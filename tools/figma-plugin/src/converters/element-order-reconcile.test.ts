import { describe, it, expect } from "vitest";
import { reconcileElementOrderWithDefinitions } from "./element-order-reconcile";

describe("element-order-reconcile", () => {
  it("drops order keys missing from definitions", () => {
    expect(reconcileElementOrderWithDefinitions(["gone", "a"], { a: { type: "x" } })).toEqual([
      "a",
    ]);
  });

  it("appends definition keys omitted from elementOrder", () => {
    expect(
      reconcileElementOrderWithDefinitions(["b"], {
        b: { id: "b" },
        orphan: { id: "o" },
      })
    ).toEqual(["b", "orphan"]);
  });

  it("keeps duplicate ordered entries as-is for deterministic passthrough", () => {
    expect(
      reconcileElementOrderWithDefinitions(["a", "a"], {
        a: { id: "a" },
      })
    ).toEqual(["a", "a"]);
  });
});
