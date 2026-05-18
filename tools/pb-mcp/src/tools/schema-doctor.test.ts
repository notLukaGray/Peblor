import { describe, expect, it } from "vitest";
import { schemaDoctor } from "./schema-doctor.js";

describe("schema_doctor", () => {
  it("infers action kind, validates, and suggests payload fix", async () => {
    const out = (await schemaDoctor.run({
      json: JSON.stringify({ type: "setVariable", key: "a", value: 1 }),
    })) as {
      inferredKind: string;
      valid: boolean;
      suggestions: Array<{ suggestion: string }>;
    };

    expect(out.inferredKind).toBe("action");
    expect(out.valid).toBe(false);
    expect(out.suggestions.some((s) => s.suggestion.toLowerCase().includes("payload"))).toBe(true);
  });

  it("returns scaffold hint when type is known", async () => {
    const out = (await schemaDoctor.run({
      json: JSON.stringify({ type: "backgroundImage" }),
    })) as {
      scaffoldHint: unknown;
    };
    expect(out.scaffoldHint).toBeTruthy();
  });
});
