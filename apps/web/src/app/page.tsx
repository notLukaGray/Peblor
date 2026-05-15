import { promises as fs } from "node:fs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { person } from "@/core/lib/globals";
import { HomeView } from "@/core/ui/HomeView";
import { PersonJsonLd } from "@/core/ui/PersonJsonLd";
import type { HeroProject } from "@/core/lib/globals";
import { resolveHomeMediaUrl } from "@/core/lib/home/home-utils";
import { discoverAllPages } from "@pb/core/load";
import { accessCookieName } from "@/core/lib/auth-constants";
import { verifyAccessToken } from "@/core/lib/access-cookie";
import {
  buildUnlockModalProps,
  isProtectedHref,
  isUnlockEnabled,
  safeRedirectPath,
} from "@/core/lib/unlock-linking";
import { UnlockPageShell } from "@/core/ui/UnlockPageShell";
import { applyPageResourceHints } from "@/core/lib/page-resource-hints";
import homeData from "@content/data/home.json";

async function parseJsonFile(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;
    return parsed != null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

let cachedContentMapsPromise: Promise<{
  hrefBySlug: Map<string, string>;
  ogImageByHref: Map<string, string>;
}> | null = null;

async function buildContentPageMaps(): Promise<{
  hrefBySlug: Map<string, string>;
  ogImageByHref: Map<string, string>;
}> {
  const hrefBySlug = new Map<string, string>();
  const ogImageByHref = new Map<string, string>();
  const pages = (await discoverAllPages()).filter((page) => page.slugSegments[0] !== "dev");
  const pageRecords = await Promise.all(
    pages.map(async (page) => ({ page, data: await parseJsonFile(page.contentPath) }))
  );
  for (const { page, data } of pageRecords) {
    const href = `/${page.slugSegments.join("/")}`;
    const fullSlug = page.slugSegments.join("/");
    hrefBySlug.set(fullSlug, href);
    const shortSlug =
      typeof data?.slug === "string" ? data.slug : page.slugSegments[page.slugSegments.length - 1];
    if (shortSlug && shortSlug !== fullSlug) hrefBySlug.set(shortSlug, href);
    const ogImage = typeof data?.ogImage === "string" ? data.ogImage : null;
    if (ogImage) ogImageByHref.set(href, ogImage);
  }
  return { hrefBySlug, ogImageByHref };
}

async function getContentPageMaps(): Promise<{
  hrefBySlug: Map<string, string>;
  ogImageByHref: Map<string, string>;
}> {
  if (process.env.NODE_ENV === "production") {
    cachedContentMapsPromise ??= buildContentPageMaps().catch((error) => {
      cachedContentMapsPromise = null;
      throw error;
    });
    return cachedContentMapsPromise;
  }
  return buildContentPageMaps();
}

async function attachProjectHrefs(
  projects: HeroProject[],
  hasAccess: boolean
): Promise<HeroProject[]> {
  const { hrefBySlug, ogImageByHref } = await getContentPageMaps();
  const shouldUseModalUnlockLinks = !hasAccess && isUnlockEnabled();

  return projects.map((project) => {
    const href = hrefBySlug.get(project.slug);
    if (!href) return project;
    if (!shouldUseModalUnlockLinks) return { ...project, href };
    if (!isProtectedHref(href)) return { ...project, href };
    const unlockParams = new URLSearchParams();
    unlockParams.set("unlock_redirect", href);
    const preview = ogImageByHref.get(href);
    if (preview) unlockParams.set("unlock_preview", preview);
    return { ...project, href: `/?${unlockParams.toString()}` };
  });
}

function getHomeResourceHints(projects: HeroProject[]) {
  const firstProject = projects[0];
  const posterUrl = resolveHomeMediaUrl(firstProject?.video?.poster);

  return posterUrl
    ? [{ url: posterUrl, as: "image" as const, fetchPriority: "high" as const }]
    : [];
}

type Props = {
  searchParams: Promise<{ unlock_redirect?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const cookieStore = await cookies();
  const hasAccess = verifyAccessToken(cookieStore.get(accessCookieName)?.value);
  const params = await searchParams;
  const redirectUrl = safeRedirectPath(params.unlock_redirect);
  if (hasAccess && redirectUrl) redirect(redirectUrl);
  const unlockModalProps = await buildUnlockModalProps(
    redirectUrl,
    !hasAccess && isUnlockEnabled()
  );
  const heroProjects = await attachProjectHrefs(homeData.heroProjects as HeroProject[], hasAccess);
  applyPageResourceHints(getHomeResourceHints(heroProjects));

  return (
    <UnlockPageShell unlockModalProps={unlockModalProps}>
      {person && <PersonJsonLd person={person} />}
      <HomeView heroProjects={heroProjects} />
    </UnlockPageShell>
  );
}
