import { cookies, headers } from "next/headers";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import type { FilterConfig } from "@pb/contracts";
import { accessCookieName } from "@/core/lib/auth-constants";
import { parseBrowserDataCookie, browserDataCookieName } from "@/core/lib/browser-data-cookie";
import { verifyAccessToken } from "@/core/lib/access-cookie";
import {
  buildUnlockModalProps,
  getSafeUnlockPreviewUrl,
  getSingleQueryValue,
  isUnlockEnabled,
  rewriteProtectedInternalLinks,
  safeRedirectPath,
} from "@/core/lib/unlock-linking";
import { parseFiltersFromQuery } from "@/core/lib/parse-page-filters";
import { isPageProtected } from "@/core/lib/page-protection";
import { PROTECTED_PAGE_PATHS } from "@/core/lib/protected-slugs.generated";
import {
  getPageAsync,
  getPeblorPropsAsync,
  getPageMetadataAsync,
  discoverAllPages,
  loadPageMeta,
  loadPageVisibilityOnly,
} from "@pb/core/load";
import { isMobileFromUserAgent } from "@pb/core/util";
import { PageContentValidationError } from "@pb/core/validate";
import { PeblorServerPage } from "@pb/runtime-react/server";
import { getTwitterCardForOgImage, cdnBase } from "@/core/lib/globals";
import { getSignedCdnUrl } from "@pb/core/lib/cdn-asset-server";
import { UnlockPageShell } from "@/core/ui/UnlockPageShell";
import { PageViewTracker } from "./analytics-tracker";
import { trackServer } from "@/core/lib/analytics";
import {
  applyPageResourceHints,
  collectInitialPageResourceHints,
} from "@/core/lib/page-resource-hints";

type SearchParamsRaw = Record<string, string | string[] | undefined>;

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<SearchParamsRaw>;
};

export const revalidate = 300;

function isDevSlug(segments: string[]): boolean {
  return segments[0] === "dev";
}

function shouldDenyDevSlugInProd(segments: string[]): boolean {
  return process.env.NODE_ENV !== "development" && isDevSlug(segments);
}

const getCachedPageMetadata = cache(async (slug: string) => getPageMetadataAsync(slug));
function hasUnlockQuery(value: unknown): boolean {
  if (typeof value === "string") return value === "1";
  if (Array.isArray(value)) return value.length === 1 && value[0] === "1";
  return false;
}

function buildPageRenderKey(pathname: string, query: SearchParamsRaw): string {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue == null) continue;
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) params.append(key, value);
      continue;
    }
    params.append(key, rawValue);
  }
  const queryString = params.toString();
  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}

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
        !isPageProtected(meta) &&
        meta?.visibility !== "unlisted"
    )
    .map(({ slugSegments }) => ({ slug: slugSegments }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug: segments } = await params;
  if (!segments?.length) return {};
  if (shouldDenyDevSlugInProd(segments)) return {};

  const query = await searchParams;
  const isUnlockRoute = segments.length === 1 && segments[0] === "unlock";
  const redirectTarget = isUnlockRoute
    ? safeRedirectPath(getSingleQueryValue(query.unlock_redirect))
    : null;
  const redirectSlug = redirectTarget?.replace(/^\/+/, "");
  const validRedirect =
    redirectSlug && PROTECTED_PAGE_PATHS.has(redirectSlug) ? redirectSlug : null;
  const effectiveSlug = validRedirect ?? segments.join("/");

  const meta = await getCachedPageMetadata(effectiveSlug);
  if (!meta) return {};

  const {
    title,
    description,
    ogImage,
    canonicalUrl,
    robots,
    keywords,
    filterConfig,
    passwordProtected,
    visibility,
  } = meta;

  const activeFilters = parseFiltersFromQuery(query, filterConfig as FilterConfig | undefined);
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  const normalizedCdnBase = cdnBase.replace(/\/+$/, "");
  const ogImageKey = ogImage?.startsWith(normalizedCdnBase)
    ? ogImage.slice(normalizedCdnBase.length).replace(/^\/+/, "")
    : null;
  const signedOgImage = ogImageKey ? getSignedCdnUrl(ogImageKey) : ogImage;

  const effectiveRobots = isUnlockRoute
    ? "noindex, follow"
    : passwordProtected || visibility === "protected"
      ? "noindex, follow"
      : hasActiveFilters
        ? "noindex, follow"
        : robots;
  const effectiveCanonical = isUnlockRoute
    ? null
    : hasActiveFilters
      ? `/${segments.join("/")}`
      : canonicalUrl;

  return {
    title,
    ...(description && { description }),
    ...(keywords && { keywords }),
    ...(effectiveRobots && { robots: effectiveRobots }),
    ...(effectiveCanonical && { alternates: { canonical: effectiveCanonical } }),
    openGraph: {
      title,
      ...(description && { description }),
      ...(signedOgImage && { images: [signedOgImage] }),
    },
    twitter: {
      card: getTwitterCardForOgImage(ogImage),
      title,
      ...(description && { description }),
      ...(signedOgImage && { images: [signedOgImage] }),
    },
  };
}

