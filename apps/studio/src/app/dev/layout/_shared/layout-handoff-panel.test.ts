import { describe, expect, it } from "vitest";
import {
  getResponsiveDefaultLayoutHandoffVisibility,
  parseStoredLayoutHandoffVisibility,
  serializeLayoutHandoffVisibility,
  LAYOUT_HANDOFF_RESPONSIVE_MIN_WIDTH_PX,
} from "./layout-handoff-panel";

describe("layout-handoff-panel", () => {
  it("parses stored visibility values", () => {
    expect(parseStoredLayoutHandoffVisibility("visible")).toBe(true);
    expect(parseStoredLayoutHandoffVisibility("hidden")).toBe(false);
    expect(parseStoredLayoutHandoffVisibility("1")).toBe(true);
    expect(parseStoredLayoutHandoffVisibility("0")).toBe(false);
    expect(parseStoredLayoutHandoffVisibility("true")).toBe(true);
    expect(parseStoredLayoutHandoffVisibility("false")).toBe(false);
    expect(parseStoredLayoutHandoffVisibility("unexpected")).toBeNull();
    expect(parseStoredLayoutHandoffVisibility(null)).toBeNull();
  });

  it("serializes visibility values", () => {
    expect(serializeLayoutHandoffVisibility(true)).toBe("visible");
    expect(serializeLayoutHandoffVisibility(false)).toBe("hidden");
  });

  it("uses responsive default when no preference exists", () => {
    expect(
      getResponsiveDefaultLayoutHandoffVisibility(LAYOUT_HANDOFF_RESPONSIVE_MIN_WIDTH_PX - 1)
    ).toBe(false);
    expect(
      getResponsiveDefaultLayoutHandoffVisibility(LAYOUT_HANDOFF_RESPONSIVE_MIN_WIDTH_PX)
    ).toBe(true);
  });
});
