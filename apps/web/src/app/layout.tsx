import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Fragment } from "react";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "./globals.css";
import "./fonts/webfonts.css";
import { bootstrapCore } from "@/bootstrap";
import { primaryFontLocal, secondaryFontLocal, monoFontLocal } from "@/app/fonts/create-fonts";
import { primaryFontConfig, secondaryFontConfig, monoFontConfig } from "@/app/fonts/config";
import { getActiveWebfontUrls, getCriticalWebfontUrls } from "@/app/fonts/webfont";
import { getBunnyFontCssCached } from "@/app/fonts/embed-font-faces";
import { generateFontCssVars, generateFallbackFontFaces } from "@/app/fonts/css-vars";
import { typeScaleConfig } from "@/app/fonts/type-scale";
import { SELF_HOSTED } from "@/app/fonts/self-hosted-flag";
import { getTwitterCardForOgImage, siteUrl, cdnBase, siteMetadata } from "@/core/lib/globals";
import { ThemeProvider } from "@/core/providers/theme-provider";
import { AppLayout } from "@/core/ui/app-layout";
import { DeviceTypeProvider } from "@/core/providers/device-type-provider";
import { BrowserDataClient } from "@/app/BrowserDataClient";
import { AnalyticsScript } from "@/app/analytics-script";
import { pbBrandCssInline } from "@/app/theme/config";
import { pbContentGuidelinesCssInline } from "@/app/theme/pb-content-guidelines-config";
import { getProductionColorToolPersistedV2 } from "@/app/dev/colors/color-tool-persistence";
import { getProductionWorkbenchSession } from "@/app/dev/workbench/workbench-defaults";
import { buildWorkbenchThemeColorVarMap } from "@/app/theme/pb-workbench-color-var-map";
import { serializePbFoundationsCss } from "@/app/theme/pb-foundation-css";

function getOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const cdnOrigin = getOrigin(cdnBase);
const productionColorConfig = getProductionColorToolPersistedV2();
const lightThemeColor =
  buildWorkbenchThemeColorVarMap(productionColorConfig, "light")["--pb-secondary"] ?? "#ffffff";
const darkThemeColor =
  buildWorkbenchThemeColorVarMap(productionColorConfig, "dark")["--pb-secondary"] ?? "#000000";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: siteMetadata.title,
  description: siteMetadata.description,
  alternates: { canonical: "./" },
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
  },
  twitter: {
    card: getTwitterCardForOgImage(undefined),
    title: siteMetadata.title,
    description: siteMetadata.description,
  },
  ...(cdnOrigin && {
    icons: {
      other: [
        { rel: "preconnect", url: cdnOrigin },
        { rel: "dns-prefetch", url: cdnOrigin },
      ],
    },
  }),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: lightThemeColor },
    { media: "(prefers-color-scheme: dark)", color: darkThemeColor },
  ],
};

// Build once at module level — these are pure functions of static config.
// Skip when self-hosted: fonts are served from /font/self-hosted/ via the CSS import above.
const webfontUrls = SELF_HOSTED
  ? ([] as string[])
  : getActiveWebfontUrls(primaryFontConfig, secondaryFontConfig, monoFontConfig);
const criticalWebfontEntries = SELF_HOSTED
  ? ([] as { url: string; family: string }[])
  : getCriticalWebfontUrls(primaryFontConfig, secondaryFontConfig, monoFontConfig);
const webfontOrigins = SELF_HOSTED
  ? ([] as string[])
  : Array.from(
      new Set(
        webfontUrls
          .map((url) => getOrigin(url))
          .filter((origin): origin is string => origin != null)
      )
    );
const fontCssVars = generateFontCssVars(
  primaryFontConfig,
  secondaryFontConfig,
  monoFontConfig,
  typeScaleConfig
);
const fallbackFontFaces = generateFallbackFontFaces(
  primaryFontConfig,
  secondaryFontConfig,
  monoFontConfig
);
const pbFoundationsCss = serializePbFoundationsCss(getProductionWorkbenchSession());

// Only apply a slot's next/font variable className when that slot uses local files.
// Webfont slots get their --font-* var set via the generated <style> block above.
const htmlFontClasses = [
  primaryFontConfig.source === "local" ? primaryFontLocal.variable : null,
  secondaryFontConfig.source === "local" ? secondaryFontLocal.variable : null,
  monoFontConfig.source === "local" ? monoFontLocal.variable : null,
]
  .filter(Boolean)
  .join(" ");

bootstrapCore();

