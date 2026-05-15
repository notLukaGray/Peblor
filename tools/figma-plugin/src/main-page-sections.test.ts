import { describe, expect, it } from "vitest";
import {
  findExplicitPageSections,
  inferPageSectionsFromDirectChildren,
} from "./main-page-sections";

function makeFrame(
  id: string,
  name: string,
  children: SceneNode[] = [],
  overrides: Partial<FrameNode> = {}
): FrameNode {
  return {
    id,
    type: "FRAME",
    name,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    visible: true,
    children,
    ...overrides,
  } as FrameNode;
}

describe("main-page-sections", () => {
  it("finds explicit Section/* direct child frames", () => {
    const hero = makeFrame("s1", "Section/Hero", [], { y: 100 });
    const cta = makeFrame("s2", "Section/CTA", [], { y: 500 });
    const page = makeFrame("p1", "Page/Landing", [
      hero as unknown as SceneNode,
      cta as unknown as SceneNode,
    ]);

    const sections = findExplicitPageSections(page);
    expect(sections.map((frame) => frame.name)).toEqual(["Section/Hero", "Section/CTA"]);
  });

  it("finds explicit Section/* frames inside a single wrapper child", () => {
    const hero = makeFrame("s1", "Section/Hero");
    const footer = makeFrame("s2", "Section/Footer", [], { y: 700 });
    const wrapper = makeFrame("w1", "Frame 1000", [
      hero as unknown as SceneNode,
      footer as unknown as SceneNode,
    ]);
    const page = makeFrame("p1", "Page/Landing", [wrapper as unknown as SceneNode]);

    const sections = findExplicitPageSections(page);
    expect(sections.map((frame) => frame.name)).toEqual(["Section/Hero", "Section/Footer"]);
  });

  it("infers sections from mostly-frame direct children", () => {
    const frameA = makeFrame("f1", "Frame A", [], { y: 100 });
    const frameB = makeFrame("f2", "Frame B", [], { y: 500 });
    const page = makeFrame("p1", "Page/Landing", [
      frameA as unknown as SceneNode,
      frameB as unknown as SceneNode,
    ]);

    const inferred = inferPageSectionsFromDirectChildren(page);
    expect(inferred.map((frame) => frame.name)).toEqual(["Frame A", "Frame B"]);
  });
});
