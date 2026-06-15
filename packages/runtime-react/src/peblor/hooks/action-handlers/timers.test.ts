import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TIMER_HANDLERS } from "./timers";
import { cancelNamedTimer } from "@/peblor/triggers/core/use-timer-trigger";
import { firePeblorAction } from "@/peblor/triggers/core/trigger-event";

vi.mock("@/peblor/triggers/core/use-timer-trigger", () => ({
  cancelNamedTimer: vi.fn(),
}));

vi.mock("@/peblor/triggers/core/trigger-event", () => ({
  firePeblorAction: vi.fn(),
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

describe("TIMER_HANDLERS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cancelTimer", () => {
    it("calls cancelNamedTimer with the provided id", () => {
      TIMER_HANDLERS.cancelTimer!({ id: "my-timer" }, mockCtx as ActionHandlerContext);
      expect(cancelNamedTimer).toHaveBeenCalledWith("my-timer");
    });

    it("calls cancelNamedTimer with undefined when id is missing", () => {
      TIMER_HANDLERS.cancelTimer!({}, mockCtx as ActionHandlerContext);
      expect(cancelNamedTimer).toHaveBeenCalledWith(undefined);
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        TIMER_HANDLERS.cancelTimer!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("repeatAction", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("fires action count times immediately when delayMs is 0", () => {
      const action = {
        type: "setVariable" as const,
        payload: { key: "x", value: 1 },
      } as unknown as ActionHandlerContext;
      TIMER_HANDLERS.repeatAction!({ count: 3, action, delayMs: 0 }, mockCtx);
      expect(firePeblorAction).toHaveBeenCalledTimes(3);
      expect(firePeblorAction).toHaveBeenCalledWith(action, "system");
    });

    it("fires action count times immediately when delayMs is omitted", () => {
      const action = {
        type: "setVariable" as const,
        payload: { key: "x", value: 1 },
      } as unknown as ActionHandlerContext;
      TIMER_HANDLERS.repeatAction!({ count: 2, action }, mockCtx as ActionHandlerContext);
      expect(firePeblorAction).toHaveBeenCalledTimes(2);
    });

    it("fires action with delay between each call when delayMs > 0", () => {
      const action = {
        type: "setVariable" as const,
        payload: { key: "x", value: 1 },
      } as unknown as ActionHandlerContext;
      TIMER_HANDLERS.repeatAction!(
        { count: 3, action, delayMs: 100 },
        mockCtx as ActionHandlerContext
      );
      // First fire happens immediately (i=0)
      expect(firePeblorAction).toHaveBeenCalledTimes(1);
      // Advance past first delay
      vi.advanceTimersByTime(100);
      expect(firePeblorAction).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(100);
      expect(firePeblorAction).toHaveBeenCalledTimes(3);
    });

    it("does nothing when count is 0", () => {
      TIMER_HANDLERS.repeatAction!(
        { count: 0, action: { type: "setVariable" as const, payload: { key: "x", value: 1 } } },
        mockCtx
      );
      expect(firePeblorAction).not.toHaveBeenCalled();
    });

    it("does nothing when count is undefined", () => {
      TIMER_HANDLERS.repeatAction!(
        { action: { type: "setVariable" as const, payload: { key: "x", value: 1 } } },
        mockCtx
      );
      expect(firePeblorAction).not.toHaveBeenCalled();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        TIMER_HANDLERS.repeatAction!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });
});
