"use client";

import { ThemeProvider } from "@/core/providers/theme-provider";

/**
 * `/dev` tools read better on a light shell; keep them visually separate from the site default
 * (`layout.tsx` still defaults the marketing app to dark).
 */
export function DevRouteTheme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="peblor-dev-route-theme"
    >
      {children}
    </ThemeProvider>
  );
}
