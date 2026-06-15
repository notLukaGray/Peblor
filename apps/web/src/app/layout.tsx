import type { Metadata, Viewport } from "next";
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
import {
  getTwitterCardForOgImage,
  siteUrl,
  cdnBase,
  siteMetadata,
  person,
} from "@/core/lib/globals";
import { WebSiteJsonLd } from "@/core/ui/WebSiteJsonLd";
import { OrganizationJsonLd } from "@/core/ui/OrganizationJsonLd";
import { SpeculationRules } from "@/app/speculation-rules";
import { ThemeProvider } from "@/core/providers/theme-provider";
import { AppLayout } from "@/core/ui/app-layout";
import { MotionFeatureProvider } from "@/app/MotionFeatureProvider";
import { ToastIsland } from "@/app/ToastIsland";
import { DeviceTypeProvider } from "@pb/runtime-react/core/providers/device-type-provider";
import { FormActionProvider } from "@pb/runtime-react/core/lib/form-action-context";
import { BrowserDataClient } from "@/app/BrowserDataClient";
import { AnalyticsScript } from "@/app/analytics-script";
import { pbBrandCssInline } from "@/app/theme/config";
import { pbContentGuidelinesCssInline } from "@/app/theme/pb-content-guidelines";
import { pbBrandLight, pbBrandDark } from "@/app/theme/config";
import { serializePbProductionFoundationsCss } from "@/app/theme/pb-foundation-config";
import { rootThemeInlineScript } from "@/app/theme/root-theme-inline-script";
import {
  contactAction,
  newsletterAction,
  waitlistAction,
  eventRegistrationAction,
  feedbackAction,
  jobInquiryAction,
  quoteRequestAction,
  applicationAction,
  rsvpAction,
  unsubscribeAction,
  unlockAction,
} from "@/app/actions";

function getOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch (err) {
    console.warn("[web] Failed to parse URL for origin", value, err);
    return null;
  }
}

const cdnOrigin = getOrigin(cdnBase);
const lightThemeColor = pbBrandLight["--pb-secondary"] ?? "#ffffff";
const darkThemeColor = pbBrandDark["--pb-secondary"] ?? "#000000";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: siteMetadata.title,
  description: siteMetadata.description,
  alternates: { canonical: "./" },
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    type: "website",
    locale: "en_US",
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

// Build once at module level — pure functions of static config; compute once per cold-start.
const pbBrandCss = pbBrandCssInline();
const pbContentGuidelinesCss = pbContentGuidelinesCssInline();

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
const pbFoundationsCss = serializePbProductionFoundationsCss();
// Pure function of static config — compute once per cold-start, not per-render.
const themeScript = rootThemeInlineScript();

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

// Preload critical self-hosted font files (Latin-normal) for the primary font.
// With variable fonts: the manifest entry has weight===0 (single file).
// With discrete weights: preload only the two LCP-critical weights (body 400, headings 700).
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
    // Preload primary (heading/UI) and secondary (body) fonts — both are LCP-critical.
    // Mono font is above-fold on some pages but is display:optional and smaller priority.
    const criticalFamilies = new Set([
      primaryFontConfig.webfont.family,
      secondaryFontConfig.webfont.family,
    ]);
    // Variable font (weight===0) preloads as a single file covering all weights.
    // Discrete weights: preload body 400 + heading 700.
    criticalFontPreloads = manifest.filter(
      (e) =>
        criticalFamilies.has(e.family) &&
        e.style === "normal" &&
        (e.weight === 0 || e.weight === 400 || e.weight === 700)
    );
  } catch (err) {
    console.warn("[web] Font manifest not found (fonts not yet downloaded)", err);
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
  // Theme preference is handled entirely client-side via the inline script in <head>
  // (below). The script reads the "theme" cookie (returning visitors) or falls back
  // to prefers-color-scheme (first visit), applying .light/.dark to <html>
  // synchronously before first paint — no flash, no server-side cookie read needed.
  //
  // The Content-Security-Policy includes a SHA-256 hash for this exact script
  // ('sha256-...'), allowing it to execute without a per-request nonce. This means
  // RootLayout never calls cookies() or headers(), keeping the entire layout shell
  // (nav, footer, HTML structure) fully static for PPR (Partial Prerendering).

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
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={htmlFontClasses || undefined}
    >
      <head>
        {/* Pre-paint theme script — runs before the browser paints any pixels.
            Reads the "theme" cookie (returning visitors) or
            prefers-color-scheme (first visit) and sets .light/.dark on <html>.
            The CSP 'sha256-...' hash allows this inline script without a nonce,
            keeping the layout fully static for PPR. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
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
        {/* Global sitewide JSON-LD structured data: WebSite and Organization
            schemas are injected on every page so search engines always know who
            the entity is and what the site represents. */}
        <WebSiteJsonLd
          name={siteMetadata.title}
          url={siteUrl}
          description={siteMetadata.description}
        />
        <OrganizationJsonLd
          name={person?.name ?? siteMetadata.title}
          url={siteUrl}
          description={siteMetadata.description}
        />
        {/* Speculation Rules API — pre-renders key navigation targets for
            instant page transitions. Nonce omitted because speculationrules
            scripts are not executable JavaScript and the browser applies them
            even under strict CSP.
            @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/speculationrules#security */}
        <SpeculationRules />
        {/* Tell the browser this page supports both color schemes so it can render
            native UI (scrollbars, form controls, etc.) in the right palette before
            any CSS loads. */}
        <meta name="color-scheme" content="light dark" />
        {/* Site author — derived from person config in content/site/person.json. */}
        <meta name="author" content={person?.name ?? "Luka Gray"} />
      </head>
      <body className="font-sans antialiased">
        {/* PB brand `--pb-*` tokens: `theme/config.ts`. Layout & copy vars: `theme/pb-content-guidelines-config.ts`. */}
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
        {/* Preset tab chrome tokens are defined in `globals.css` on `:root` / `.dark`.
            No inline injection needed — the CSS chunk loads synchronously and the vars
            are available before any React hydration. */}
        <MotionFeatureProvider>
          <DeviceTypeProvider>
            <ThemeProvider attribute="class">
              <BrowserDataClient />
              <AnalyticsScript />
              <DevelopmentClients />
              <FormActionProvider
                actions={{
                  contact: contactAction,
                  newsletter: newsletterAction,
                  waitlist: waitlistAction,
                  "event-registration": eventRegistrationAction,
                  feedback: feedbackAction,
                  "job-inquiry": jobInquiryAction,
                  "quote-request": quoteRequestAction,
                  application: applicationAction,
                  rsvp: rsvpAction,
                  unsubscribe: unsubscribeAction,
                  unlock: unlockAction,
                }}
              >
                <AppLayout>{children}</AppLayout>
                <ToastIsland />
              </FormActionProvider>
            </ThemeProvider>
          </DeviceTypeProvider>
        </MotionFeatureProvider>
      </body>
    </html>
  );
}
