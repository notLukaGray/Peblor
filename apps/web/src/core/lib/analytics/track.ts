import type {
  AnalyticsEventPayload,
  AnalyticsConfig,
  AnalyticsEventName,
  AnalyticsEventKey,
} from "@pb/contracts";
import type { AnalyticsProvider, AnalyticsOptions } from "./types";
import { getAnalyticsOptions } from "./config";
import { getProvider, registerProvider } from "./registry";
import { evaluateConditions } from "./conditions";
import { createNoopProvider } from "./providers/noop";
import { createConsoleProvider } from "./providers/console";
import { createVercelProvider } from "./providers/vercel";

let provider: AnalyticsProvider | null = null;
let options: AnalyticsOptions = {};

registerProvider("noop", createNoopProvider);
registerProvider("console", createConsoleProvider);
registerProvider("vercel", createVercelProvider);

export function initAnalytics(opts?: Partial<AnalyticsOptions>): void {
  options = { ...getAnalyticsOptions(), ...opts };
  provider = getProvider(options);

  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__analytics_track = (
      event: string,
      properties?: Record<string, unknown>
    ) => {
      track(event as AnalyticsEventKey, properties as Record<string, unknown> | undefined);
    };
  }
}

export function track(
  event: AnalyticsEventKey,
  extra?: Record<string, unknown>,
  config?: AnalyticsConfig
): void {
  if (!provider) return;

  if (typeof window === "undefined") return;

  if (options.enabled === false) return;
  if (config?.enabled === false) return;

  const pagePath = (extra?.pagePath as string) ?? globalThis.window?.location?.pathname ?? "";

  if (!isPathAllowed(pagePath)) return;

  if (!evaluateConditions(config)) return;

  const { sectionId, elementId, ...extraRest } = extra ?? {};
  const payload = {
    sectionId,
    elementId,
    ...extraRest,
    event: event as AnalyticsEventPayload["event"],
    pagePath,
    source: "client" as const,
    ts: Date.now(),
  } as AnalyticsEventPayload;

  provider.send(payload);
}

export function pageView(path: string, extra?: Record<string, unknown>): void {
  if (!provider) return;

  if (options.enabled === false) return;
  if (!isPathAllowed(path)) return;

  const payload = {
    event: "page_view" as const,
    pagePath: path,
    source: "client" as const,
    ts: Date.now(),
    ...(extra?.title ? { title: extra.title as string } : {}),
  } as AnalyticsEventPayload;

  if (provider.pageView) {
    provider.pageView(payload);
  } else {
    provider.send(payload);
  }
}

export async function trackServer(
  event: AnalyticsEventName,
  extra?: Record<string, unknown>
): Promise<void> {
  if (!provider) return;
  if (options.enabled === false) return;

  const pagePath = (extra?.pagePath as string) ?? "";
  if (!isPathAllowed(pagePath)) return;

  const payload: AnalyticsEventPayload = {
    event,
    pagePath,
    source: "server",
    ts: Date.now(),
    ...extra,
  } as AnalyticsEventPayload;

  await provider.send(payload);
}

export function setProvider(p: AnalyticsProvider): void {
  provider = p;
}

export function shutdown(): void {
  provider = null;
  options = {};
}

function isPathAllowed(pagePath: string): boolean {
  if (!pagePath) return true;

  if (options.pageDenylist?.length) {
    for (const pattern of options.pageDenylist) {
      if (pagePath.startsWith(pattern)) return false;
    }
  }

  if (options.pageAllowlist?.length) {
    for (const pattern of options.pageAllowlist) {
      if (pagePath.startsWith(pattern)) return true;
    }
    return false;
  }

  return true;
}

declare global {
  interface Window {
    __analytics_track?: (event: string, properties?: Record<string, unknown>) => void;
  }
}
