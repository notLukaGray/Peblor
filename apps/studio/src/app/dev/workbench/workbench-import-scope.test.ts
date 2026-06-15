import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import { importWorkbenchSessionFromJsonWithPromptedScope } from "./workbench-import-scope";

function mockPrompt(value: string | null) {
  Object.defineProperty(window, "prompt", {
    value: vi.fn().mockReturnValue(value),
    writable: true,
    configurable: true,
  });
}

function mockConfirm(value: boolean) {
  Object.defineProperty(window, "confirm", {
    value: vi.fn().mockReturnValue(value),
    writable: true,
    configurable: true,
  });
}

describe("importWorkbenchSessionFromJsonWithPromptedScope", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("imports style scope without changing colors", () => {
    const base = getWorkbenchSession();
    const nextStyle = {
      ...base.style,
      breakpoints: { ...base.style.breakpoints, mobile: 777 },
    };
    mockPrompt("style");
    const result = importWorkbenchSessionFromJsonWithPromptedScope(
      JSON.stringify({ v: 2, style: nextStyle })
    );
    expect(result).toEqual({ ok: true, scope: "style" });
    const after = getWorkbenchSession();
    expect(after.style.breakpoints.mobile).toBe(777);
    expect(after.colors).toEqual(base.colors);
  });

  it("imports colors scope without changing style", () => {
    const base = getWorkbenchSession();
    const nextColors = {
      ...base.colors,
      seedsLight: { ...base.colors.seedsLight, primary: "#123456" },
    };
    mockPrompt("colors");
    const result = importWorkbenchSessionFromJsonWithPromptedScope(
      JSON.stringify({ v: 2, colors: nextColors })
    );
    expect(result).toEqual({ ok: true, scope: "colors" });
    const after = getWorkbenchSession();
    expect(after.colors.seedsLight.primary).toBe("#123456");
    expect(after.style).toEqual(base.style);
  });

  it("imports elements scope for expanded element keys", () => {
    const base = getWorkbenchSession();
    const nextButton = {
      ...base.elements.button,
      defaultVariant: "accent" as const,
    };
    mockPrompt("elements");
    const result = importWorkbenchSessionFromJsonWithPromptedScope(
      JSON.stringify({ v: 2, elements: { button: nextButton } })
    );
    expect(result).toEqual({ ok: true, scope: "elements" });
    const after = getWorkbenchSession();
    expect(after.elements.button.defaultVariant).toBe("accent");
    expect(after.elements.link).toEqual(base.elements.link);
  });

  it("returns slice error when requested scope is missing", () => {
    mockPrompt("style");
    const result = importWorkbenchSessionFromJsonWithPromptedScope(
      JSON.stringify({ v: 2, colors: getWorkbenchSession().colors })
    );
    expect(result).toEqual({ ok: false, error: "Import payload has no style slice" });
  });

  it("returns canceled when prompt is dismissed", () => {
    mockPrompt(null);
    expect(importWorkbenchSessionFromJsonWithPromptedScope(JSON.stringify({ v: 2 }))).toEqual({
      ok: false,
      error: "Import canceled",
    });
  });

  it("returns validation error for unsupported scope", () => {
    mockPrompt("unknown");
    expect(importWorkbenchSessionFromJsonWithPromptedScope(JSON.stringify({ v: 2 }))).toEqual({
      ok: false,
      error: "Scope must be all, colors, fonts, style, or elements",
    });
  });

  it("returns canceled when all-scope overwrite is rejected", () => {
    const base = getWorkbenchSession();
    const imported = {
      ...base,
      style: {
        ...base.style,
        breakpoints: { ...base.style.breakpoints, mobile: 888 },
      },
    };
    mockPrompt("all");
    mockConfirm(false);
    expect(importWorkbenchSessionFromJsonWithPromptedScope(JSON.stringify(imported))).toEqual({
      ok: false,
      error: "Import canceled",
    });
    expect(getWorkbenchSession().style.breakpoints.mobile).toBe(base.style.breakpoints.mobile);
  });
});
