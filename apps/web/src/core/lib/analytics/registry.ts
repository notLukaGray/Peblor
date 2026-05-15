import type { AnalyticsProvider, AnalyticsOptions, ProviderName } from "./types";

type ProviderFactory = () => AnalyticsProvider;

const registry = new Map<ProviderName | string, ProviderFactory>();

export function registerProvider(name: string, factory: ProviderFactory): void {
  registry.set(name, factory);
}

export function getProvider(options: AnalyticsOptions): AnalyticsProvider {
  const name = options.provider ?? "noop";

  if (name === "custom" && options.customProvider) {
    return options.customProvider;
  }

  const factory = registry.get(name);
  if (!factory) {
    if (name !== "noop") {
      console.warn(`[analytics] Unknown provider "${name}", falling back to noop`);
    }
    const noopFactory = registry.get("noop");
    if (noopFactory) return noopFactory();
    return createFallbackNoop();
  }

  return factory();
}

function createFallbackNoop(): AnalyticsProvider {
  return {
    name: "noop",
    send: () => {},
    ready: () => true,
  };
}
