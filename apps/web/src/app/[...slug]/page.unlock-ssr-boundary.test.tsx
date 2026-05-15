import { describe, expect, it, vi } from "vitest";

const getPageAsync = vi.fn(async () => null);
const getPeblorPropsAsync = vi.fn(async () => null);

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/navigation", () => ({ notFound: () => undefined }));
vi.mock("@/core/lib/auth-constants", () => ({ accessCookieName: "access" }));
vi.mock("@/core/lib/browser-data-cookie", () => ({
  parseBrowserDataCookie: () => null,
  browserDataCookieName: "browser",
}));
vi.mock("@/core/lib/access-cookie", () => ({ verifyAccessToken: () => false }));
vi.mock("@/core/lib/unlock-linking", () => ({
  buildUnlockModalProps: () => ({ open: true }),
  getSafeUnlockPreviewUrl: () => null,
  getSingleQueryValue: () => null,
  isUnlockEnabled: () => true,
  rewriteProtectedInternalLinks: (x: unknown) => x,
  safeRedirectPath: () => null,
}));
vi.mock("@/core/lib/parse-page-filters", () => ({ parseFiltersFromQuery: () => ({}) }));
vi.mock("@/core/lib/protected-slugs.generated", () => ({
  PROTECTED_PAGE_PATHS: new Set<string>(),
}));
vi.mock("@/core/lib/globals", () => ({ getTwitterCardForOgImage: () => "summary", cdnBase: "" }));
vi.mock("@pb/core/lib/cdn-asset-server", () => ({ getSignedCdnUrl: (x: string) => x }));
vi.mock("@/core/ui/UnlockPageShell", () => ({
  UnlockPageShell: () => <div data-testid="unlock-shell" />,
}));

vi.mock("@pb/core/load", () => ({
  discoverAllPages: () => [],
  loadPageMeta: () => null,
  loadPageVisibilityOnly: () => ({ visibility: "protected" }),
  resolvePagePath: () => "/tmp/protected/index.json",
  getPageAsync,
  getPeblorPropsAsync,
  getPageMetadataAsync: () => null,
}));
vi.mock("@pb/core/util", () => ({
  isMobileFromUserAgent: () => false,
}));
vi.mock("@pb/core/validate", () => ({
  PageContentValidationError: class PageContentValidationError extends Error {},
}));

describe("[...slug] unlock SSR boundary", () => {
  it("returns unlock shell before full page load for locked protected pages", async () => {
    // Ensure clean module state before dynamic import in parallel test suites.
    vi.resetModules();
    const { default: UniversalSlugPage } = await import("./page");
    const result = await UniversalSlugPage({
      params: Promise.resolve({ slug: ["work", "protected-page"] }),
      searchParams: Promise.resolve({}),
    });
    expect(result).toBeTruthy();
    expect(getPageAsync).not.toHaveBeenCalled();
    expect(getPeblorPropsAsync).not.toHaveBeenCalled();
  });
});
