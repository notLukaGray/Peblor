import { describe, expect, it } from "vitest";
import { STATIC_SECTION_TYPES } from "../analyze/block-capabilities";
import { SERVER_SECTION_COMPONENTS } from "./server-section-registry";

describe("server/analyzer section consistency", () => {
  it("keeps server section registry aligned with analyzer static types", () => {
    const registryTypes = Object.keys(SERVER_SECTION_COMPONENTS);

    for (const type of registryTypes) {
      expect(STATIC_SECTION_TYPES.has(type)).toBe(true);
    }

    for (const type of STATIC_SECTION_TYPES) {
      expect(registryTypes).toContain(type);
    }
  });
});
