import { describe, expect, it, beforeEach } from "vitest";
import { initAnalytics, track, shutdown } from "./track";
import type { AnalyticsProvider } from "./types";
import { registerProvider } from "./registry";

function makeMockProvider(name: string): AnalyticsProvider & { sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    name,
    send: (e: unknown) => {
      sent.push(e);
    },
    ready: () => true,
    sent,
  };
}

describe("feature flags", () => {
  let noop: ReturnType<typeof makeMockProvider>;

  beforeEach(() => {
    noop = makeMockProvider("noop");
    shutdown();
    registerProvider("noop", () => noop as AnalyticsProvider);
  });

  it("denylist wins over allowlist on overlapping paths", () => {
    initAnalytics({
      provider: "noop",
      pageAllowlist: ["/work"],
      pageDenylist: ["/work/admin"],
    });
    track("page_view", { pagePath: "/work/admin" });
    expect(noop.sent).toHaveLength(0);
  });

  it("allows path on allowlist even when denylist is set", () => {
    initAnalytics({
      provider: "noop",
      pageAllowlist: ["/work"],
      pageDenylist: ["/dev"],
    });
    track("page_view", { pagePath: "/work/projects" });
    expect(noop.sent).toHaveLength(1);
  });

  it("blocks path on denylist when no allowlist is set", () => {
    initAnalytics({
      provider: "noop",
      pageDenylist: ["/dev"],
    });
    track("page_view", { pagePath: "/dev/test" });
    expect(noop.sent).toHaveLength(0);
  });

  it("debug mode does not affect noop sends", () => {
    initAnalytics({ provider: "noop", debug: true });
    track("page_view");
    expect(noop.sent).toHaveLength(1);
  });
});
