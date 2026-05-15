import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("gated-asset route", () => {
  it("returns 410 Gone", async () => {
    const req = new NextRequest("https://example.com/api/forms/gated-asset", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(410);
  });

  it("returns 410 even with valid-looking body", async () => {
    const req = new NextRequest("https://example.com/api/forms/gated-asset", {
      method: "POST",
      body: JSON.stringify({ email: "real@example.com", name: "Real" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
