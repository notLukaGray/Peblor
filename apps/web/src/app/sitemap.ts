import { promises as fs } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { discoverAllPages } from "@pb/core/load";
import { siteUrl } from "@/core/lib/globals";
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
const STATIC_APP_ROUTE_EXCLUDES = new Set(["api", "dev", "playground"]);

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
  } catch {
    return [];
  }

  const routes: string[] = [];
  if (segments.length > 0 && (children.includes("page.tsx") || children.includes("page.ts"))) {
    routes.push(`/${segments.join("/")}`);
  }

  for (const child of children) {
    if (!isPublicStaticAppSegment(child)) continue;
    const childPath = path.join(dir, child);
    let stat;
    try {
      stat = await fs.stat(childPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    routes.push(...(await discoverStaticAppRoutes(childPath, [...segments, child])));
  }

  return routes;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: toSitemapUrl(base, "/"),
      lastModified: now,
      changeFrequency: defaultChangeFrequency(0),
      priority: defaultPriority(0),
    },
  ];

  const pages = (await discoverAllPages()).filter((page) => page.slugSegments[0] !== "dev");
  const pageRecords = await Promise.all(
    pages.map(async (page) => ({ page, data: await parseJsonFile(page.contentPath) }))
  );
  for (const { page, data } of pageRecords) {
    if (page.slugSegments[0] === "dev") continue;
    if (data == null || !isPageIndexable(data)) continue;
    const override = readSitemapOverride(data.sitemap);
    if (override === false) continue;

    const pathname = `/${page.slugSegments.join("/")}`;
    const depth = page.slugSegments.length;
    entries.push({
      url: toSitemapUrl(base, pathname),
      lastModified: now,
      changeFrequency: override?.changeFrequency ?? defaultChangeFrequency(depth),
      priority: override?.priority ?? defaultPriority(depth),
    });
  }

  const existingUrls = new Set(entries.map((entry) => entry.url));
  for (const pathname of await discoverStaticAppRoutes()) {
    const url = toSitemapUrl(base, pathname);
    if (existingUrls.has(url)) continue;
    if (pathname.split("/").some((seg) => /[[\]]/.test(seg))) continue;
    entries.push({
      url,
      lastModified: now,
      changeFrequency: defaultChangeFrequency(1),
      priority: defaultPriority(1),
    });
  }

  return entries;
}
