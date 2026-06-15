import { describe, it, expect } from "vitest";
import { explainDiagnostic } from "./explain-diagnostic.js";

describe("explain_diagnostic", () => {
  it("returns explanation for PB_STRICT_LOAD_FAILED", async () => {
    const result = (await explainDiagnostic.run({ code: "PB_STRICT_LOAD_FAILED" })) as {
      code: string;
      explanation: string;
      likelyCauses: string[];
      suggestedFix: string;
      relatedTools: string[];
    };
    expect(result.code).toBe("PB_STRICT_LOAD_FAILED");
    expect(result.explanation.length).toBeGreaterThan(20);
    expect(result.likelyCauses.length).toBeGreaterThan(0);
    expect(result.suggestedFix.length).toBeGreaterThan(20);
    expect(result.relatedTools).toContain("doctor_page");
  });

  it("returns explanation for PB_VALIDATION_ERROR", async () => {
    const result = (await explainDiagnostic.run({
      code: "PB_VALIDATION_ERROR",
      message: "Invalid field type",
      path: "$.definitions.hero",
    })) as { code: string; message: string; path: string; relatedTools: string[] };
    expect(result.code).toBe("PB_VALIDATION_ERROR");
    expect(result.message).toBe("Invalid field type");
    expect(result.path).toBe("$.definitions.hero");
    expect(result.relatedTools).toContain("get_element_schema");
  });

  it("returns fallback explanation for unknown codes", async () => {
    const result = (await explainDiagnostic.run({ code: "PB_TOTALLY_UNKNOWN_CODE" })) as {
      explanation: string;
      relatedTools: string[];
    };
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.relatedTools).toContain("doctor_page");
  });

  it("enriches with doctor output when pageRoute is provided", async () => {
    const result = (await explainDiagnostic.run({
      code: "PB_VALIDATION_ERROR",
      pageRoute: "/presets/cards-basic",
    })) as { doctorPage: unknown };
    // doctorPage should be present (null or an object — best-effort)
    expect("doctorPage" in result).toBe(true);
  });
});
