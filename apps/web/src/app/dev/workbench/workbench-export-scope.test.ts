import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportWorkbenchSessionJsonWithPromptedScope } from "./workbench-export-scope";

function mockPrompt(value: string | null) {
  Object.defineProperty(window, "prompt", {
    value: vi.fn().mockReturnValue(value),
    writable: true,
    configurable: true,
  });
}

describe("exportWorkbenchSessionJsonWithPromptedScope", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("exports full session for all scope", () => {
    mockPrompt("all");
    const result = exportWorkbenchSessionJsonWithPromptedScope();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = JSON.parse(result.text) as Record<string, unknown>;
    expect(result.scope).toBe("all");
    expect(result.fileName).toBe("workbench-session.json");
    expect(parsed.v).toBe(2);
    expect(parsed).toHaveProperty("colors");
    expect(parsed).toHaveProperty("fonts");
    expect(parsed).toHaveProperty("style");
    expect(parsed).toHaveProperty("elements");
  });

  it("exports only style slice for style scope", () => {
    mockPrompt("style");
    const result = exportWorkbenchSessionJsonWithPromptedScope();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = JSON.parse(result.text) as Record<string, unknown>;
    expect(result.scope).toBe("style");
    expect(result.fileName).toBe("workbench-session-style.json");
    expect(Object.keys(parsed).sort()).toEqual(["style", "v"]);
  });

  it("returns canceled when prompt is dismissed", () => {
    mockPrompt(null);
    expect(exportWorkbenchSessionJsonWithPromptedScope()).toEqual({
      ok: false,
      error: "Export canceled",
    });
  });

  it("returns validation error for unsupported scope", () => {
    mockPrompt("unknown");
    expect(exportWorkbenchSessionJsonWithPromptedScope()).toEqual({
      ok: false,
      error: "Scope must be all, colors, fonts, style, or elements",
    });
  });
});
