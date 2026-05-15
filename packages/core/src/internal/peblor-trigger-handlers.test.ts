import { describe, it, expect } from "vitest";
import { createTriggerHandlers } from "./peblor-trigger-handlers";
import {
  getTransitionId,
  isBgTransitionProgressOverride,
  computeBgProgressOverrides,
} from "./peblor-trigger-handlers";
import { OVERRIDE_KEY_BG } from "@pb/contracts/peblor/core/peblor-schemas";

describe("peblor-trigger-handlers", () => {
  describe("getTransitionId", () => {
    it("returns payload.id when payload is object with id", () => {
      expect(getTransitionId({ type: "startTransition", payload: { id: "t3" } })).toBe("t3");
    });
    it("returns undefined when payload has no id", () => {
      expect(getTransitionId({ type: "startTransition", payload: { id: "" } })).toBeUndefined();
    });
    it("returns undefined when payload is missing", () => {
      expect(getTransitionId({ type: "stopTransition", payload: { id: "" } })).toBeUndefined();
    });
    it("returns undefined when id is empty string", () => {
      expect(getTransitionId({ type: "stopTransition", payload: { id: "" } })).toBeUndefined();
    });
  });

  describe("isBgTransitionProgressOverride", () => {
    it("returns true when progress and payload is bg override with backgroundTransition value", () => {
      expect(
        isBgTransitionProgressOverride(
          {
            type: "contentOverride",
            payload: {
              key: OVERRIDE_KEY_BG,
              value: { type: "backgroundTransition", from: {}, to: {} },
            },
          },
          0.5
        )
      ).toBe(true);
    });
    it("returns false when progress is null", () => {
      expect(
        isBgTransitionProgressOverride(
          {
            type: "contentOverride",
            payload: { key: OVERRIDE_KEY_BG, value: { type: "backgroundTransition" } },
          },
          null
        )
      ).toBe(false);
    });
    it("returns false when key is not OVERRIDE_KEY_BG", () => {
      expect(
        isBgTransitionProgressOverride(
          {
            type: "contentOverride",
            payload: { key: "other", value: { type: "backgroundTransition" } },
          },
          0.5
        )
      ).toBe(false);
    });
    it("returns false when value.type is not backgroundTransition", () => {
      expect(
        isBgTransitionProgressOverride(
          {
            type: "contentOverride",
            payload: { key: OVERRIDE_KEY_BG, value: { type: "backgroundVariable" } },
          },
          0.5
        )
      ).toBe(false);
    });
  });

  describe("computeBgProgressOverrides", () => {
    const resolvedBg = {
      type: "backgroundTransition" as const,
      from: { type: "backgroundVariable" as const, layers: [] },
      to: { type: "backgroundVariable" as const, layers: [] },
    };

    it("returns null when baseBg is not backgroundTransition", () => {
      expect(
        computeBgProgressOverrides({}, { type: "backgroundVariable", layers: [] }, 0.5)
      ).toBeNull();
    });
    it("returns next overrides with progress when baseBg is backgroundTransition", () => {
      const prev = {};
      const next = computeBgProgressOverrides(prev, resolvedBg, 0.5);
      expect(next).not.toBeNull();
      expect(next![OVERRIDE_KEY_BG]).toMatchObject({ type: "backgroundTransition", progress: 0.5 });
    });
    it("returns null when progress unchanged", () => {
      const prev = { [OVERRIDE_KEY_BG]: { ...resolvedBg, progress: 0.5 } };
      expect(computeBgProgressOverrides(prev, resolvedBg, 0.5)).toBeNull();
    });
  });

  describe("createTriggerHandlers", () => {
    function makeContext() {
      let overridesState: Record<string, unknown> = {};
      let activeIdsState = new Set<string>();
      let reversingIdsState = new Set<string>();
      let transitionProgressState = new Map<string, number>();
      const starts: Array<{ id: string; forward: boolean }> = [];
      const updates: Array<{ id: string; progress: number }> = [];

      const ctx = {
        setOverrides: (update: unknown) => {
          if (typeof update === "function") {
            overridesState = (update as (prev: Record<string, unknown>) => Record<string, unknown>)(
              overridesState
            );
          } else {
            overridesState = update as Record<string, unknown>;
          }
        },
        setActiveTransitionIds: (update: unknown) => {
          if (typeof update === "function") {
            activeIdsState = (update as (prev: Set<string>) => Set<string>)(activeIdsState);
          } else {
            activeIdsState = update as Set<string>;
          }
        },
        setReversingTransitionIds: (update: unknown) => {
          if (typeof update === "function") {
            reversingIdsState = (update as (prev: Set<string>) => Set<string>)(reversingIdsState);
          } else {
            reversingIdsState = update as Set<string>;
          }
        },
        setTransitionProgress: (update: unknown) => {
          if (typeof update === "function") {
            transitionProgressState = (
              update as (prev: Map<string, number>) => Map<string, number>
            )(transitionProgressState);
          } else {
            transitionProgressState = update as Map<string, number>;
          }
        },
        resolvedBg: {
          type: "backgroundTransition",
          from: { type: "backgroundVariable", layers: [] },
          to: { type: "backgroundVariable", layers: [] },
        },
        bgDefinitions: {
          card: { type: "backgroundImage", image: "work/card.jpg" },
        },
        transitionsArray: [{ type: "TRIGGER", id: "t1", from: "a", to: "b" }],
        lastProgressRef: { current: null as number | null },
        lastTriggerTimeRef: { current: new Map<string, number>() },
        dispatchStart: (id: string, forward: boolean) => starts.push({ id, forward }),
        dispatchUpdateProgress: (id: string, progress: number) => updates.push({ id, progress }),
      };

      return {
        ctx,
        getState: () => ({
          overridesState,
          activeIdsState,
          reversingIdsState,
          transitionProgressState,
          starts,
          updates,
        }),
      };
    }

    it("routes backgroundSwitch action by key into overrides", () => {
      const { ctx, getState } = makeContext();
      const handlers = createTriggerHandlers(ctx as never);
      expect(handlers.backgroundSwitch).toBeTypeOf("function");
      handlers.backgroundSwitch!({ type: "backgroundSwitch", payload: "card" } as never, null);
      expect(getState().overridesState[OVERRIDE_KEY_BG]).toMatchObject({
        type: "backgroundImage",
      });
    });

    it("routes updateTransitionProgress and clamps + inverts values", () => {
      const { ctx, getState } = makeContext();
      const handlers = createTriggerHandlers(ctx as never);
      expect(handlers.updateTransitionProgress).toBeTypeOf("function");
      handlers.updateTransitionProgress!(
        {
          type: "updateTransitionProgress",
          payload: { id: "t1", progress: 1.4, invert: true },
        } as never,
        null
      );
      expect(getState().transitionProgressState.get("t1")).toBe(0);
      expect(getState().updates).toEqual([{ id: "t1", progress: 0 }]);
    });

    it("starts transition for valid startTransition action", () => {
      const { ctx, getState } = makeContext();
      const handlers = createTriggerHandlers(ctx as never);
      expect(handlers.startTransition).toBeTypeOf("function");
      handlers.startTransition!({ type: "startTransition", payload: { id: "t1" } } as never, null);
      expect(getState().activeIdsState.has("t1")).toBe(true);
      expect(getState().starts).toEqual([{ id: "t1", forward: true }]);
    });
  });
});
