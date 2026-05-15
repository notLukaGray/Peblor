"use client";

import dynamic from "next/dynamic";
import { NavigationProvider } from "@pb/runtime-react/core/navigation-context";
import { PageTransition } from "@/core/ui/PageTransition";

const NavigationOverlay = dynamic(
  () => import("@/core/ui/NavigationOverlay").then((m) => m.NavigationOverlay),
  { ssr: false }
);

type AppLayoutProps = {
  children: React.ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <NavigationProvider>
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--pb-z-max)] focus:m-0 focus:inline-block focus:h-auto focus:max-h-none focus:w-auto focus:max-w-none focus:overflow-visible focus:whitespace-normal focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:[clip:auto]"
      >
        Skip to main content
      </a>
      <main id="main-content" className="min-h-dvh w-full min-w-0 flex flex-col bg-background">
        <PageTransition>{children}</PageTransition>
      </main>
      <NavigationOverlay />
    </NavigationProvider>
  );
}
