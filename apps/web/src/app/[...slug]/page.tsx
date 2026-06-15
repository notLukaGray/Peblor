export const dynamic = "force-static";

import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import type { FilterConfig } from "@pb/contracts";
import { isPageProtected } from "@/core/lib/page-protection";
import { discoverAllPages, getPageMetadataAsync, loadPageMeta } from "@pb/core/load";
import {
  getTwitterCardForOgImage,
  cdnBase,
  siteUrl,
  siteBaseUrl,
  siteMetadata,
  twitterSite,
  twitterCreator,
} from "@/core/lib/globals";
import { getSignedCdnUrl } from "@pb/core/lib/cdn-asset-server";
import { BreadcrumbListJsonLd } from "@/core/ui/BreadcrumbListJsonLd";
import type { BreadcrumbItem } from "@/core/ui/BreadcrumbListJsonLd";
import { Breadcrumbs } from "@/core/ui/Breadcrumbs";
import { WebPageJsonLd } from "@/core/ui/WebPageJsonLd";
import { ArticleJsonLd } from "@/core/ui/ArticleJsonLd";

import { PageContent, getCachedPageAsync } from "./page-content";

type Props = {
  params: Promise<{ slug: string[] }>;
};

function isDevSlug(segments: string[]): boolean {
  return segments[0] === "dev";
}

function shouldDenyDevSlugInProd(segments: string[]): boolean {
  return process.env.NODE_ENV !== "development" && isDevSlug(segments);
}

const getCachedPageMetadata = cache(async (slug: string) => getPageMetadataAsync(slug));

export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  const pages = await discoverAllPages();
  const visibilityChecks = await Promise.all(
    pages.map(async ({ slugSegments }) => ({
      slugSegments,
      meta: await loadPageMeta(slugSegments),
    }))
  );
  return visibilityChecks
    .filter(
      ({ slugSegments, meta }) =>
        !shouldDenyDevSlugInProd(slugSegments) &&
        slugSegments.join("/") !== "unlock" &&
        !isPageProtected(meta) &&
        meta?.visibility !== "unlisted"
    )
    .map(({ slugSegments }) => ({ slug: slugSegments }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: segments } = await params;
  if (!segments?.length) return {};
  if (shouldDenyDevSlugInProd(segments)) return {};

  const slug = segments.join("/");
  const meta = await getCachedPageMetadata(slug);
  if (!meta) return {};

  const {
    title,
    description,
    ogImage,
    canonicalUrl,
    robots,
    keywords,
    passwordProtected,
    visibility,
  } = meta;

  const normalizedCdnBase = cdnBase.replace(/\/+$/, "");
  const ogImageKey = ogImage?.startsWith(normalizedCdnBase)
    ? ogImage.slice(normalizedCdnBase.length).replace(/^\/+/, "")
    : null;
  const signedOgImage = ogImageKey ? getSignedCdnUrl(ogImageKey) : ogImage;

  const effectiveRobots =
    passwordProtected || visibility === "protected" ? "noindex, follow" : robots;

  const effectiveOgImage = signedOgImage
    ? signedOgImage
    : siteUrl
      ? `${siteUrl}/og?title=${encodeURIComponent(title)}`
      : undefined;

  const effectiveUrl = siteUrl ? `${siteBaseUrl}/${slug}` : undefined;

  return {
    title,
    ...(description && { description }),
    ...(keywords && { keywords }),
    ...(effectiveRobots && { robots: effectiveRobots }),
    ...(canonicalUrl && { alternates: { canonical: canonicalUrl } }),
    openGraph: {
      title,
      ...(description && { description }),
      type: "website",
      locale: "en_US",
      siteName: siteMetadata.title,
      ...(effectiveUrl ? { url: effectiveUrl } : {}),
      ...(effectiveOgImage
        ? {
            images: [
              {
                url: effectiveOgImage,
                width: 1200,
                height: 630,
                alt: title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: getTwitterCardForOgImage(effectiveOgImage),
      title,
      ...(description && { description }),
      ...(twitterSite ? { site: twitterSite } : {}),
      ...(twitterCreator ? { creator: twitterCreator } : {}),
      ...(effectiveOgImage ? { images: [effectiveOgImage] } : {}),
    },
  };
}

export default async function UniversalSlugPage({ params }: Props) {
  const { slug: segments } = await params;
  if (!segments?.length) notFound();
  if (shouldDenyDevSlugInProd(segments)) notFound();
  const slug = segments.join("/");
  const pagePath = `/${slug}`;

  // Pre-warm the page data cache so PageContent gets a cache hit.
  void getCachedPageAsync(slug).catch(() => {});

  const metadata = await getCachedPageMetadata(slug);
  const filterConfig = metadata?.filterConfig as FilterConfig | undefined;

  const breadcrumbItems: BreadcrumbItem[] = [];
  if (segments.length > 0) {
    breadcrumbItems.push({ name: "Home", url: siteUrl || "/" });
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i] as string;
      const path = `/${segments.slice(0, i + 1).join("/")}`;
      const displayName = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const breadcrumbUrl = siteBaseUrl
        ? `${siteBaseUrl}${path}`
        : i === segments.length - 1
          ? `/${segments.join("/")}`
          : path;
      breadcrumbItems.push({ name: displayName, url: breadcrumbUrl });
    }
  }

  const isArticle = segments[0] === "research" && segments.length > 1;
  const pageUrl = siteUrl ? `${siteBaseUrl}/${slug}` : `/${slug}`;
  const pageTitle = metadata?.title ?? "";
  const pageDescription = metadata?.description;

  return (
    <>
      <BreadcrumbListJsonLd items={breadcrumbItems} />
      {isArticle ? (
        <ArticleJsonLd headline={pageTitle} description={pageDescription} url={pageUrl} />
      ) : (
        <WebPageJsonLd url={pageUrl} name={pageTitle} description={pageDescription} />
      )}
      <Breadcrumbs segments={segments} />
      <PageContent
        slug={slug}
        pagePath={pagePath}
        isMobile={false}
        viewportWidthPx={null}
        nonce={undefined}
        hasAccess={false}
        unlockEnabled={false}
        isUnlockPage={false}
        query={{}}
        filterConfig={filterConfig}
      />
    </>
  );
}
