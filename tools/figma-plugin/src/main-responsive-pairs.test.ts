import { describe, expect, it } from "vitest";
import { detectResponsivePairs, explainResponsiveOverrideOrphans } from "./main-responsive-pairs";

function makeFrame(id: string, name: string): FrameNode {
  return {
    id,
    type: "FRAME",
    name,
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    visible: true,
    children: [],
  } as FrameNode;
}

describe("detectResponsivePairs", () => {
  it("keeps first frame for duplicate desktop/mobile keys and warns deterministically", () => {
    const frames = [
      makeFrame("d1", "Section[Desktop]/Hero"),
      makeFrame("d2", "Section[Desktop]/Hero"),
      makeFrame("m1", "Section[Mobile]/Hero"),
      makeFrame("m2", "Section[Mobile]/Hero"),
    ];

    const result = detectResponsivePairs(frames, {});

    expect(result.desktopFramesByKey.get("hero")?.id).toBe("d1");
    expect(result.mobileFramesByKey.get("hero")?.id).toBe("m1");
    expect(result.pairedKeys.has("hero")).toBe(true);
    expect(result.tempCtxWarnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'keeping "Section[Desktop]/Hero" and ignoring "Section[Desktop]/Hero"'
        ),
        expect.stringContaining(
          'keeping "Section[Mobile]/Hero" and ignoring "Section[Mobile]/Hero"'
        ),
      ])
    );
  });

  it("treats overridden responsive-looking frames as normal frames", () => {
    const desktop = makeFrame("d1", "Section[Desktop]/Hero");
    const mobile = makeFrame("m1", "Section[Mobile]/Hero");
    const result = detectResponsivePairs([desktop, mobile], { d1: "page" });

    expect(result.normalFrames.map((f) => f.id)).toEqual(["d1"]);
    expect(result.pairedKeys.size).toBe(0);
    expect(result.tempCtxWarnings.some((w) => w.includes("counterpart"))).toBe(true);
  });

  it("adds override-orphan explanation when counterpart is overridden", () => {
    const desktop = makeFrame("d1", "Section[Desktop]/Hero");
    const mobile = makeFrame("m1", "Section[Mobile]/Hero");
    const pairResult = detectResponsivePairs([desktop, mobile], { d1: "page" });

    const extra = explainResponsiveOverrideOrphans(
      pairResult.desktopFramesByKey,
      pairResult.mobileFramesByKey,
      pairResult.normalFrames,
      { d1: "page" }
    );

    expect(extra).toHaveLength(1);
    expect(extra[0]).toContain("uses a UI target override");
    expect(extra[0]).toContain("Section[Mobile]/Hero");
  });
});
