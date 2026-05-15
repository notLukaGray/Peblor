import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("unsubscribe route", () => {
  const originalWebhook = process.env.UNSUBSCRIBE_WEBHOOK_URL;

  afterEach(() => {
    if (originalWebhook == null) delete process.env.UNSUBSCRIBE_WEBHOOK_URL;
    else process.env.UNSUBSCRIBE_WEBHOOK_URL = originalWebhook;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("forwards preferences object payload to webhook", async () => {
    process.env.UNSUBSCRIBE_WEBHOOK_URL = "https://example.test/unsubscribe";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const req = new NextRequest("https://example.com/api/forms/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "person@example.com",
        preferences: { product: true, events: false, ignored: "yes" },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(String(options.body));

    expect(sent.preferences).toEqual({ product: true, events: false });
  });
});
