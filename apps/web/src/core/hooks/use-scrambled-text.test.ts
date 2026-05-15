import { describe, it, expect } from "vitest";
import {
  scrambleText,
  scrambleStep,
  pickScrambleChar,
  makeSeededRng,
  type Rng,
} from "./use-scrambled-text";

describe("use-scrambled-text", () => {
  describe("pickScrambleChar", () => {
    it("returns deterministic char when rng is fixed", () => {
      const rng: Rng = () => 0.5;
      expect(pickScrambleChar(rng, "abc")).toBe("b");
    });
    it("returns empty string for empty charset", () => {
      expect(pickScrambleChar(() => 0, "")).toBe("");
    });
  });

  describe("scrambleStep", () => {
    it("is deterministic when rng is deterministic", () => {
      let count = 0;
      const rng: Rng = () => (count++ % 10) / 10;
      const out1 = scrambleStep("hello", rng);
      count = 0;
      const out2 = scrambleStep("hello", () => (count++ % 10) / 10);
      expect(out1).toBe(out2);
    });
    it("preserves non-letter characters and length", () => {
      const rng = makeSeededRng(42);
      const text = "a1b 2c!";
      const out = scrambleStep(text, rng);
      expect(out.length).toBe(text.length);
      expect(out[1]).toBe("1");
      expect(out[3]).toBe(" ");
      expect(out[4]).toBe("2");
      expect(out[6]).toBe("!");
    });
    it("preserves case of letters", () => {
      const rng = makeSeededRng(123);
      const text = "Hello";
      const out = scrambleStep(text, rng);
      expect(out).toMatch(/^[A-Z][a-z][a-z][a-z][a-z]$/);
    });
  });

  describe("scrambleText", () => {
    it("produces same output for same seed (default rng)", () => {
      const a = scrambleText("hello", 1);
      const b = scrambleText("hello", 1);
      expect(a).toBe(b);
    });
    it("produces same output when rng is injected and deterministic", () => {
      const rng = makeSeededRng(99);
      const a = scrambleText("world", 0, rng);
      const b = scrambleText("world", 0, makeSeededRng(99));
      expect(a).toBe(b);
    });
    it("preserves non-scrambled (non-letter) characters", () => {
      const out = scrambleText("a1b 2c", 7);
      expect(out[1]).toBe("1");
      expect(out[3]).toBe(" ");
      expect(out[4]).toBe("2");
    });
  });
});
