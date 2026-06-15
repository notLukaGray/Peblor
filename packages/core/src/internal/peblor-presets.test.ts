import { describe, it, expect } from "vitest";
import type { PeblorDefinitionBlock } from "@pb/contracts/types";
import { elementBlockSchema } from "@pb/contracts/peblor/core/peblor-schemas";
import {
  resolvePresets,
  isPresetRef,
  resolvePresetRef,
  mergePresetIntoBlock,
} from "./peblor-presets";

function elementVectorPreset(overrides: Record<string, unknown> = {}) {
  return elementBlockSchema.parse({
    type: "elementVector",
    viewBox: "0 0 10 10",
    shapes: [],
    ...overrides,
  });
}

describe("peblor-presets", () => {
  describe("isPresetRef", () => {
    it("returns true for block with string preset", () => {
      expect(isPresetRef({ preset: "foo" })).toBe(true);
      expect(isPresetRef({ preset: "bar", type: "element" })).toBe(true);
    });
    it("returns false for block without preset", () => {
      expect(isPresetRef({ type: "element" })).toBe(false);
      expect(isPresetRef({})).toBe(false);
    });
    it("returns false for non-object or null", () => {
      expect(isPresetRef(null)).toBe(false);
      expect(isPresetRef(undefined)).toBe(false);
      expect(isPresetRef("string")).toBe(false);
      expect(isPresetRef(42)).toBe(false);
    });
    it("returns false when preset is not a string", () => {
      expect(isPresetRef({ preset: 123 })).toBe(false);
      expect(isPresetRef({ preset: {} })).toBe(false);
    });
  });

  describe("resolvePresetRef", () => {
    it("returns preset when found", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {
        foo: elementVectorPreset(),
      };
      expect(resolvePresetRef("foo", presets)).toMatchObject({
        type: "elementVector",
        viewBox: "0 0 10 10",
        shapes: [],
      });
    });
    it("returns null when not found", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {};
      expect(resolvePresetRef("missing", presets)).toBe(null);
    });
    it("returns null when preset value is not an object", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {
        bad: "string" as unknown as PeblorDefinitionBlock,
      };
      expect(resolvePresetRef("bad", presets)).toBe(null);
    });
  });

  describe("mergePresetIntoBlock", () => {
    it("deep-merges elementGroup section definitions from preset and local", () => {
      const preset = {
        type: "elementGroup",
        section: {
          elementOrder: ["model-canvas", "animation-controls"],
          definitions: {
            "model-canvas": { type: "elementModel3D", id: "model-3d-anim" },
            "animation-controls": { type: "elementGroup", id: "controls" },
          },
        },
      } as unknown as PeblorDefinitionBlock;
      const base = {
        preset: "player-3d-surface-animation",
        section: {
          definitions: {
            "crossfade-controls": { type: "elementGroup", id: "crossfade" },
          },
        },
      };
      const merged = mergePresetIntoBlock(base, preset) as Record<string, unknown>;
      const section = merged.section as {
        elementOrder: string[];
        definitions: Record<string, unknown>;
      };
      expect(section.elementOrder).toEqual(["model-canvas", "animation-controls"]);
      expect(section.definitions["model-canvas"]).toBeDefined();
      expect(section.definitions["animation-controls"]).toBeDefined();
      expect(section.definitions["crossfade-controls"]).toBeDefined();
    });

    it("merges preset with local props, local overrides preset", () => {
      const preset = elementVectorPreset({ width: "10px" });
      const base = { preset: "foo", width: "20px", height: "15px" };
      const merged = mergePresetIntoBlock(base, preset);
      expect(merged).toMatchObject({
        type: "elementVector",
        viewBox: "0 0 10 10",
        width: "20px",
        height: "15px",
      });
      expect(merged).not.toHaveProperty("preset");
    });
    it("strips preset key from base", () => {
      const preset = { type: "section" } as unknown as PeblorDefinitionBlock;
      const base = { preset: "ref", extra: true };
      const merged = mergePresetIntoBlock(base, preset);
      expect(merged).not.toHaveProperty("preset");
      expect(merged).toHaveProperty("extra", true);
    });
  });

  describe("resolvePresets", () => {
    it("resolves a single preset reference", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {
        myButton: elementVectorPreset({ width: "10px", height: "10px" }),
      };
      const block = { preset: "myButton" };
      const resolved = resolvePresets(block, presets);
      expect(resolved).toMatchObject({
        type: "elementVector",
        viewBox: "0 0 10 10",
        width: "10px",
        height: "10px",
      });
      expect(resolved).not.toHaveProperty("preset");
    });

    it("resolves nested presets", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {
        base: elementVectorPreset(),
        wrapper: {
          preset: "base",
          width: "20px",
          height: "20px",
        } as unknown as PeblorDefinitionBlock,
      };
      const block = { preset: "wrapper", height: "30px" };
      const resolved = resolvePresets(block, presets);
      expect(resolved).toMatchObject({
        type: "elementVector",
        viewBox: "0 0 10 10",
        shapes: [],
        width: "20px",
        height: "30px",
      });
      expect(resolved).not.toHaveProperty("preset");
    });

    it("merges correctly with overrides (local overrides preset)", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {
        base: elementVectorPreset({ width: "10px", height: "10px" }),
      };
      const block = {
        preset: "base",
        width: "25px",
        customProp: "overridden",
      };
      const resolved = resolvePresets(block, presets);
      expect(resolved).toMatchObject({
        type: "elementVector",
        viewBox: "0 0 10 10",
        width: "25px",
        height: "10px",
        customProp: "overridden",
      });
    });

    it("throws on preset cycle", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {
        cycleA: {
          ...elementVectorPreset({ viewBox: "0 0 10 10" }),
          preset: "cycleB",
        } as PeblorDefinitionBlock,
        cycleB: {
          ...elementVectorPreset({ viewBox: "0 0 20 20" }),
          preset: "cycleA",
        } as PeblorDefinitionBlock,
      };
      const block = { preset: "cycleA", extra: "keep" };
      expect(() => resolvePresets(block, presets)).toThrow(/circular preset/i);
    });

    it("throws when preset not found", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {};
      const block = { preset: "missing", fallback: "value" };
      expect(() => resolvePresets(block, presets)).toThrow(/not found/i);
    });

    it("throws on type mismatch", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {
        section: {
          type: "section",
          title: "Preset Section",
        } as unknown as PeblorDefinitionBlock,
      };
      const block = { preset: "section", type: "elementVector" };
      expect(() => resolvePresets(block, presets)).toThrow(/type mismatch/i);
    });

    it("recursively resolves preset refs in nested arrays", () => {
      const presets: Record<string, PeblorDefinitionBlock> = {
        item: elementVectorPreset({ viewBox: "0 0 1 1" }),
      };
      const block = {
        type: "container",
        items: [{ preset: "item" }, { preset: "item", width: "5px" }],
      };
      const resolved = resolvePresets(block, presets) as Record<string, unknown>;
      expect(Array.isArray(resolved.items)).toBe(true);
      const items = resolved.items as unknown[];
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({ type: "elementVector", viewBox: "0 0 1 1" });
      expect(items[1]).toMatchObject({
        type: "elementVector",
        viewBox: "0 0 1 1",
        width: "5px",
      });
    });

    it("passes through non-object primitives unchanged", () => {
      expect(resolvePresets(null, {})).toBe(null);
      expect(resolvePresets("hello", {})).toBe("hello");
      expect(resolvePresets(42, {})).toBe(42);
    });
  });
});
