import type React from "react";
import "./globals.css";
import { bootstrapCore } from "@/bootstrap";
import { ThemeProvider } from "@/core/providers/theme-provider";
import { MotionFeatureProvider } from "@/app/MotionFeatureProvider";
import { BrowserDataClient } from "@/app/BrowserDataClient";
import { pbBrandCssInline } from "@/app/theme/config";
import { pbContentGuidelinesCssInline } from "@/app/theme/pb-content-guidelines";
import { serializePbProductionFoundationsCss } from "@/app/theme/pb-foundation-config";

export const metadata = {
  title: "Peblor Studio",
  description: "Peblor dev studio — element, layout, style, color, and font workbench",
};

// Compute once per cold-start — pure functions of static config.
const pbBrandCss = pbBrandCssInline();
const pbFoundationsCss = serializePbProductionFoundationsCss();
const pbContentGuidelinesCss = pbContentGuidelinesCssInline();

// Mirrors what the web app's root layout does — initialises the core runtime
// config (builder defaults, content guidelines, globals) so all dev surfaces
// see the same initial state they had when they lived under apps/web/.
bootstrapCore();

async function DevelopmentClients() {
  if (process.env.NODE_ENV !== "development") return null;
  const { DevRuntimeClients } = await import("@/app/DevRuntimeClients");
  return <DevRuntimeClients />;
}

export default function StudioRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="font-sans antialiased">
        {/* PB brand `--pb-*` tokens, foundations (spacing / shadows / motion),
            and content-guideline vars. Mirrors what apps/web/src/app/layout.tsx
            injects — the dev pages were authored against these. */}
        <style dangerouslySetInnerHTML={{ __html: pbBrandCss }} suppressHydrationWarning />
        <style
          id="pb-foundations-runtime"
          dangerouslySetInnerHTML={{ __html: pbFoundationsCss }}
          suppressHydrationWarning
        />
        <style
          dangerouslySetInnerHTML={{ __html: pbContentGuidelinesCss }}
          suppressHydrationWarning
        />
        <MotionFeatureProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            storageKey="peblor-studio-theme"
          >
            <BrowserDataClient />
            <DevelopmentClients />
            {children}
          </ThemeProvider>
        </MotionFeatureProvider>
      </body>
    </html>
  );
}
