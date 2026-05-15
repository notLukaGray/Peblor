"use client";

export type FoundationReduceMotionPolicy = "honor-system" | "disable-all" | "replace-with-fade";

const DEFAULT_POLICY: FoundationReduceMotionPolicy = "honor-system";

export function readFoundationReduceMotionPolicy(): FoundationReduceMotionPolicy {
  if (typeof window === "undefined" || typeof document === "undefined") return DEFAULT_POLICY;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--pb-reduce-motion-policy")
    .trim();
  if (raw === "disable-all" || raw === "replace-with-fade" || raw === "honor-system") {
    return raw;
  }
  return DEFAULT_POLICY;
}

export function resolveFoundationMotionControls(reduceMotion: boolean | undefined): {
  policy: FoundationReduceMotionPolicy;
  disableAll: boolean;
  replaceWithFade: boolean;
  ignorePreference: boolean;
} {
  const policy = readFoundationReduceMotionPolicy();
  if (policy === "disable-all") {
    return {
      policy,
      disableAll: true,
      replaceWithFade: false,
      ignorePreference: false,
    };
  }
  return {
    policy,
    disableAll: false,
    replaceWithFade: policy === "replace-with-fade",
    ignorePreference: reduceMotion === false,
  };
}
