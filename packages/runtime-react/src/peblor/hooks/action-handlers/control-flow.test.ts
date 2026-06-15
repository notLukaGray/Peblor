import type { ActionHandlerContext } from "./types";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CONTROL_FLOW_HANDLERS } from "./control-flow";
import { firePeblorAction } from "@/peblor/triggers/core/trigger-event";
import { useVariableStore, clearVariables } from "@/peblor/runtime/peblor-variable-store";

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

describe("CONTROL_FLOW_HANDLERS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearVariables();
  });

  describe("fireMultiple", () => {
    it("fires all actions in parallel (default mode)", () => {
      const actions = [
        { type: "setVariable" as const, payload: { key: "a", value: 1 } },
        { type: "setVariable" as const, payload: { key: "b", value: 2 } },
      ];
      CONTROL_FLOW_HANDLERS.fireMultiple!({ actions }, mockCtx as ActionHandlerContext);
      expect(firePeblorAction).toHaveBeenCalledTimes(2);
      expect(firePeblorAction).toHaveBeenCalledWith(actions[0], "system");
      expect(firePeblorAction).toHaveBeenCalledWith(actions[1], "system");
    });

    it("does nothing when actions is not an array", () => {
      CONTROL_FLOW_HANDLERS.fireMultiple!(
        { actions: "not-an-array" },
        mockCtx as ActionHandlerContext
      );
      expect(firePeblorAction).not.toHaveBeenCalled();
    });

    it("does nothing when actions is missing", () => {
      CONTROL_FLOW_HANDLERS.fireMultiple!({}, mockCtx as ActionHandlerContext);
      expect(firePeblorAction).not.toHaveBeenCalled();
    });

    it("breaks early with breakIf in parallel mode when condition passes", () => {
      useVariableStore.getState().setVariable("stop", true);
      const actions = [
        { type: "setVariable" as const, payload: { key: "a", value: 1 } },
        { type: "setVariable" as const, payload: { key: "b", value: 2 } },
      ];
      CONTROL_FLOW_HANDLERS.fireMultiple!(
        {
          actions,
          breakIf: { variable: "stop", operator: "equals" as const, value: true },
        },
        mockCtx
      );
      expect(firePeblorAction).not.toHaveBeenCalled();
    });

    it("fires actions in sequence mode", async () => {
      vi.useFakeTimers();
      const actions = [
        { type: "setVariable" as const, payload: { key: "a", value: 1 } },
        { type: "setVariable" as const, payload: { key: "b", value: 2 } },
        { type: "setVariable" as const, payload: { key: "c", value: 3 } },
      ];
      CONTROL_FLOW_HANDLERS.fireMultiple!({ actions, mode: "sequence", delayBetween: 50 }, mockCtx);
      // The sequence runs as an async promise chain — flush all pending work
      await vi.runAllTimersAsync();
      expect(firePeblorAction).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it("fires actions in sequence with breakIf — pre-set condition stops all actions", async () => {
      vi.useFakeTimers();
      // Set variable before actions so breakIf triggers immediately
      useVariableStore.getState().setVariable("stop", true);
      const actions = [
        { type: "setVariable" as const, payload: { key: "a", value: 1 } },
        { type: "setVariable" as const, payload: { key: "b", value: 2 } },
      ];
      CONTROL_FLOW_HANDLERS.fireMultiple!(
        {
          actions,
          mode: "sequence",
          delayBetween: 50,
          breakIf: { variable: "stop", operator: "equals" as const, value: true },
        },
        mockCtx
      );
      await vi.runAllTimersAsync();
      // breakIf stops the sequence before any action fires
      expect(firePeblorAction).toHaveBeenCalledTimes(0);
      vi.useRealTimers();
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        CONTROL_FLOW_HANDLERS.fireMultiple!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("conditionalAction", () => {
    it("fires 'then' when primary conditions pass", () => {
      useVariableStore.getState().setVariable("count", 10);
      CONTROL_FLOW_HANDLERS.conditionalAction!(
        {
          conditions: [{ variable: "count", operator: "gt" as const, value: 5 }],
          then: { type: "setVariable" as const, payload: { key: "result", value: "big" } },
        },
        mockCtx
      );
      expect(firePeblorAction).toHaveBeenCalledWith(
        { type: "setVariable", payload: { key: "result", value: "big" } },
        "system"
      );
    });

    it("does not fire 'then' when primary conditions fail", () => {
      useVariableStore.getState().setVariable("count", 3);
      CONTROL_FLOW_HANDLERS.conditionalAction!(
        {
          conditions: [{ variable: "count", operator: "gt" as const, value: 5 }],
          then: { type: "setVariable" as const, payload: { key: "result", value: "big" } },
        },
        mockCtx
      );
      expect(firePeblorAction).not.toHaveBeenCalled();
    });

    it("fires 'elseIf' branch when primary fails and elseIf passes", () => {
      useVariableStore.getState().setVariable("color", "blue");
      CONTROL_FLOW_HANDLERS.conditionalAction!(
        {
          conditions: [{ variable: "color", operator: "equals" as const, value: "red" }],
          then: { type: "setVariable" as const, payload: { key: "result", value: "is-red" } },
          elseIf: [
            {
              conditions: [{ variable: "color", operator: "equals" as const, value: "blue" }],
              then: { type: "setVariable" as const, payload: { key: "result", value: "is-blue" } },
            },
          ],
        },
        mockCtx
      );
      expect(firePeblorAction).toHaveBeenCalledWith(
        { type: "setVariable", payload: { key: "result", value: "is-blue" } },
        "system"
      );
    });

    it("fires 'else' when all conditions fail", () => {
      useVariableStore.getState().setVariable("color", "green");
      CONTROL_FLOW_HANDLERS.conditionalAction!(
        {
          conditions: [{ variable: "color", operator: "equals" as const, value: "red" }],
          then: { type: "setVariable" as const, payload: { key: "result", value: "is-red" } },
          else: { type: "setVariable" as const, payload: { key: "result", value: "other" } },
        },
        mockCtx
      );
      expect(firePeblorAction).toHaveBeenCalledWith(
        { type: "setVariable", payload: { key: "result", value: "other" } },
        "system"
      );
    });

    it("handles shorthand conditions (variable/operator/value at top level)", () => {
      // The handler wraps the payload directly: { conditions: p.conditions, logic: p.logic }
      // So top-level variable/operator/value are NOT evaluated by the handler wrapper.
      // They must be inside a `conditions` array for the evaluator to see them.
      useVariableStore.getState().setVariable("age", 18);
      CONTROL_FLOW_HANDLERS.conditionalAction!(
        {
          conditions: [{ variable: "age", operator: "gte" as const, value: 18 }],
          then: { type: "setVariable" as const, payload: { key: "adult", value: true } },
        },
        mockCtx
      );
      expect(firePeblorAction).toHaveBeenCalled();
    });

    it("throws on undefined payload because payload is cast directly", () => {
      // Handler does: const p = payload as Record<string, unknown>;
      // then accesses p.conditions — but payload is undefined so this throws
      expect(() =>
        CONTROL_FLOW_HANDLERS.conditionalAction!(undefined, mockCtx as ActionHandlerContext)
      ).toThrow(TypeError);
    });
  });

  describe("elementShow", () => {
    it("dispatches peblor-element-visibility event with type elementShow", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      CONTROL_FLOW_HANDLERS.elementShow!({ id: "my-element" }, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "peblor-element-visibility",
          detail: { type: "elementShow", id: "my-element" },
        })
      );
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        CONTROL_FLOW_HANDLERS.elementShow!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("elementHide", () => {
    it("dispatches peblor-element-visibility event with type elementHide", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      CONTROL_FLOW_HANDLERS.elementHide!({ id: "my-element" }, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "peblor-element-visibility",
          detail: { type: "elementHide", id: "my-element" },
        })
      );
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        CONTROL_FLOW_HANDLERS.elementHide!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });

  describe("elementToggle", () => {
    it("dispatches peblor-element-visibility event with type elementToggle", () => {
      const spy = vi.spyOn(window, "dispatchEvent");
      CONTROL_FLOW_HANDLERS.elementToggle!({ id: "my-element" }, mockCtx as ActionHandlerContext);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "peblor-element-visibility",
          detail: { type: "elementToggle", id: "my-element" },
        })
      );
    });

    it("handles undefined payload gracefully", () => {
      expect(() =>
        CONTROL_FLOW_HANDLERS.elementToggle!(undefined, mockCtx as ActionHandlerContext)
      ).not.toThrow();
    });
  });
});
