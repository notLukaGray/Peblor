import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ANALYTICS_HANDLERS } from "./analytics";
import { useToastStore } from "@/peblor/section/toast/use-toast-store";

const mockCtx = {
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() },
  variables: {} as Record<string, unknown>,
  scrollContainerRef: null as React.RefObject<HTMLElement | null> | null,
  smoothScrollTo: null,
  fireAction: vi.fn(),
  audioMap: new Map(),
  abortControllers: new Map(),
  debounceTimers: new Map(),
  waitForUnsubscribes: new Set<() => void>(),
} as unknown as ActionHandlerContext;

describe("ANALYTICS_HANDLERS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear toast store between tests
    useToastStore.setState({ toasts: [] });
  });

  describe("trackEvent", () => {
    it("dispatches peblor-track custom event", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      ANALYTICS_HANDLERS.trackEvent!(
        { event: "button_click", properties: { buttonId: "submit" } },
        mockCtx
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "peblor-track",
          detail: { event: "button_click", properties: { buttonId: "submit" } },
        })
      );
    });

    it("calls __analytics_track when available", () => {
      const trackFn = vi.fn();
      (window as unknown as Record<string, unknown>).__analytics_track = trackFn;
      ANALYTICS_HANDLERS.trackEvent!({ event: "signup", properties: { source: "hero" } }, mockCtx);
      expect(trackFn).toHaveBeenCalledWith("signup", {
        pagePath: window.location.pathname,
        source: "hero",
      });
    });

    it("does not throw when __analytics_track is not available", () => {
      delete (window as unknown as Record<string, unknown>).__analytics_track;
      expect(() =>
        ANALYTICS_HANDLERS.trackEvent!({ event: "click", properties: {} }, mockCtx)
      ).not.toThrow();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        ANALYTICS_HANDLERS.trackEvent!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("showToast", () => {
    it("pushes a toast with default variant and duration", () => {
      ANALYTICS_HANDLERS.showToast!({ message: "Hello" }, mockCtx as ActionHandlerContext);
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({
        message: "Hello",
        variant: "info",
        durationMs: 3000,
      });
    });

    it("pushes a toast with custom variant and duration", () => {
      ANALYTICS_HANDLERS.showToast!(
        { message: "Error!", variant: "error", durationMs: 5000 },
        mockCtx
      );
      const toasts = useToastStore.getState().toasts;
      expect(toasts[0]).toMatchObject({
        message: "Error!",
        variant: "error",
        durationMs: 5000,
      });
    });

    it("pushes a success toast", () => {
      ANALYTICS_HANDLERS.showToast!({ message: "Saved!", variant: "success" }, mockCtx);
      const toasts = useToastStore.getState().toasts;
      expect(toasts[0]!.variant).toBe("success");
    });

    it("pushes a warning toast", () => {
      ANALYTICS_HANDLERS.showToast!({ message: "Warning!", variant: "warning" }, mockCtx);
      const toasts = useToastStore.getState().toasts;
      expect(toasts[0]!.variant).toBe("warning");
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        ANALYTICS_HANDLERS.showToast!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });
});
