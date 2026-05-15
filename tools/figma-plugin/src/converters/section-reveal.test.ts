import { describe, it, expect } from "vitest";
import { isRevealSlotChildFlattenSafe } from "./section-reveal";

describe("section-reveal", () => {
  describe("isRevealSlotChildFlattenSafe", () => {
    it("allows flatten only for pass-through containers", () => {
      expect(
        isRevealSlotChildFlattenSafe({
          type: "FRAME",
          clipsContent: false,
          effects: [],
          strokes: [],
          layoutMode: "NONE",
          fills: [],
          opacity: 1,
        } as unknown as SceneNode)
      ).toBe(true);
    });

    it("disallows flatten when the slot clips content", () => {
      expect(
        isRevealSlotChildFlattenSafe({
          type: "FRAME",
          clipsContent: true,
          effects: [],
          strokes: [],
          layoutMode: "NONE",
          fills: [],
        } as unknown as SceneNode)
      ).toBe(false);
    });

    it("disallows flatten when auto-layout applies spacing", () => {
      expect(
        isRevealSlotChildFlattenSafe({
          type: "FRAME",
          clipsContent: false,
          effects: [],
          strokes: [],
          layoutMode: "VERTICAL",
          itemSpacing: 8,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          fills: [],
        } as unknown as SceneNode)
      ).toBe(false);
    });
  });
});
