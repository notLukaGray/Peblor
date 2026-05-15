import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("magic-link route", () => {
  it("returns 501 Not Implemented", async () => {
    const res = await POST();
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.error).toContain("disabled");
  });
});
