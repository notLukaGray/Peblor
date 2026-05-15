import { describe, expect, it } from "vitest";
import { STATIC_ELEMENT_TYPES } from "../analyze/block-capabilities";
import { SERVER_ELEMENT_COMPONENTS } from "./server-element-registry";

describe("server/analyzer element consistency", () => {
  it("keeps server registry aligned with analyzer static types", () => {
    const registryTypes = Object.keys(SERVER_ELEMENT_COMPONENTS);

    for (const type of registryTypes) {
      expect(STATIC_ELEMENT_TYPES.has(type)).toBe(true);
    }

    const staticTypesThatNeedRegistry = Array.from(STATIC_ELEMENT_TYPES).filter(
      (type) => type !== "elementGroup"
    );
    for (const type of staticTypesThatNeedRegistry) {
      expect(registryTypes).toContain(type);
    }
  });
});
