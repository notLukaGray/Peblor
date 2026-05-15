import { describe, expect, it, vi, beforeEach } from "vitest";

const mockVercelTrack = vi.fn();

vi.mock("@vercel/analytics", () => ({
  track: mockVercelTrack,
}));

import { createVercelProvider } from "./vercel";

describe("vercel provider", () => {
  beforeEach(() => {
    mockVercelTrack.mockClear();
  });

  it("ready returns false before first send", () => {
    expect(createVercelProvider().ready()).toBe(false);
  });

  it("name is vercel", () => {
    expect(createVercelProvider().name).toBe("vercel");
  });

  it("calls @vercel/analytics track with event data", async () => {
    const p = createVercelProvider();

    await p.send({
      event: "page_view",
      pagePath: "/test",
      source: "client",
      ts: 1715000000000,
      title: "Test Page",
    });

    expect(mockVercelTrack).toHaveBeenCalledTimes(1);
    const callArgs = mockVercelTrack.mock.calls[0];
    if (!callArgs) throw new Error("Expected mock to be called");
    const [eventName, data] = callArgs;
    expect(eventName).toBe("page_view");
    expect(data).toEqual({ pagePath: "/test", title: "Test Page" });
  });

  it("strips ts and source from Vercel payload", async () => {
    const p = createVercelProvider();

    await p.send({
      event: "form_submit_attempt",
      pagePath: "/contact",
      source: "server",
      ts: 1715000000000,
      handlerKey: "contact",
    });

    expect(mockVercelTrack).toHaveBeenCalledTimes(1);
    const callArgs2 = mockVercelTrack.mock.calls[0];
    if (!callArgs2) throw new Error("Expected mock to be called");
    const [, data] = callArgs2;
    expect(data).toEqual({ pagePath: "/contact" });
    expect(data).not.toHaveProperty("ts");
    expect(data).not.toHaveProperty("source");
  });
});
