import { describe, it, expect } from "vitest";
import { inferVideoInferenceMeta, isVideoNode } from "./video-detect";

describe("video-detect inference meta", () => {
  it("returns null for explicit video type annotation", () => {
    const node = { type: "FRAME", name: "Clip" } as unknown as SceneNode;
    expect(inferVideoInferenceMeta(node, { type: "video" })).toBeNull();
  });

  it("returns medium confidence for name heuristics", () => {
    const node = { type: "FRAME", name: "Promo trailer" } as unknown as SceneNode;
    expect(inferVideoInferenceMeta(node, {})).toMatchObject({
      kind: "elementVideo",
      confidence: "medium",
      detail: "layer-name",
    });
  });

  it("returns high confidence for instance video src property", () => {
    const node = {
      type: "INSTANCE",
      name: "Media",
      componentProperties: { src: { type: "TEXT", value: "https://cdn.test/v.mp4" } },
    } as unknown as SceneNode;
    expect(inferVideoInferenceMeta(node, {})).toMatchObject({
      confidence: "high",
      detail: "instance-src",
    });
    expect(isVideoNode(node, {})).toBe(true);
  });

  it("falls back to low-confidence heuristic when nothing explicit matches", () => {
    const node = { type: "FRAME", name: "Gallery Tile", fills: [] } as unknown as SceneNode;
    expect(inferVideoInferenceMeta(node, {})).toMatchObject({
      confidence: "low",
      detail: "heuristic-fallback",
    });
    expect(isVideoNode(node, {})).toBe(false);
  });
});