export default async function UniversalSlugPage({ params, searchParams }: Props) {
  const { slug: segments } = await params;
  if (!segments?.length) notFound();
  if (shouldDenyDevSlugInProd(segments)) notFound();
  const slug = segments.join("/");

  const query = await searchParams;
  const isUnlockRoute = segments.length === 1 && segments[0] === "unlock";

  const pageMeta = await loadPageVisibilityOnly(segments);
  if (!pageMeta) notFound();
  const isProtectedPage = isPageProtected(pageMeta);
  const headersList = await headers();

  const needsCookies =
    isUnlockRoute ||
    isProtectedPage ||
    hasUnlockQuery(query.unlock) ||
    typeof getSingleQueryValue(query.unlock_redirect) === "string";

  const cookieStore = needsCookies ? await cookies() : null;
  const hasAccess = cookieStore
    ? verifyAccessToken(cookieStore.get(accessCookieName)?.value)
    : false;
  const unlockRedirect = safeRedirectPath(getSingleQueryValue(query.unlock_redirect));
  if (hasAccess && unlockRedirect) redirect(unlockRedirect);
  if (isUnlockRoute && hasAccess) redirect("/");

  const isProtectedAndLocked = isProtectedPage && !hasAccess;
  if (isProtectedAndLocked) {
    const pagePath = `/${segments.join("/")}`;
    trackServer("protected_page_redirected", { pagePath });
    const unlockModalProps = await buildUnlockModalProps(pagePath, isUnlockEnabled());
    return (
      <UnlockPageShell
        unlockModalProps={unlockModalProps}
        hideChildrenWhenModalOpen
        closeOnOverlayClick
        unlockPreview={null}
        showPreviewBackground={false}
        structuredData={null}
      >
        {null}
      </UnlockPageShell>
    );
  }

  let page;
  try {
    page = await getPageAsync(slug);
  } catch (err) {
    if (err instanceof PageContentValidationError) {
      console.error(`[page] ${err.message}\n${err.format()}`);
      notFound();
    }
    throw err;
  }
  const isMobile = isMobileFromUserAgent(headersList?.get("user-agent") ?? "");
  const browserData = cookieStore
    ? parseBrowserDataCookie(cookieStore.get(browserDataCookieName)?.value)
    : null;

  // Canonical breakpoint: ignore stale or implausible viewport cookies.
  // Derive one breakpoint from UA and pass it to both expansion and runtime providers.
  const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  // eslint-disable-next-line react-hooks/purity -- server component runs once per request
  const now = Date.now();
  const cookieIsFresh =
    browserData?.updatedAtMs != null &&
    browserData.updatedAtMs > 0 &&
    now - browserData.updatedAtMs < COOKIE_MAX_AGE_MS;
  const cookieViewportPlausible =
    cookieIsFresh &&
    browserData?.viewportWidthPx != null &&
    browserData.viewportWidthPx > 0 &&
    // If UA says mobile but cookie says desktop-width, cookie is implausible
    (isMobile ? browserData.viewportWidthPx < 1024 : browserData.viewportWidthPx >= 768);
  const canonicalViewportWidth = cookieViewportPlausible ? browserData?.viewportWidthPx : undefined;
  const metadata = await getCachedPageMetadata(slug);
  const filterConfig = metadata?.filterConfig as FilterConfig | undefined;
  const activeFilters = parseFiltersFromQuery(query, filterConfig);
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  let props;
  try {
    props = await getPeblorPropsAsync(slug, {
      isMobile,
      ...(canonicalViewportWidth != null ? { viewportWidthPx: canonicalViewportWidth } : {}),
      ...(hasActiveFilters ? { activeFilters } : {}),
    });
  } catch (err) {
    if (err instanceof PageContentValidationError) {
      console.error(`[page] ${err.message}\n${err.format()}`);
      notFound();
    }
    throw err;
  }
  if (!props) notFound();

  const structuredData = (page as { structuredData?: unknown } | null)?.structuredData ?? null;
  const unlockPreview = getSafeUnlockPreviewUrl(getSingleQueryValue(query.unlock_preview));
  const showUnlockModalOnProtectedPage = hasUnlockQuery(query.unlock) && isUnlockEnabled();
  const showUnlockModalOnCurrentPage = !hasAccess && Boolean(unlockRedirect) && isUnlockEnabled();
  const showUnlockModalOnUnlockPage = isUnlockRoute && !hasAccess && isUnlockEnabled();
  const showUnlockModal =
    showUnlockModalOnProtectedPage || showUnlockModalOnCurrentPage || showUnlockModalOnUnlockPage;
  const pagePath = `/${segments.join("/")}`;
  const unlockTarget = showUnlockModalOnCurrentPage
    ? (unlockRedirect as string)
    : showUnlockModalOnUnlockPage
      ? (unlockRedirect ?? "/")
      : pagePath;

  const unlockModalProps = await buildUnlockModalProps(unlockTarget, showUnlockModal);
  const shouldRewriteProtectedLinks = needsCookies && !hasAccess && isUnlockEnabled();
  const sectionsForRenderBase = isUnlockRoute ? [] : (props.resolvedSections ?? []);
  const sectionsForRender = shouldRewriteProtectedLinks
    ? rewriteProtectedInternalLinks(sectionsForRenderBase, pagePath)
    : sectionsForRenderBase;
  const pagePropsForRender = { ...props, resolvedSections: sectionsForRender };

  const shouldRenderProtectedContent = !showUnlockModalOnProtectedPage;
  const structuredDataForRender = shouldRenderProtectedContent ? structuredData : null;
  const pageRenderKey = buildPageRenderKey(pagePath, query);
  const resourceHints = shouldRenderProtectedContent
    ? collectInitialPageResourceHints({
        resolvedBg: pagePropsForRender.resolvedBg,
        resolvedSections: pagePropsForRender.resolvedSections,
        overlaySections: pagePropsForRender.overlaySections,
      })
    : [];
  applyPageResourceHints(resourceHints);

  return (
    <UnlockPageShell
      unlockModalProps={unlockModalProps}
      hideChildrenWhenModalOpen={showUnlockModalOnProtectedPage}
      closeOnOverlayClick={!isUnlockRoute}
      unlockPreview={isUnlockRoute ? null : unlockPreview}
      showPreviewBackground={false}
      solidBackdropClassName={isUnlockRoute ? "fixed inset-0 -z-10 bg-background" : undefined}
      structuredData={structuredDataForRender}
    >
      <PageViewTracker path={pagePath} title={(page as { title?: string } | null)?.title} />
      {shouldRenderProtectedContent ? (
        <PeblorServerPage key={pageRenderKey} {...pagePropsForRender} />
      ) : null}
    </UnlockPageShell>
  );
}
