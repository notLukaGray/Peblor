import { describe, expect, it } from "vitest";
import { normalizeTransitionEventId } from "./background-transition-effect-event-listeners";

describe("background-transition-effect-event-listeners", () => {
  describe("normalizeTransitionEventId", () => {
    it("returns null for missing or empty ids", () => {
      expect(normalizeTransitionEventId(undefined)).toBeNull();
      expect(normalizeTransitionEventId("")).toBeNull();
      expect(normalizeTransitionEventId("   ")).toBeNull();
    });

    it("returns a trimmed id when present", () => {
      expect(normalizeTransitionEventId("transition-1")).toBe("transition-1");
      expect(normalizeTransitionEventId("  transition-2  ")).toBe("transition-2");
    });
  });
});