// Preload critical self-hosted font files (Latin-normal, weights 400/500/700/900)
// so the browser fetches them at highest priority during HTML parse, eliminating
// the render delay between FCP and LCP caused by font discovery through CSS.
let criticalFontPreloads: { path: string }[] = [];
if (SELF_HOSTED) {
  try {
    const appDir = dirname(fileURLToPath(import.meta.url));
    const manifestRaw = readFileSync(join(appDir, "fonts/webfont-manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw) as {
      family: string;
      path: string;
      weight: number;
      style: string;
    }[];
    // Only preload the primary font — it's the one used by LCP text.
    const primaryFamily = primaryFontConfig.webfont.family;
    criticalFontPreloads = manifest.filter(
      (e) => e.family === primaryFamily && e.style === "normal"
    );
  } catch {
    // Manifest doesn't exist (fonts not yet downloaded) — skip preloads.
  }
}

async function DevelopmentClients() {
  if (process.env.NODE_ENV !== "development") return null;
  const { DevRuntimeClients } = await import("./DevRuntimeClients");
  return <DevRuntimeClients />;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  // Fetch critical webfont CSS at render time — cached in memory so each server
  // instance fetches once. Skipped when self-hosted — @font-face rules are in the
  // statically imported webfonts.css.
  const criticalCssFragments = SELF_HOSTED
    ? ([] as string[])
    : await Promise.all(
        criticalWebfontEntries.map(async ({ url }) => {
          const css = await getBunnyFontCssCached(url);
          return css || `<link rel="stylesheet" href="${url}" />`;
        })
      );

  return (
    <html lang="en" suppressHydrationWarning className={htmlFontClasses}>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var d=document.documentElement;var t=d.dataset.pbForcedTheme||localStorage.getItem("theme");d.className+=" "+(t==="light"?"light":"dark");d.style.colorScheme=t==="light"?"light":"dark"})();',
          }}
        />
        {/* Weight vars + webfont family overrides. Injected before any stylesheet
            so CSS custom properties are available when globals.css is parsed. */}
        <style dangerouslySetInnerHTML={{ __html: fontCssVars }} />
        {/* Metric-adjusted fallback @font-face rules — makes Arial/Times match
            the webfont's metrics exactly, eliminating CLS during font swap. */}
        <style dangerouslySetInnerHTML={{ __html: fallbackFontFaces }} />
        {/* Preload critical self-hosted font files (Latin-normal, weights 400/500/700/900).
            Browser fetches them at highest priority during HTML parse, eliminating the
            render delay from font discovery through the CSS stylesheet. */}
        {criticalFontPreloads.map((entry) => (
          <link
            key={entry.path}
            rel="preload"
            as="font"
            type="font/woff2"
            href={entry.path}
            crossOrigin=""
          />
        ))}
        {webfontOrigins.map((origin) => (
          <Fragment key={origin}>
            <link rel="preconnect" href={origin} crossOrigin="" />
            <link rel="dns-prefetch" href={origin} />
          </Fragment>
        ))}
        {/* Inline @font-face rules for LCP-critical weights (bold, regular, book).
            Eliminates the external stylesheet round-trip — the browser starts
            downloading actual font files immediately after parsing this <style>. */}
        {criticalCssFragments.map((fragment, i) => {
          const entry = criticalWebfontEntries[i];
          if (!entry) return null;
          return fragment.startsWith("<link") ? (
            <Fragment key={entry.url}>
              <link rel="preload" href={entry.url} as="style" crossOrigin="" />
              <link key={`critical-css-${i}`} rel="stylesheet" href={entry.url} crossOrigin="" />
            </Fragment>
          ) : (
            <style key={`critical-css-${i}`} dangerouslySetInnerHTML={{ __html: fragment }} />
          );
        })}
        {/* Webfont stylesheets — server-rendered so the browser discovers
            @font-face declarations during HTML parse (all weights + italics). */}
        {webfontUrls.map((url) => (
          <link key={url} rel="stylesheet" href={url} />
        ))}
      </head>
      <body className="font-sans antialiased">
        {/* PB brand `--pb-*` tokens: `theme/config.ts`. Layout & copy vars: `theme/pb-content-guidelines-config.ts`. */}
        <style dangerouslySetInnerHTML={{ __html: pbBrandCssInline() }} suppressHydrationWarning />
        <style
          id="pb-foundations-runtime"
          dangerouslySetInnerHTML={{ __html: pbFoundationsCss }}
          suppressHydrationWarning
        />
        <style
          dangerouslySetInnerHTML={{ __html: pbContentGuidelinesCssInline() }}
          suppressHydrationWarning
        />
        <DeviceTypeProvider>
          <ThemeProvider attribute="class" disableTransitionOnChange>
            <BrowserDataClient />
            <AnalyticsScript />
            <DevelopmentClients />
            <AppLayout>{children}</AppLayout>
          </ThemeProvider>
        </DeviceTypeProvider>
      </body>
    </html>
  );
}
