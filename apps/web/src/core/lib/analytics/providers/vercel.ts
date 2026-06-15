import type { AnalyticsProvider } from "../types";
import type { AnalyticsEventPayload } from "@pb/contracts";

export function createVercelProvider(): AnalyticsProvider {
  let vercelTrack: ((name: string, data?: Record<string, unknown>) => void) | null = null;

  return {
    name: "vercel",

    send: async (event: AnalyticsEventPayload) => {
      if (!vercelTrack) {
        try {
          const mod = await import("@vercel/analytics");
          vercelTrack = mod.track as (name: string, data?: Record<string, unknown>) => void;
        } catch (err) {
          console.warn("[web-core] @vercel/analytics not available, event dropped", err);
          return;
        }
      }

      const { event: _eventName, ts: _ts, source: _source } = event;
      const data: Record<string, unknown> = {};
      if ("pagePath" in event) data.pagePath = event.pagePath as string;
      if ("sectionId" in event) data.sectionId = event.sectionId as string;
      if ("elementId" in event) data.elementId = event.elementId as string;
      if ("title" in event) data.title = event.title as string;
      if ("props" in event) data.props = event.props;
      try {
        vercelTrack(_eventName, data);
      } catch (err) {
        console.warn("[analytics] Vercel track failed:", err);
      }
    },

    ready: () => {
      return vercelTrack !== null;
    },
  };
}
