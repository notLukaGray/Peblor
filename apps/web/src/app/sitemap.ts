import { promises as fs } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { discoverAllPages } from "@pb/core/load";
import { siteBaseUrl } from "@/core/lib/globals";
import { isPageIndexable } from "@/core/lib/page-protection";

type SitemapChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

type SitemapOverride = {
  changeFrequency?: SitemapChangeFrequency;
  priority?: number;
};

const CHANGE_FREQUENCIES = new Set<SitemapChangeFrequency>([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
]);
const APP_DIR = path.join(process.cwd(), "src/app");
const STATIC_APP_ROUTE_EXCLUDES = new Set(["api", "dev"]);

async function parseJsonFile(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;
    return parsed != null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch (err) {
    console.warn("[web] Failed to read page file for sitemap", filePath, err);
    return null;
  }
}

/** Read the file's mtime as a proxy for last-modified date. */
async function getFileModifiedDate(filePath: string): Promise<Date> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime;
  } catch (err) {
    console.warn("[web] Failed to stat file for sitemap lastModified", filePath, err);
    return new Date();
  }
}

function readSitemapOverride(value: unknown): SitemapOverride | false | null {
  if (value === false) return false;
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    ...(CHANGE_FREQUENCIES.has(record.changeFrequency as SitemapChangeFrequency) && {
      changeFrequency: record.changeFrequency as SitemapChangeFrequency,
    }),
    ...(typeof record.priority === "number" && { priority: record.priority }),
  };
}

function defaultChangeFrequency(depth: number): SitemapChangeFrequency {
  return depth <= 1 ? "weekly" : "monthly";
}

function defaultPriority(depth: number): number {
  if (depth === 0) return 1;
  return depth === 1 ? 0.8 : 0.7;
}

function toSitemapUrl(base: string, pathname: string): string {
  return `${base}${pathname === "/" ? "" : pathname}`;
}

function isPublicStaticAppSegment(segment: string): boolean {
  return (
    !segment.startsWith("_") &&
    !segment.startsWith(".") &&
    !segment.startsWith("[") &&
    !STATIC_APP_ROUTE_EXCLUDES.has(segment)
  );
}

async function discoverStaticAppRoutes(
  dir: string = APP_DIR,
  segments: string[] = []
): Promise<string[]> {
  let children: string[];
  try {
    children = await fs.readdir(dir);
  } catch (err) {
    console.warn("[web] Failed to read app directory for sitemap routes", dir, err);
    return [];
  }

  const routes: string[] = [];
  if (segments.length > 0 && (children.includes("page.tsx") || children.includes("page.ts"))) {
    routes.push(`/${segments.join("/")}`);
  }

  for (const child of children) {
    if (!isPublicStaticAppSegment(child)) continue;
    const childPath = path.join(dir, child);
    let st;
    try {
      st = await fs.stat(childPath);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    routes.push(...(await discoverStaticAppRoutes(childPath, [...segments, child])));
  }

  return routes;
}

/**
 * Extract the best candidate image URL for image sitemap entries.
 * Checks ogImage first, then falls back to the background definition.
 */
function extractImageForSitemap(data: Record<string, unknown>): string | null {
  const ogImage = typeof data.ogImage === "string" && data.ogImage ? data.ogImage : null;
  if (ogImage) return ogImage;

  const bgKey = typeof data.bgKey === "string" ? data.bgKey : null;
  if (bgKey && typeof data.definitions === "object" && data.definitions != null) {
    const defs = data.definitions as Record<string, unknown>;
    const bgDef = defs[bgKey] as Record<string, unknown> | undefined;
    if (bgDef) {
      const bgValue =
        typeof bgDef.image === "string"
          ? bgDef.image
          : typeof bgDef.poster === "string"
            ? bgDef.poster
            : null;
      if (bgValue) return bgValue;
    }
  }

  return null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl || process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!base) {
    console.warn("[peblor] sitemap: NEXT_PUBLIC_SITE_URL is not set; sitemap will be empty.");
    return [];
  }

  // Root page — hardcoded page.tsx, no content JSON; use file mtime
  const homepagePath = path.join(APP_DIR, "page.tsx");
  const homepageMtime = await getFileModifiedDate(homepagePath);

  const entries: MetadataRoute.Sitemap = [
    {
      url: toSitemapUrl(base, "/"),
      lastModified: homepageMtime,
      changeFrequency: defaultChangeFrequency(0),
      priority: defaultPriority(0),
    },
  ];

  // Content pages
  const pages = (await discoverAllPages()).filter((page) => page.slugSegments[0] !== "dev");
  const pageRecords = await Promise.all(
    pages.map(async (page) => ({
      page,
      data: await parseJsonFile(page.contentPath),
      mtime: await getFileModifiedDate(page.contentPath),
    }))
  );
  for (const { page, data, mtime } of pageRecords) {
    if (page.slugSegments[0] === "dev") continue;
    if (data == null || !isPageIndexable(data)) continue;
    const override = readSitemapOverride(data.sitemap);
    if (override === false) continue;

    const pathname = `/${page.slugSegments.join("/")}`;
    const depth = page.slugSegments.length;
    const image = extractImageForSitemap(data);

    entries.push({
      url: toSitemapUrl(base, pathname),
      lastModified: mtime,
      changeFrequency: override?.changeFrequency ?? defaultChangeFrequency(depth),
      priority: override?.priority ?? defaultPriority(depth),
      ...(image && { images: [image] }),
    });
  }

  // Static app routes
  const existingUrls = new Set(entries.map((entry) => entry.url));
  for (const pathname of await discoverStaticAppRoutes()) {
    const url = toSitemapUrl(base, pathname);
    if (existingUrls.has(url)) continue;
    if (pathname.split("/").some((seg) => seg.includes("[") || seg.includes("]"))) continue;

    const routeDir = path.join(APP_DIR, ...pathname.split("/").filter(Boolean));
    const pagePathTsx = path.join(routeDir, "page.tsx");
    const pagePathTs = path.join(routeDir, "page.ts");
    const pagePath = await fs
      .stat(pagePathTsx)
      .then(() => pagePathTsx)
      .catch(() => pagePathTs);
    const mtime = await getFileModifiedDate(pagePath);

    entries.push({
      url,
      lastModified: mtime,
      changeFrequency: defaultChangeFrequency(1),
      priority: defaultPriority(1),
    });
  }

  return entries;
}
