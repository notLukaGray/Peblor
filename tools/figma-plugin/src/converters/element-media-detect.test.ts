import { describe, it, expect } from "vitest";
import {
  nameSuggestsVideo,
  nameSuggestsImageMedia,
  inferImageInferenceMeta,
} from "./element-media-detect";

describe("element-media-detect", () => {
  it("nameSuggestsVideo matches common naming patterns", () => {
    expect(nameSuggestsVideo("Hero trailer block")).toBe(true);
    expect(nameSuggestsVideo("vid-intro")).toBe(true);
    expect(nameSuggestsVideo("Static card")).toBe(false);
  });

  it("nameSuggestsImageMedia matches poster/cover naming", () => {
    expect(nameSuggestsImageMedia("Hero poster")).toBe(true);
    expect(nameSuggestsImageMedia("thumb-asset")).toBe(true);
    expect(nameSuggestsImageMedia("Label")).toBe(false);
  });

  it("inferImageInferenceMeta skips explicit image annotation", () => {
    const node = { type: "FRAME", name: "Pic" } as unknown as SceneNode;
    expect(inferImageInferenceMeta(node, { type: "image" })).toBeNull();
  });

  it("inferImageInferenceMeta prefers name hint over generic fill when name matches", () => {
    const node = { type: "FRAME", name: "Cover image" } as unknown as SceneNode;
    expect(inferImageInferenceMeta(node, {})).toEqual({
      kind: "elementImage",
      confidence: "medium",
      detail: "layer-name",
    });
  });
});
