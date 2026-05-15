import { describe, expect, it, vi } from "vitest";

describe("bootstrap runtime globals wiring", () => {
  it("applies app globals into runtime globals", async () => {
    vi.resetModules();

    const appGlobals = await import("@/core/lib/globals");
    const runtimeGlobals = await import("@pb/runtime-react/core/lib/globals");
    const { bootstrapCore } = await import("@/bootstrap");

    runtimeGlobals.resetRuntimeGlobals();
    bootstrapCore();

    expect(runtimeGlobals.globals.uiVideoPauseButtonHideDelayMs).toBe(
      appGlobals.uiVideoPauseButtonHideDelayMs
    );
    expect(runtimeGlobals.globals.cdnClientCacheExpiryHours).toBe(
      appGlobals.cdnClientCacheExpiryHours
    );
  });
});
