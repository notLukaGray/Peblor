import fs from "fs";
import path from "path";
import { discoverAllPages } from "@pb/core/load";

export type RoutePayload = {
  bytes: number;
  chunkCount: number;
  manifestPath: string;
  chunks: string[];
};

export function resolveNextDir(): string {
  const cwd = process.cwd();
  const override = process.env.ROUTE_BUDGET_NEXT_DIR;
  if (override) {
    return path.resolve(cwd, override);
  }
  const candidates = [path.join(cwd, "apps", "web", ".next"), path.join(cwd, ".next")];

  const valid = candidates
    .filter((candidate) => fs.existsSync(path.join(candidate, "server", "app")))
    .map((candidate) => {
      const buildIdPath = path.join(candidate, "BUILD_ID");
      const statPath = fs.existsSync(buildIdPath)
        ? buildIdPath
        : path.join(candidate, "server", "app");
      return {
        candidate,
        mtimeMs: fs.statSync(statPath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const latest = valid[0];
  if (latest) return latest.candidate;
  return path.join(cwd, ".next");
}

export function walk(dir: string, out: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, out);
    else if (entry.isFile()) out.push(fullPath);
  }
}

export function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function normalizeRoute(routeLike: string): string {
  const normalized = routeLike.trim();
  if (normalized === "" || normalized === "page") return "/";
  let out = normalized;
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/+/g, "/");
  return out;
}

export function routeFromManifestPath(manifestPath: string, appServerDir: string): string {
  const relativeFromApp = toPosix(path.relative(appServerDir, manifestPath));
  const withoutSuffix = relativeFromApp.replace(/_client-reference-manifest\.js$/, "");
  if (withoutSuffix === "page") return "/";
  if (withoutSuffix.endsWith("/page")) {
    return normalizeRoute(withoutSuffix.slice(0, -"/page".length));
  }
  if (withoutSuffix.endsWith("/route")) {
    return normalizeRoute(withoutSuffix.slice(0, -"/route".length));
  }
  return normalizeRoute(withoutSuffix);
}

export function isPublicRoute(route: string): boolean {
  if (route.startsWith("/api")) return false;
  if (route.startsWith("/dev")) return false;
  if (route.startsWith("/_")) return false;
  if (route === "/favicon.ico") return false;
  if (route === "/sitemap.xml") return false;
  if (route === "/og") return false;
  if (route === "/robots.txt") return false;
  if (route.endsWith(".xml") || route.endsWith(".txt") || route.endsWith(".ico")) return false;
  return true;
}

let discoveredContentRoutes: Set<string> | null = null;

export async function getDiscoveredContentRoutes(): Promise<Set<string>> {
  if (discoveredContentRoutes) return discoveredContentRoutes;
  discoveredContentRoutes = new Set(
    (await discoverAllPages()).map(({ slugSegments }) => normalizeRoute(slugSegments.join("/")))
  );
  return discoveredContentRoutes;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
