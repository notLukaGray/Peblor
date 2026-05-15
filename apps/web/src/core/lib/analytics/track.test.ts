import { describe, expect, it, beforeEach } from "vitest";
import { initAnalytics, track, pageView, trackServer, shutdown, setProvider } from "./track";
import type { AnalyticsProvider } from "./types";
import { registerProvider } from "./registry";

function makeMockProvider(name: string): AnalyticsProvider & { sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    name,
    send: (event) => {
      sent.push(event);
    },
    ready: () => true,
    sent,
  };
}

let noopProvider: ReturnType<typeof makeMockProvider>;

describe("track", () => {
  beforeEach(() => {
    noopProvider = makeMockProvider("noop");
    shutdown();
    registerProvider("noop", () => noopProvider as AnalyticsProvider);
  });

  it("does not send when not initialized", () => {
    track("page_view");
    expect(noopProvider.sent).toHaveLength(0);
  });

  it("does not send when globally disabled", () => {
    initAnalytics({ enabled: false });
    track("page_view");
    expect(noopProvider.sent).toHaveLength(0);
  });

  it("does not send when per-call config.enabled is false", () => {
    initAnalytics({ provider: "noop" });
    track("page_view", undefined, { enabled: false });
    expect(noopProvider.sent).toHaveLength(0);
  });

  it("sends when initialized and enabled", () => {
    initAnalytics({ provider: "noop" });
    track("page_view");
    expect(noopProvider.sent).toHaveLength(1);
    expect((noopProvider.sent[0] as Record<string, unknown>).event).toBe("page_view");
  });

  it("includes source and ts in payload", () => {
    initAnalytics({ provider: "noop" });
    track("page_view");
    const sent = noopProvider.sent[0] as Record<string, unknown>;
    expect(sent.source).toBe("client");
    expect(typeof sent.ts).toBe("number");
    expect(sent.ts).toBeGreaterThan(0);
  });

  it("respects denylist", () => {
    initAnalytics({ provider: "noop", pageDenylist: ["/dev"] });
    track("page_view", { pagePath: "/dev/test" });
    expect(noopProvider.sent).toHaveLength(0);
  });

  it("allows path not in denylist", () => {
    initAnalytics({ provider: "noop", pageDenylist: ["/dev"] });
    track("page_view", { pagePath: "/work/test" });
    expect(noopProvider.sent).toHaveLength(1);
  });

  it("respects allowlist — blocks non-matching paths", () => {
    initAnalytics({ provider: "noop", pageAllowlist: ["/work"] });
    track("page_view", { pagePath: "/dev/test" });
    expect(noopProvider.sent).toHaveLength(0);
  });

  it("respects allowlist — allows matching paths", () => {
    initAnalytics({ provider: "noop", pageAllowlist: ["/work"] });
    track("page_view", { pagePath: "/work/test" });
    expect(noopProvider.sent).toHaveLength(1);
  });

  it("denylist wins over allowlist on overlaps", () => {
    initAnalytics({
      provider: "noop",
      pageAllowlist: ["/work"],
      pageDenylist: ["/work/admin"],
    });
    track("page_view", { pagePath: "/work/admin" });
    expect(noopProvider.sent).toHaveLength(0);
  });

  it("passes extra props through to payload", () => {
    initAnalytics({ provider: "noop" });
    track("content_cta_clicked", { sectionId: "hero", props: { label: "Click" } });
    const sent = noopProvider.sent[0] as Record<string, unknown>;
    expect(sent.sectionId).toBe("hero");
  });
});

describe("pageView", () => {
  beforeEach(() => {
    noopProvider = makeMockProvider("noop");
    shutdown();
    registerProvider("noop", () => noopProvider as AnalyticsProvider);
  });

  it("sends page_view with path and optional title", () => {
    initAnalytics({ provider: "noop" });
    pageView("/work/example", { title: "Example" });
    expect(noopProvider.sent).toHaveLength(1);
    const sent = noopProvider.sent[0] as Record<string, unknown>;
    expect(sent.event).toBe("page_view");
    expect(sent.pagePath).toBe("/work/example");
    expect(sent.title).toBe("Example");
  });

  it("does not send when globally disabled", () => {
    initAnalytics({ enabled: false });
    pageView("/work/example");
    expect(noopProvider.sent).toHaveLength(0);
  });
});

describe("trackServer", () => {
  beforeEach(() => {
    noopProvider = makeMockProvider("noop");
    shutdown();
    registerProvider("noop", () => noopProvider as AnalyticsProvider);
  });

  it("sends with source: server", async () => {
    initAnalytics({ provider: "noop" });
    await trackServer("page_view", { pagePath: "/test" });
    expect(noopProvider.sent).toHaveLength(1);
    const sent = noopProvider.sent[0] as Record<string, unknown>;
    expect(sent.source).toBe("server");
  });

  it("does not send when disabled", async () => {
    initAnalytics({ enabled: false });
    await trackServer("page_view", {});
    expect(noopProvider.sent).toHaveLength(0);
  });
});

describe("setProvider and shutdown", () => {
  beforeEach(() => {
    noopProvider = makeMockProvider("noop");
    shutdown();
    registerProvider("noop", () => noopProvider as AnalyticsProvider);
  });

  it("setProvider replaces the current provider", () => {
    initAnalytics({ provider: "noop" });
    const custom = makeMockProvider("custom");
    setProvider(custom as AnalyticsProvider);
    track("page_view");
    expect(noopProvider.sent).toHaveLength(0);
    expect(custom.sent).toHaveLength(1);
  });

  it("shutdown clears provider", () => {
    initAnalytics({ provider: "noop" });
    track("page_view");
    expect(noopProvider.sent).toHaveLength(1);

    shutdown();
    noopProvider.sent.length = 0;
    track("page_view");
    expect(noopProvider.sent).toHaveLength(0);
  });
});
