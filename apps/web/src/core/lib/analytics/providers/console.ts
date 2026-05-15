import type { AnalyticsProvider } from "../types";

export function createConsoleProvider(): AnalyticsProvider {
  return {
    name: "console",
    send: (event) => {
      // eslint-disable-next-line no-console
      console.log("[analytics]", event.event, event);
    },
    ready: () => true,
  };
}
