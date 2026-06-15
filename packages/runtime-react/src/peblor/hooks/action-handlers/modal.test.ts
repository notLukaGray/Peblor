import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MODAL_HANDLERS } from "./modal";

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

describe("MODAL_HANDLERS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("modalOpen", () => {
    it("dispatches peblor-modal event with type modalOpen", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      MODAL_HANDLERS.modalOpen!({ id: "my-modal" }, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "peblor-modal",
          detail: { type: "modalOpen", id: "my-modal" },
        })
      );
    });

    it("dispatches event with undefined id when not provided", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      MODAL_HANDLERS.modalOpen!({}, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { type: "modalOpen", id: undefined },
        })
      );
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MODAL_HANDLERS.modalOpen!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("modalClose", () => {
    it("dispatches peblor-modal event with type modalClose", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      MODAL_HANDLERS.modalClose!({ id: "my-modal" }, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "peblor-modal",
          detail: { type: "modalClose", id: "my-modal" },
        })
      );
    });

    it("dispatches event with undefined id when not provided", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      MODAL_HANDLERS.modalClose!({}, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { type: "modalClose", id: undefined },
        })
      );
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MODAL_HANDLERS.modalClose!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("modalToggle", () => {
    it("dispatches peblor-modal event with type modalToggle", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      MODAL_HANDLERS.modalToggle!({ id: "my-modal" }, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "peblor-modal",
          detail: { type: "modalToggle", id: "my-modal" },
        })
      );
    });

    it("dispatches event with undefined id when not provided", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      MODAL_HANDLERS.modalToggle!({}, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { type: "modalToggle", id: undefined },
        })
      );
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        MODAL_HANDLERS.modalToggle!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });
});
