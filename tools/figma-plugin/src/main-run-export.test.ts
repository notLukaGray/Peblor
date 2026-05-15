import { describe, expect, it } from "vitest";
import { resolveWrapperFrames } from "./main-run-export";

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

describe("resolveWrapperFrames", () => {
  it("unwraps a marked wrapper when it has exactly one visible child frame", () => {
    const page = makeFrame("child", "Page/Test");
    const wrapper = makeFrame("wrapper", "pb-wrapper", [page as unknown as SceneNode]);

    expect(resolveWrapperFrames([wrapper])).toEqual([page]);
  });

  it("unwraps wrappers for alternate marker names", () => {
    const page = makeFrame("child", "Page/Test");
    const wrapper = makeFrame("wrapper", "pb-export-wrapper", [page as unknown as SceneNode]);

    expect(resolveWrapperFrames([wrapper])).toEqual([page]);
  });

  it("unwraps a marked wrapper to a page child when multiple child frames exist", () => {
    const section = makeFrame("child-1", "Section/Hero");
    const page = makeFrame("child-2", "Page/Test");
    const wrapper = makeFrame("wrapper", "pb-wrapper", [
      section as unknown as SceneNode,
      page as unknown as SceneNode,
    ]);

    expect(resolveWrapperFrames([wrapper])).toEqual([page]);
  });

  it("keeps a marked wrapper when it is ambiguous (multiple non-page child frames)", () => {
    const sectionA = makeFrame("child-1", "Section/Hero");
    const sectionB = makeFrame("child-2", "Section/Footer");
    const wrapper = makeFrame("wrapper", "pb-wrapper", [
      sectionA as unknown as SceneNode,
      sectionB as unknown as SceneNode,
    ]);

    expect(resolveWrapperFrames([wrapper])).toEqual([wrapper]);
  });

  it("does not unwrap unmarked frames", () => {
    const page = makeFrame("child", "Page/Test");
    const unmarked = makeFrame("frame", "Layout Container", [page as unknown as SceneNode]);

    expect(resolveWrapperFrames([unmarked])).toEqual([unmarked]);
  });

  it("dedupes to one frame when both wrapper and resolved child are selected", () => {
    const page = makeFrame("child", "Page/Test");
    const wrapper = makeFrame("wrapper", "pb-wrapper", [page as unknown as SceneNode]);

    expect(resolveWrapperFrames([wrapper, page])).toEqual([page]);
  });
});
