import type { AnalyticsProvider } from "../types";

export function createNoopProvider(): AnalyticsProvider {
  return {
    name: "noop",
    send: () => {},
    ready: () => true,
  };
}
