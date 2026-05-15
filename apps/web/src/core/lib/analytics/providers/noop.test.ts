import { describe, expect, it } from "vitest";
import { createNoopProvider } from "./noop";

describe("noop provider", () => {
  it("ready returns true", () => {
    const p = createNoopProvider();
    expect(p.ready()).toBe(true);
  });

  it("send does not throw", () => {
    const p = createNoopProvider();
    expect(() =>
      p.send({
        event: "page_view",
        pagePath: "/test",
        source: "client",
        ts: Date.now(),
      })
    ).not.toThrow();
  });

  it("name is noop", () => {
    expect(createNoopProvider().name).toBe("noop");
  });
});
