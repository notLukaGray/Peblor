import type { AnalyticsProvider } from "../types";

export function createConsoleProvider(): AnalyticsProvider {
  return {
    name: "console",
    send: (event) => {
      console.warn("[analytics]", event.event, event);
    },
    ready: () => true,
  };
}
