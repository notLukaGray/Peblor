import { describe, expect, it } from "vitest";
import { glassEffectSchema } from "./section-effect-schemas";

describe("booleanishSchema (SCHEMA-7)", () => {
  it.each([
    ["yes", true],
    ["no", false],
    ["on", true],
    ["off", false],
    ["YES", true],
    [" No ", false],
  ])("coerces glass dropShadow string %j to %s", (input, expected) => {
    const r = glassEffectSchema.safeParse({ type: "glass", dropShadow: input });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dropShadow).toBe(expected);
  });
});
