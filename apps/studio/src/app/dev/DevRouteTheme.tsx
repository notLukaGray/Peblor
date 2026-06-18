"use client";

import { ThemeProvider } from "@/core/providers/theme-provider";

/**
 * `/dev` tools default to a light shell. The user can toggle via the Session
 * drawer — we use the same storage key as the root layout so the choice
 * persists across dev routes.
 */
export function DevRouteTheme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="peblor-studio-theme"
    >
      {children}
    </ThemeProvider>
  );
}
