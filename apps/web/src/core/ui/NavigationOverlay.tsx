"use client";

import { useNavigation } from "@pb/runtime-react/core/navigation-context";

export function NavigationOverlay() {
  const { isNavigating } = useNavigation();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[var(--pb-z-overlay)] bg-background transition-opacity duration-200"
      style={{ opacity: isNavigating ? 0.4 : 0 }}
    />
  );
}
