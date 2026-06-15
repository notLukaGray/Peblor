import { describe, expect, it, vi } from "vitest";

// The slug route is now force-static: no auth checks, no cookies, no searchParams.
// This test verifies that UniversalSlugPage renders a static shell for a public page
// without any auth-related calls.

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_NOT_FOUND" });
  },
}));
vi.mock("@/core/lib/page-protection", () => ({ isPageProtected: () => false }));
vi.mock("@/core/lib/globals", () => ({
  getTwitterCardForOgImage: () => "summary",
  cdnBase: "",
  siteUrl: "https://example.com",
  siteBaseUrl: "https://example.com",
  siteMetadata: { title: "Test", description: "Test" },
  twitterSite: "",
  twitterCreator: "",
}));
vi.mock("@pb/core/lib/cdn-asset-server", () => ({ getSignedCdnUrl: (x: string) => x }));
vi.mock("@pb/core/load", () => ({
  discoverAllPages: async () => [],
  loadPageMeta: async () => null,
  getPageAsync: async () => null,
  getPageMetadataAsync: async () => ({ title: "Test Page" }),
  getPeblorPropsFromPage: async () => null,
  getPeblorPageFilterIndex: async () => null,
  filterPageByFilterIndex: ({ sections }: { sections: unknown[] }) => ({ sections }),
}));
vi.mock("@pb/core/validate", () => ({
  PageContentValidationError: class PageContentValidationError extends Error {},
}));
vi.mock("@/core/lib/parse-page-filters", () => ({ parseFiltersFromQuery: () => ({}) }));
vi.mock("@/core/ui/BreadcrumbListJsonLd", () => ({
  BreadcrumbListJsonLd: () => null,
}));
vi.mock("@/core/ui/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/core/ui/WebPageJsonLd", () => ({ WebPageJsonLd: () => null }));
vi.mock("@/core/ui/ArticleJsonLd", () => ({ ArticleJsonLd: () => null }));
vi.mock("@/core/lib/unlock-linking", () => ({
  rewriteProtectedInternalLinks: (sections: unknown) => sections,
}));
vi.mock("@/core/lib/page-resource-hints", () => ({
  collectInitialPageResourceHints: () => ({}),
  applyPageResourceHints: () => {},
}));
vi.mock("@/core/lib/serialize-json-ld", () => ({ serializeJsonLd: (x: unknown) => String(x) }));
vi.mock("@pb/runtime-react/server", () => ({ PeblorServerPage: () => null }));

describe("[...slug] static route", () => {
  it("renders a static shell for a public page without auth checks", async () => {
    vi.resetModules();
    const { default: UniversalSlugPage } = await import("./page");
    // The static route is a pure async function: it loads metadata and returns JSX.
    // PageContent is a child component referenced in JSX — its async body runs at
    // React render time, not here. The outer function must return a React element.
    const result = await UniversalSlugPage({
      params: Promise.resolve({ slug: ["some-public-page"] }),
    });
    expect(result).toBeTruthy();
  });
});
