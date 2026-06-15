import { describe, it, expect, vi } from "vitest";
import {
  resolveVideoShowWhen,
  getVideoActionHandler,
  resolveVideoLink,
  choosePreferredVideoSource,
  getElementVideoVideoStyle,
  getElementVideoInnerStyle,
  type VideoShowWhenState,
  type VideoActionHandlers,
  type VideoSourceSupportProbe,
} from "./element-video-utils";

describe("element-video-utils", () => {
  const state: VideoShowWhenState = {
    isPlaying: true,
    isMuted: false,
    isFullscreen: false,
  };

  describe("resolveVideoShowWhen", () => {
    it("returns true when showWhen is undefined", () => {
      expect(resolveVideoShowWhen(undefined, state)).toBe(true);
    });
    it("returns isPlaying for assetPlaying", () => {
      expect(resolveVideoShowWhen("assetPlaying", state)).toBe(true);
      expect(resolveVideoShowWhen("assetPlaying", { ...state, isPlaying: false })).toBe(false);
    });
    it("returns !isPlaying for assetPaused", () => {
      expect(resolveVideoShowWhen("assetPaused", state)).toBe(false);
    });
    it("returns isMuted for assetMuted", () => {
      expect(resolveVideoShowWhen("assetMuted", { ...state, isMuted: true })).toBe(true);
    });
    it("returns isFullscreen for videoFullscreen", () => {
      expect(resolveVideoShowWhen("videoFullscreen", { ...state, isFullscreen: true })).toBe(true);
    });
    it("returns true for unknown showWhen", () => {
      expect(resolveVideoShowWhen("unknown", state)).toBe(true);
    });
  });

  describe("getVideoActionHandler", () => {
    const handlers: VideoActionHandlers = {
      onPlay: () => {},
      onPause: () => {},
      onTogglePlay: () => {},
      onSeek: () => {},
      onMuteToggle: () => {},
      onFullscreenToggle: () => {},
    };

    it("returns undefined when action is undefined", () => {
      expect(getVideoActionHandler(undefined, undefined, handlers)).toBeUndefined();
    });
    it("returns onPlay for assetPlay", () => {
      const fn = getVideoActionHandler("assetPlay", undefined, handlers);
      expect(fn).toBe(handlers.onPlay);
    });
    it("returns function that calls onSeek(payload) for assetSeek", () => {
      const onSeek = vi.fn();
      const fn = getVideoActionHandler("assetSeek", -10, { ...handlers, onSeek });
      expect(fn).toBeDefined();
      fn!();
      expect(onSeek).toHaveBeenCalledWith(-10);
    });
    it("uses 0 when assetSeek payload is undefined", () => {
      const onSeek = vi.fn();
      const fn = getVideoActionHandler("assetSeek", undefined, { ...handlers, onSeek });
      fn!();
      expect(onSeek).toHaveBeenCalledWith(0);
    });
  });

  describe("resolveVideoLink", () => {
    it("returns not linkable when showPlayButton is true", () => {
      expect(resolveVideoLink({ ref: "/page" }, true)).toEqual({
        isLinkable: false,
        resolvedHref: null,
        isInternal: false,
      });
    });
    it("returns not linkable when link has no ref", () => {
      expect(resolveVideoLink({}, false)).toEqual({
        isLinkable: false,
        resolvedHref: null,
        isInternal: false,
      });
    });
    it("returns internal link for / path", () => {
      expect(resolveVideoLink({ ref: "/about" }, false)).toEqual({
        isLinkable: true,
        resolvedHref: "/about",
        isInternal: true,
      });
    });
    it("returns internal link for # anchor", () => {
      expect(resolveVideoLink({ ref: "#section" }, false)).toEqual({
        isLinkable: true,
        resolvedHref: "#section",
        isInternal: false,
      });
    });
    it("prefixes with # when ref is not external and not / or #", () => {
      expect(resolveVideoLink({ ref: "section-id" }, false)).toEqual({
        isLinkable: true,
        resolvedHref: "#section-id",
        isInternal: false,
      });
    });
    it("returns external when link.external is true", () => {
      expect(resolveVideoLink({ ref: "https://example.com", external: true }, false)).toEqual({
        isLinkable: true,
        resolvedHref: "https://example.com",
        isInternal: false,
        target: "_blank",
        rel: "noopener noreferrer",
      });
    });

    it("respects explicit target/rel overrides", () => {
      expect(
        resolveVideoLink(
          { ref: "https://example.com", external: true, target: "_self", rel: "nofollow" },
          false
        )
      ).toEqual({
        isLinkable: true,
        resolvedHref: "https://example.com",
        isInternal: false,
        target: "_self",
        rel: "nofollow",
      });
    });
  });

  describe("choosePreferredVideoSource", () => {
    const vp9Dash = {
      src: "work/demo/vp9/manifest.mpd",
      type: 'video/webm; codecs="vp09.00.51.08"',
    };
    const hevcHls = {
      src: "work/demo/x265/master.m3u8",
      type: 'application/vnd.apple.mpegurl; codecs="hvc1.1.6.L123.B0,mp4a.40.2"',
    };
    const avcHls = {
      src: "work/demo/x264/master.m3u8",
      type: 'application/vnd.apple.mpegurl; codecs="avc1.64001f,mp4a.40.2"',
    };

    function probe({
      nativeHls = false,
      mse = false,
      mseTypes = [],
      playableTypes = [],
    }: {
      nativeHls?: boolean;
      mse?: boolean;
      mseTypes?: string[];
      playableTypes?: string[];
    }): VideoSourceSupportProbe {
      return {
        canPlayType: (type) =>
          (nativeHls && type === "application/vnd.apple.mpegurl") || playableTypes.includes(type)
            ? "probably"
            : "",
        hasMediaSource: mse,
        isMediaSourceTypeSupported: (type) => mseTypes.includes(type),
      };
    }

    it("prefers native HLS over VP9 DASH on iPhone-style browsers", () => {
      expect(
        choosePreferredVideoSource(undefined, [vp9Dash, avcHls], probe({ nativeHls: true }))
      ).toBe(avcHls.src);
    });

    it("skips DASH when MediaSource is not available", () => {
      expect(
        choosePreferredVideoSource(
          undefined,
          [vp9Dash, avcHls],
          probe({ nativeHls: true, mse: false })
        )
      ).toBe(avcHls.src);
    });

    it("falls through from unsupported HEVC HLS to x264 HLS", () => {
      expect(
        choosePreferredVideoSource(
          undefined,
          [vp9Dash, hevcHls, avcHls],
          probe({ nativeHls: true })
        )
      ).toBe(avcHls.src);
    });

    it("keeps DASH first on browsers with MSE support and no native HLS", () => {
      expect(
        choosePreferredVideoSource(
          undefined,
          [vp9Dash, avcHls],
          probe({
            mse: true,
            mseTypes: ['video/webm; codecs="vp09.00.51.08"'],
          })
        )
      ).toBe(vp9Dash.src);
    });

    it("uses src when no sources array is provided", () => {
      expect(choosePreferredVideoSource("work/demo/video.mp4", undefined)).toBe(
        "work/demo/video.mp4"
      );
    });
  });

  describe("getElementVideoVideoStyle", () => {
    it("returns cover style for cover objectFit", () => {
      const style = getElementVideoVideoStyle("cover", "center");
      expect(style.objectFit).toBe("cover");
      expect(style.objectPosition).toBe("center");
      expect(style.width).toBe("100%");
    });
    it("returns fillWidth style for fillWidth", () => {
      const style = getElementVideoVideoStyle("fillWidth");
      expect(style.width).toBe("100%");
      expect(style.height).toBe("auto");
    });
    it("returns fillHeight style for fillHeight", () => {
      const style = getElementVideoVideoStyle("fillHeight");
      expect(style.height).toBe("100%");
      expect(style.width).toBe("auto");
    });
    it("returns cover as default when objectFit undefined", () => {
      const style = getElementVideoVideoStyle(undefined);
      expect(style.objectFit).toBe("cover");
    });
  });

  describe("getElementVideoInnerStyle", () => {
    const base = { display: "flex", width: "100%", height: "100%" };
    it("returns baseStyle when objectFit is cover", () => {
      expect(getElementVideoInnerStyle(base, "cover")).toEqual(base);
    });
    it("adds height auto and alignItems stretch for fillWidth", () => {
      expect(getElementVideoInnerStyle(base, "fillWidth")).toEqual({
        ...base,
        height: "auto",
        alignItems: "stretch",
      });
    });
    it("adds width auto and justifyContent stretch for fillHeight", () => {
      expect(getElementVideoInnerStyle(base, "fillHeight")).toEqual({
        ...base,
        width: "auto",
        justifyContent: "stretch",
      });
    });
    it("uses md value when objectFit is tier map", () => {
      expect(getElementVideoInnerStyle(base, { base: "fillWidth", md: "cover" })).toEqual(base);
    });
  });
});
