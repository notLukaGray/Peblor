import { cache } from "react";
import { notFound } from "next/navigation";

import type { FilterConfig } from "@pb/contracts";
import {
  getPageAsync,
  filterPageByFilterIndex,
  getPeblorPageFilterIndex,
  getPeblorPropsFromPage,
} from "@pb/core/load";
import { PageContentValidationError } from "@pb/core/validate";
import { PeblorServerPage } from "@pb/runtime-react/server";
import { parseFiltersFromQuery } from "@/core/lib/parse-page-filters";
import { rewriteProtectedInternalLinks } from "@/core/lib/unlock-linking";
import {
  applyPageResourceHints,
  collectInitialPageResourceHints,
} from "@/core/lib/page-resource-hints";
import { serializeJsonLd } from "@/core/lib/serialize-json-ld";

type SearchParamsRaw = Record<string, string | string[] | undefined>;

export const getCachedPageAsync = cache(async (slug: string) => getPageAsync(slug));

export function PageSkeleton() {
  return (
    <div className="w-full animate-pulse" role="status" aria-label="Loading page content">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-24">
        <div className="h-12 w-3/4 max-w-xl rounded bg-foreground/10" />
        <div className="h-5 w-1/2 max-w-md rounded bg-foreground/10" />
        <div className="mt-4 h-11 w-36 rounded-full bg-foreground/10" />
      </div>
      <div className="mx-auto max-w-3xl space-y-12 px-4 py-16">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-7 w-1/3 rounded bg-foreground/10" />
            <div className="h-4 w-full rounded bg-foreground/10" />
            <div className="h-4 w-5/6 rounded bg-foreground/10" />
            <div className="h-4 w-2/3 rounded bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export async function PageContent({
  slug,
  pagePath,
  isMobile,
  viewportWidthPx,
  nonce,
  hasAccess,
  unlockEnabled,
  isUnlockPage,
  query,
  filterConfig,
}: {
  slug: string;
  pagePath: string;
  isMobile: boolean;
  viewportWidthPx: number | null;
  nonce: string | undefined;
  hasAccess: boolean;
  unlockEnabled: boolean;
  isUnlockPage: boolean;
  query: SearchParamsRaw;
  filterConfig: FilterConfig | undefined;
}) {
  let page;
  try {
    page = await getCachedPageAsync(slug);
  } catch (err) {
    if (err instanceof PageContentValidationError) {
      console.error(`[page] ${err.message}\n${err.format()}`);
      notFound();
    }
    throw err;
  }

  const activeFilters = parseFiltersFromQuery(query, filterConfig);
  const filterIndex = isUnlockPage ? null : await getPeblorPageFilterIndex(page);

  let props;
  try {
    props = await getPeblorPropsFromPage(page, slug, {
      isMobile,
      ...(viewportWidthPx != null ? { viewportWidthPx } : {}),
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
  const shouldRewriteProtectedLinks = !hasAccess && unlockEnabled;
  const sectionsForRenderBase = isUnlockPage ? [] : (props.resolvedSections ?? []);
  const sectionsForRender = shouldRewriteProtectedLinks
    ? rewriteProtectedInternalLinks(sectionsForRenderBase, pagePath)
    : sectionsForRenderBase;
  const initiallyFilteredSections = filterIndex
    ? filterPageByFilterIndex({
        sections: sectionsForRender,
        filterIndex,
        activeFilters,
      }).sections
    : sectionsForRender;
  const pagePropsForRender = {
    ...props,
    resolvedSections: initiallyFilteredSections,
  };

  const resourceHints = collectInitialPageResourceHints({
    resolvedBg: pagePropsForRender.resolvedBg,
    resolvedSections: pagePropsForRender.resolvedSections,
    overlaySections: pagePropsForRender.overlaySections,
  });
  applyPageResourceHints(resourceHints);

  return (
    <>
      {structuredData != null ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: (() => {
              try {
                return serializeJsonLd(structuredData);
              } catch {
                return "";
              }
            })(),
          }}
        />
      ) : null}
      <PeblorServerPage key={pagePath} {...pagePropsForRender} nonce={nonce} />
    </>
  );
}
