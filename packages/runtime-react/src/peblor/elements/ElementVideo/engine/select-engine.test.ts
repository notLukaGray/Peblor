import { afterEach, describe, expect, it, vi } from "vitest";
import { selectVideoEngineKind } from "./select-engine";

describe("selectVideoEngineKind", () => {
  const originalMediaSource = window.MediaSource;

  afterEach(() => {
    if (originalMediaSource === undefined) {
      Reflect.deleteProperty(window, "MediaSource");
      return;
    }

    Object.defineProperty(window, "MediaSource", {
      configurable: true,
      writable: true,
      value: originalMediaSource,
    });
  });

  it("returns progressive for DASH sources when MediaSource is unavailable", () => {
    Reflect.deleteProperty(window, "MediaSource");
    const video = document.createElement("video");

    expect(selectVideoEngineKind(video, "work/demo/vp9/manifest.mpd")).toBe("progressive");
  });

  it("returns dash-js for DASH sources when MediaSource is available", () => {
    Object.defineProperty(window, "MediaSource", {
      configurable: true,
      writable: true,
      value: class MediaSourceStub {},
    });
    const video = document.createElement("video");

    expect(selectVideoEngineKind(video, "work/demo/vp9/manifest.mpd")).toBe("dash-js");
  });

  it("returns native-hls for HLS sources supported by the video element", () => {
    const video = document.createElement("video");
    vi.spyOn(video, "canPlayType").mockReturnValue("probably");

    expect(selectVideoEngineKind(video, "work/demo/x264/master.m3u8")).toBe("native-hls");
  });
});
