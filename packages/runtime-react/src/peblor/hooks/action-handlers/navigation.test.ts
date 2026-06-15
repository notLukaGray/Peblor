import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NAVIGATION_HANDLERS } from "./navigation";
import { resolveAuthoredUrl } from "@pb/runtime-react/core/lib/url-policy";

vi.mock("@pb/runtime-react/core/lib/url-policy", () => ({
  resolveAuthoredUrl: vi.fn(),
}));

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

describe("NAVIGATION_HANDLERS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("back", () => {
    it("calls window.history.back()", () => {
      const spy = vi.spyOn(window.history, "back");
      NAVIGATION_HANDLERS.back!(undefined, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe("navigate", () => {
    it("calls router.push when href is valid and replace is false", () => {
      vi.mocked(resolveAuthoredUrl).mockReturnValue({ ok: true, url: "/about" });
      NAVIGATION_HANDLERS.navigate!({ href: "/about" }, mockCtx as ActionHandlerContext);
      expect(resolveAuthoredUrl).toHaveBeenCalledWith("/about", "internal");
      expect(mockCtx.router.push).toHaveBeenCalledWith("/about");
      expect(mockCtx.router.replace).not.toHaveBeenCalled();
    });

    it("calls router.replace when replace is true", () => {
      vi.mocked(resolveAuthoredUrl).mockReturnValue({ ok: true, url: "/contact" });
      NAVIGATION_HANDLERS.navigate!(
        { href: "/contact", replace: true },
        mockCtx as ActionHandlerContext
      );
      expect(mockCtx.router.replace).toHaveBeenCalledWith("/contact");
      expect(mockCtx.router.push).not.toHaveBeenCalled();
    });

    it("does nothing when resolveAuthoredUrl returns ok: false", () => {
      vi.mocked(resolveAuthoredUrl).mockReturnValue({ ok: false, reason: "blocked" as const });
      NAVIGATION_HANDLERS.navigate!({ href: "/invalid" }, mockCtx as ActionHandlerContext);
      expect(mockCtx.router.push).not.toHaveBeenCalled();
      expect(mockCtx.router.replace).not.toHaveBeenCalled();
    });

    it("does nothing when href is missing", () => {
      NAVIGATION_HANDLERS.navigate!({}, mockCtx as ActionHandlerContext);
      expect(mockCtx.router.push).not.toHaveBeenCalled();
    });

    it("does nothing when payload is undefined", () => {
      NAVIGATION_HANDLERS.navigate!(undefined, mockCtx as ActionHandlerContext);
      expect(mockCtx.router.push).not.toHaveBeenCalled();
    });
  });

  describe("scrollTo", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("scrolls to an element by id using scrollIntoView", () => {
      const el = document.createElement("div");
      el.id = "target";
      document.body.appendChild(el);
      const spy = vi.spyOn(el, "scrollIntoView");
      NAVIGATION_HANDLERS.scrollTo!({ id: "target" }, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    });

    it("does nothing when element id does not exist", () => {
      expect(() => {
        NAVIGATION_HANDLERS.scrollTo!({ id: "nonexistent" }, mockCtx as ActionHandlerContext);
      }).not.toThrow();
    });

    it("scrolls by offset using window.scrollTo when no scrollContainerRef", () => {
      const spy = vi.spyOn(window, "scrollTo");
      NAVIGATION_HANDLERS.scrollTo!(
        { offset: 500, behavior: "auto" },
        mockCtx as ActionHandlerContext
      );
      expect(spy).toHaveBeenCalledWith({ top: 500, behavior: "auto" });
    });

    it("uses smoothScrollTo when scrollContainerRef is provided for element scroll", () => {
      const smoothScrollTo = vi.fn();
      const container = document.createElement("div");
      container.getBoundingClientRect = () =>
        ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 }) as DOMRect;
      container.scrollTop = 100;

      const el = document.createElement("div");
      el.id = "inner";
      el.getBoundingClientRect = () =>
        ({ top: 300, left: 0, right: 100, bottom: 330, width: 100, height: 30 }) as DOMRect;
      document.body.appendChild(el);

      const ctx = {
        ...mockCtx,
        scrollContainerRef: { current: container },
        smoothScrollTo,
      } as unknown as ActionHandlerContext;
      NAVIGATION_HANDLERS.scrollTo!({ id: "inner" }, ctx);
      expect(smoothScrollTo).toHaveBeenCalledWith(expect.any(Number));
    });

    it("uses container scrollTo when scrollContainerRef is provided for offset scroll", () => {
      const container = document.createElement("div");
      const spy = vi.spyOn(container, "scrollTo");

      const ctx = {
        ...mockCtx,
        scrollContainerRef: { current: container },
        smoothScrollTo: null,
      } as unknown as ActionHandlerContext;
      NAVIGATION_HANDLERS.scrollTo!({ offset: 200 }, ctx);
      expect(spy).toHaveBeenCalledWith({ top: 200, behavior: "smooth" });
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        NAVIGATION_HANDLERS.scrollTo!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("scrollLock", () => {
    it("sets body overflow to hidden", () => {
      NAVIGATION_HANDLERS.scrollLock!(undefined, mockCtx as ActionHandlerContext);
      expect(document.body.style.overflow).toBe("hidden");
    });
  });

  describe("scrollUnlock", () => {
    it("clears body overflow", () => {
      document.body.style.overflow = "hidden";
      NAVIGATION_HANDLERS.scrollUnlock!(undefined, mockCtx as ActionHandlerContext);
      expect(document.body.style.overflow).toBe("");
    });
  });
});
