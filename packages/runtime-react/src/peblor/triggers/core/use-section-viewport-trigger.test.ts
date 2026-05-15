import { describe, it, expect } from "vitest";
import {
  shouldFire,
  normalizeTriggerConfig,
  getEntryProgress,
  type NormalizedTriggerConfig,
  type ViewportTriggerState,
} from "./use-section-viewport-trigger";
import type { ViewportTriggerAction } from "./use-section-viewport-trigger/viewport-trigger-types";

const baseConfig: NormalizedTriggerConfig = {
  onVisible: { type: "contentOverride", payload: { key: "k", value: 0 } },
  onInvisible: { type: "contentOverride", payload: { key: "k", value: 0 } },
  threshold: 0,
  triggerOnce: false,
  delay: 0,
};

const baseState: ViewportTriggerState = {
  lastFiredState: null,
  hasFiredVisibleOnce: false,
  hasFiredInvisibleOnce: false,
};

describe("use-section-viewport-trigger", () => {
  describe("normalizeTriggerConfig", () => {
    it("applies defaults", () => {
      const config = normalizeTriggerConfig({
        onVisible: { type: "contentOverride", payload: { key: "x", value: 0 } },
      });
      expect(config.threshold).toBe(0);
      expect(config.triggerOnce).toBe(false);
      expect(config.delay).toBe(0);
    });
  });

  describe("getEntryProgress", () => {
    it("returns intersectionRatio from entry", () => {
      const entry = {
        isIntersecting: true,
        intersectionRatio: 0.75,
      } as IntersectionObserverEntry;
      expect(getEntryProgress(entry)).toBe(0.75);
    });
  });

  describe("shouldFire", () => {
    it("fires visible when entering and onVisible is set", () => {
      const entry = { isIntersecting: true };
      const onVisible: ViewportTriggerAction = {
        type: "contentOverride",
        payload: { key: "x", value: 0 },
      };
      const config: NormalizedTriggerConfig = {
        ...baseConfig,
        onVisible,
        onInvisible: undefined,
      };
      const result = shouldFire(entry, config, baseState);
      expect(result.fireVisible).toBe(true);
      expect(result.fireInvisible).toBe(false);
    });

    it("fires invisible when leaving and onInvisible is set", () => {
      const entry = { isIntersecting: false };
      const onInvisible: ViewportTriggerAction = {
        type: "contentOverride",
        payload: { key: "x", value: 0 },
      };
      const config: NormalizedTriggerConfig = {
        ...baseConfig,
        onVisible: undefined,
        onInvisible,
      };
      const result = shouldFire(entry, config, baseState);
      expect(result.fireVisible).toBe(false);
      expect(result.fireInvisible).toBe(true);
    });

    it("does not fire when state has not changed", () => {
      const entry = { isIntersecting: true };
      const state = { ...baseState, lastFiredState: true };
      const result = shouldFire(entry, baseConfig, state);
      expect(result.fireVisible).toBe(false);
      expect(result.fireInvisible).toBe(false);
    });

    it("does not fire visible repeatedly when triggerOnce and has already fired", () => {
      const entry = { isIntersecting: true };
      const config = { ...baseConfig, triggerOnce: true };
      const state = { ...baseState, hasFiredVisibleOnce: true, lastFiredState: false };
      const result = shouldFire(entry, config, state);
      expect(result.fireVisible).toBe(false);
    });

    it("fires visible when triggerOnce but not yet fired", () => {
      const entry = { isIntersecting: true };
      const config = { ...baseConfig, triggerOnce: true };
      const result = shouldFire(entry, config, baseState);
      expect(result.fireVisible).toBe(true);
    });

    it("does not fire invisible repeatedly when triggerOnce and has already fired", () => {
      const entry = { isIntersecting: false };
      const config = { ...baseConfig, triggerOnce: true };
      const state = { ...baseState, hasFiredInvisibleOnce: true, lastFiredState: true };
      const result = shouldFire(entry, config, state);
      expect(result.fireInvisible).toBe(false);
    });

    it("respects enter/leave: fires visible when transitioning from invisible", () => {
      const entry = { isIntersecting: true };
      const state = { ...baseState, lastFiredState: false };
      const result = shouldFire(entry, baseConfig, state);
      expect(result.fireVisible).toBe(true);
      expect(result.fireInvisible).toBe(false);
    });

    it("respects enter/leave: fires invisible when transitioning from visible", () => {
      const entry = { isIntersecting: false };
      const state = { ...baseState, lastFiredState: true };
      const result = shouldFire(entry, baseConfig, state);
      expect(result.fireVisible).toBe(false);
      expect(result.fireInvisible).toBe(true);
    });

    it("returns false when no handlers", () => {
      const config = { ...baseConfig, onVisible: undefined, onInvisible: undefined };
      expect(shouldFire({ isIntersecting: true }, config, baseState)).toEqual({
        fireVisible: false,
        fireInvisible: false,
      });
    });
  });
});
