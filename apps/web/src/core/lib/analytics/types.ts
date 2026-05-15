import type { AnalyticsEventPayload } from "@pb/contracts";

export interface AnalyticsProvider {
  name: string;
  send: (event: AnalyticsEventPayload) => void | Promise<void>;
  pageView?: (payload: AnalyticsEventPayload) => void | Promise<void>;
  identify?: (userId: string, traits?: Record<string, unknown>) => void | Promise<void>;
  ready: () => boolean | Promise<boolean>;
}

export type ProviderName = "noop" | "console" | "vercel" | "custom";

export interface AnalyticsOptions {
  provider?: ProviderName;
  enabled?: boolean;
  pageAllowlist?: string[];
  pageDenylist?: string[];
  debug?: boolean;
  customProvider?: AnalyticsProvider;
}
