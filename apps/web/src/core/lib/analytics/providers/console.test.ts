import { describe, expect, it, vi, beforeEach } from "vitest";
import { createConsoleProvider } from "./console";

describe("console provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ready returns true", () => {
    expect(createConsoleProvider().ready()).toBe(true);
  });

  it("name is console", () => {
    expect(createConsoleProvider().name).toBe("console");
  });

  it("logs event to console", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const p = createConsoleProvider();

    p.send({
      event: "page_view",
      pagePath: "/test",
      source: "client",
      ts: 1715000000000,
    });

    expect(logSpy).toHaveBeenCalledWith("[analytics]", "page_view", expect.any(Object));
    logSpy.mockRestore();
  });
});
