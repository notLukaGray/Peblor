import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MEDIA_HANDLERS } from "./media";

const mockCtx = {
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() },
  variables: {} as Record<string, unknown>,
  scrollContainerRef: null as React.RefObject<HTMLElement | null> | null,
  smoothScrollTo: null,
  fireAction: vi.fn(),
  audioMap: new Map<string, HTMLAudioElement>(),
  abortControllers: new Map(),
  debounceTimers: new Map(),
  waitForUnsubscribes: new Set<() => void>(),
} as unknown as ActionHandlerContext;

describe("MEDIA_HANDLERS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    mockCtx.audioMap.clear();
  });

  describe("playSound", () => {
    it("creates a new Audio element and plays it", () => {
      const playedSrcs: string[] = [];
      class MockAudio {
        volume: number = 0;
        loop: boolean = false;
        currentTime: number = 0;
        constructor(public src: string) {
          // Audio constructor is side-effectful in happy-dom, noop
        }
        play() {
          playedSrcs.push(this.src);
          return Promise.resolve();
        }
        pause() {}
      }
      vi.stubGlobal("Audio", MockAudio);

      MEDIA_HANDLERS.playSound!(
        { src: "/sounds/beep.mp3", volume: 0.5 },
        mockCtx as ActionHandlerContext
      );

      const instance = mockCtx.audioMap.get("/sounds/beep.mp3") as MockAudio;
      expect(instance).toBeDefined();
      expect(instance.volume).toBe(0.5);
    });

    it("reuses an existing Audio element from audioMap", () => {
      const existingPlay = vi.fn().mockResolvedValue(undefined);
      const existingAudio = {
        play: existingPlay,
        pause: vi.fn(),
        volume: 0.8,
        loop: false,
        currentTime: 0.5,
      } as unknown as HTMLAudioElement;

      const MockAudio = vi.fn();
      vi.stubGlobal("Audio", MockAudio);
      mockCtx.audioMap.set("/sounds/loop.mp3", existingAudio);

      MEDIA_HANDLERS.playSound!(
        { src: "/sounds/loop.mp3", volume: 0.9, loop: true },
        mockCtx as ActionHandlerContext
      );

      expect(MockAudio).not.toHaveBeenCalled();
      expect(existingAudio.volume).toBe(0.9);
      expect(existingAudio.loop).toBe(true);
      expect(existingAudio.currentTime).toBe(0);
      expect(existingPlay).toHaveBeenCalled();
    });

    it("clamps volume between 0 and 1", () => {
      const instances: Array<{ volume: number }> = [];
      class MockAudio {
        volume: number = 0;
        loop: boolean = false;
        currentTime: number = 0;
        constructor(public src: string) {
          instances.push(this as { volume: number });
        }
        play() {
          return Promise.resolve();
        }
        pause() {}
      }
      vi.stubGlobal("Audio", MockAudio);

      MEDIA_HANDLERS.playSound!(
        { src: "/sounds/loud.mp3", volume: 2.5 },
        mockCtx as ActionHandlerContext
      );
      expect(instances[0]?.volume).toBe(1);
    });

    it("warns when src is null", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      MEDIA_HANDLERS.playSound!({ src: null } as never, mockCtx as ActionHandlerContext);
      expect(warnSpy).toHaveBeenCalledWith("[peblor] playSound called without a src");
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MEDIA_HANDLERS.playSound!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("stopSound", () => {
    it("stops a specific sound by src", () => {
      const pauseSpy = vi.fn();
      const audio = {
        pause: pauseSpy,
        currentTime: 0.5,
      } as unknown as HTMLAudioElement;
      mockCtx.audioMap.set("/sounds/beep.mp3", audio);

      MEDIA_HANDLERS.stopSound!({ src: "/sounds/beep.mp3" }, mockCtx as ActionHandlerContext);
      expect(pauseSpy).toHaveBeenCalled();
      expect(audio.currentTime).toBe(0);
    });

    it("stops all sounds when src is not provided", () => {
      const pause1 = vi.fn();
      const pause2 = vi.fn();
      mockCtx.audioMap.set("/sounds/a.mp3", {
        pause: pause1,
        currentTime: 0.5,
      } as unknown as HTMLAudioElement);
      mockCtx.audioMap.set("/sounds/b.mp3", {
        pause: pause2,
        currentTime: 0.3,
      } as unknown as HTMLAudioElement);

      MEDIA_HANDLERS.stopSound!({}, mockCtx as ActionHandlerContext);
      expect(pause1).toHaveBeenCalled();
      expect(pause2).toHaveBeenCalled();
    });

    it("does nothing when specific src is not in map", () => {
      expect(() =>
        MEDIA_HANDLERS.stopSound!(
          { src: "/sounds/nonexistent.mp3" },
          mockCtx as ActionHandlerContext
        )
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MEDIA_HANDLERS.stopSound!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("setVolume", () => {
    it("sets volume on all audio when id is not provided", () => {
      const audio1 = { volume: 0.5 } as unknown as HTMLAudioElement;
      const audio2 = { volume: 0.5 } as unknown as HTMLAudioElement;
      mockCtx.audioMap.set("/sounds/a.mp3", audio1);
      mockCtx.audioMap.set("/sounds/b.mp3", audio2);

      MEDIA_HANDLERS.setVolume!({ volume: 0.3 }, mockCtx as ActionHandlerContext);
      expect(audio1.volume).toBe(0.3);
      expect(audio2.volume).toBe(0.3);
    });

    it("sets volume on a specific media element by id", () => {
      const video = document.createElement("video");
      video.id = "myVideo";
      video.volume = 1;
      document.body.appendChild(video);

      MEDIA_HANDLERS.setVolume!({ volume: 0.5, id: "myVideo" }, mockCtx as ActionHandlerContext);
      expect(video.volume).toBe(0.5);
    });

    it("clamps volume between 0 and 1", () => {
      const audio = { volume: 0.5 } as unknown as HTMLAudioElement;
      mockCtx.audioMap.set("/sounds/a.mp3", audio);

      MEDIA_HANDLERS.setVolume!({ volume: -0.5 }, mockCtx as ActionHandlerContext);
      expect(audio.volume).toBe(0);

      MEDIA_HANDLERS.setVolume!({ volume: 1.5 }, mockCtx as ActionHandlerContext);
      expect(audio.volume).toBe(1);
    });

    it("does nothing when element id does not exist", () => {
      expect(() =>
        MEDIA_HANDLERS.setVolume!(
          { volume: 0.5, id: "nonexistent" },
          mockCtx as ActionHandlerContext
        )
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MEDIA_HANDLERS.setVolume!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("elementPlay", () => {
    it("calls play on a media element by id", () => {
      const video = document.createElement("video");
      video.id = "myVideo";
      document.body.appendChild(video);
      const playSpy = vi.spyOn(video, "play").mockResolvedValue();

      MEDIA_HANDLERS.elementPlay!({ id: "myVideo" }, mockCtx as ActionHandlerContext);
      expect(playSpy).toHaveBeenCalled();
    });

    it("does nothing when id is null", () => {
      const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue();
      MEDIA_HANDLERS.elementPlay!({ id: null } as never, mockCtx as ActionHandlerContext);
      expect(playSpy).not.toHaveBeenCalled();
    });

    it("does nothing when element does not exist", () => {
      expect(() =>
        MEDIA_HANDLERS.elementPlay!({ id: "nonexistent" }, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MEDIA_HANDLERS.elementPlay!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("elementPause", () => {
    it("calls pause on a media element by id", () => {
      const video = document.createElement("video");
      video.id = "myVideo";
      document.body.appendChild(video);
      const pauseSpy = vi.spyOn(video, "pause");

      MEDIA_HANDLERS.elementPause!({ id: "myVideo" }, mockCtx as ActionHandlerContext);
      expect(pauseSpy).toHaveBeenCalled();
    });

    it("does nothing when id is null", () => {
      const pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, "pause");
      MEDIA_HANDLERS.elementPause!({ id: null } as never, mockCtx as ActionHandlerContext);
      expect(pauseSpy).not.toHaveBeenCalled();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MEDIA_HANDLERS.elementPause!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("elementSeek", () => {
    it("sets currentTime on a media element", () => {
      const video = document.createElement("video");
      video.id = "myVideo";
      video.currentTime = 0;
      document.body.appendChild(video);

      MEDIA_HANDLERS.elementSeek!({ id: "myVideo", time: 30 }, mockCtx as ActionHandlerContext);
      expect(video.currentTime).toBe(30);
    });

    it("sets currentTime to 0 when time is not provided", () => {
      const video = document.createElement("video");
      video.id = "myVideo";
      video.currentTime = 50;
      document.body.appendChild(video);

      MEDIA_HANDLERS.elementSeek!({ id: "myVideo" }, mockCtx as ActionHandlerContext);
      expect(video.currentTime).toBe(0);
    });

    it("does nothing when id is null", () => {
      expect(() =>
        MEDIA_HANDLERS.elementSeek!({ id: null } as never, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MEDIA_HANDLERS.elementSeek!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("no-op section actions", () => {
    it.each([
      "backgroundSwitch",
      "contentOverride",
      "startTransition",
      "stopTransition",
      "updateTransitionProgress",
    ] as const)("%s is a no-op", (handlerName) => {
      expect(() =>
        (MEDIA_HANDLERS[handlerName] as (p: unknown, ctx: unknown) => void)(
          {},
          mockCtx as ActionHandlerContext
        )
      ).not.toThrow();
    });
  });
});
