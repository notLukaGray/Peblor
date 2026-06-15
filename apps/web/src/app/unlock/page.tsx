export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { accessCookieName } from "@/core/lib/auth-constants";
import {
  parseBrowserDataCookie,
  browserDataCookieName,
  canonicalViewportWidthFromCookie,
} from "@/core/lib/browser-data-cookie";
import { resolveServerIsMobile } from "@/core/lib/resolve-server-is-mobile";
import { verifyAccessToken } from "@/core/lib/access-cookie";
import {
  buildUnlockModalProps,
  getSafeUnlockPreviewUrl,
  getSingleQueryValue,
  isUnlockEnabled,
  safeRedirectPath,
} from "@/core/lib/unlock-linking";
import { resolveUnlockState } from "@/core/lib/unlock-state";
import { isPageProtected } from "@/core/lib/page-protection";
import { PROTECTED_PAGE_PATHS } from "@/core/lib/protected-slugs.generated";
import { loadPageVisibilityOnly, getPageMetadataAsync } from "@pb/core/load";
import { UnlockPageShell } from "@/core/ui/UnlockPageShell";
import { trackServer } from "@/core/lib/analytics";
import { siteMetadata } from "@/core/lib/globals";
import { PageViewTracker } from "../[...slug]/analytics-tracker";
import { PageContent, PageSkeleton } from "../[...slug]/page-content";

type SearchParamsRaw = Record<string, string | string[] | undefined>;

type Props = {
  searchParams: Promise<SearchParamsRaw>;
};

function hasUnlockQuery(value: unknown): boolean {
  if (typeof value === "string") return value === "1";
  if (Array.isArray(value)) return value.length === 1 && value[0] === "1";
  return false;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await searchParams;
  const unlockRedirect = safeRedirectPath(getSingleQueryValue(query.unlock_redirect));
  const redirectSlug = unlockRedirect?.replace(/^\/+/, "");
  const validRedirect =
    redirectSlug && PROTECTED_PAGE_PATHS.has(redirectSlug) ? redirectSlug : null;

  // Return generic metadata whether or not there's a redirect target — never leak
  // the protected page's title/description via OG tags or social previews.
  void validRedirect;
  return {
    title: "Unlock",
    robots: "noindex, follow",
    openGraph: {
      title: "Unlock",
      type: "website",
      locale: "en_US",
      siteName: siteMetadata.title,
    },
    twitter: {
      card: "summary" as const,
      title: "Unlock",
    },
  };
}

export default function UnlockPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DynamicUnlockContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DynamicUnlockContent({ searchParams }: { searchParams: Promise<SearchParamsRaw> }) {
  const { cookies, headers } = await import("next/headers");
  const headersList = await headers();
  const cookieStore = await cookies();
  const query = await searchParams;

  const segments = ["unlock"];
  const slug = "unlock";
  const pagePath = "/unlock";

  const pageMeta = await loadPageVisibilityOnly(segments);
  if (!pageMeta) notFound();

  const hasAccess = cookieStore
    ? verifyAccessToken(cookieStore.get(accessCookieName)?.value)
    : false;
  const unlockRedirect = safeRedirectPath(getSingleQueryValue(query.unlock_redirect));
  const unlockState = resolveUnlockState({
    isEnabled: isUnlockEnabled(),
    hasAccess,
    isProtected: isPageProtected(pageMeta),
    isUnlockRoute: true,
    unlockRedirect,
  });

  if (unlockState.mode === "unlocked") {
    if (unlockRedirect) redirect(unlockRedirect);
    redirect("/");
  }

  if (unlockState.mode === "password-required") {
    trackServer("protected_page_redirected", { pagePath });
    const unlockModalProps = await buildUnlockModalProps(pagePath, true);
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

  const browserData = cookieStore
    ? parseBrowserDataCookie(cookieStore.get(browserDataCookieName)?.value)
    : null;
  const canonicalViewportWidth = canonicalViewportWidthFromCookie(browserData);
  const isMobile = resolveServerIsMobile(
    headersList?.get("user-agent") ?? "",
    canonicalViewportWidth
  );

  const metadata = await getPageMetadataAsync(slug);
  const pageTitle = metadata?.title ?? undefined;

  const isUnlockPage = unlockState.mode === "unlock-page";

  const showModalFromQuery = hasUnlockQuery(query.unlock) && isUnlockEnabled();
  const showUnlockModalOnRedirect = !hasAccess && Boolean(unlockRedirect) && isUnlockEnabled();
  const showUnlockModal = isUnlockPage || showModalFromQuery || showUnlockModalOnRedirect;
  const hidePageContent = showModalFromQuery;

  const unlockTarget =
    unlockState.mode === "unlock-page"
      ? ((unlockState as { mode: "unlock-page"; redirect: string | null }).redirect ?? "/")
      : showUnlockModalOnRedirect
        ? (unlockRedirect as string)
        : pagePath;

  const unlockModalProps = await buildUnlockModalProps(unlockTarget, showUnlockModal);
  const unlockPreview = getSafeUnlockPreviewUrl(getSingleQueryValue(query.unlock_preview));

  return (
    <UnlockPageShell
      unlockModalProps={unlockModalProps}
      hideChildrenWhenModalOpen={hidePageContent}
      closeOnOverlayClick={!isUnlockPage}
      unlockPreview={isUnlockPage ? null : unlockPreview}
      showPreviewBackground={false}
      solidBackdropClassName={isUnlockPage ? "fixed inset-0 -z-10 bg-background" : undefined}
      structuredData={null}
    >
      <PageViewTracker path={pagePath} title={pageTitle} />
      {hidePageContent ? null : (
        <PageContent
          slug={slug}
          pagePath={pagePath}
          isMobile={isMobile}
          viewportWidthPx={canonicalViewportWidth ?? null}
          nonce={headersList?.get("x-nonce") ?? undefined}
          hasAccess={hasAccess}
          unlockEnabled={isUnlockEnabled()}
          isUnlockPage={isUnlockPage}
          query={query}
          filterConfig={undefined}
        />
      )}
    </UnlockPageShell>
  );
}
