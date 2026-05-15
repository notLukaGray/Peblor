import { describe, expect, it, beforeEach, vi } from "vitest";
import { getProvider, registerProvider } from "./registry";
import type { AnalyticsProvider } from "./types";

function makeProvider(name: string): AnalyticsProvider {
  return {
    name,
    send: () => {},
    ready: () => true,
  };
}

describe("analytics registry", () => {
  beforeEach(() => {
    registerProvider("noop", () => makeProvider("noop"));
    registerProvider("console", () => makeProvider("console"));
    registerProvider("vercel", () => makeProvider("vercel"));
  });

  it("resolves noop provider", () => {
    const p = getProvider({ provider: "noop" });
    expect(p.name).toBe("noop");
  });

  it("resolves console provider", () => {
    const p = getProvider({ provider: "console" });
    expect(p.name).toBe("console");
  });

  it("resolves vercel provider", () => {
    const p = getProvider({ provider: "vercel" });
    expect(p.name).toBe("vercel");
  });

  it("defaults to noop when provider not specified", () => {
    const p = getProvider({});
    expect(p.name).toBe("noop");
  });

  it("falls back to noop for unknown provider name", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const p = getProvider({ provider: "unknown" as never });
    expect(p.name).toBe("noop");
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Unknown provider "unknown"'));
    consoleWarn.mockRestore();
  });

  it("supports custom provider injection", () => {
    const custom = makeProvider("my-custom");
    const p = getProvider({ provider: "custom", customProvider: custom });
    expect(p.name).toBe("my-custom");
  });

  it("registers and resolves new providers", () => {
    registerProvider("my-provider", () => makeProvider("my-provider"));
    const p = getProvider({ provider: "my-provider" as never });
    expect(p.name).toBe("my-provider");
  });
});
