#!/usr/bin/env npx tsx

import fs from "fs";
import path from "path";
import vm from "vm";
import { discoverAllPages } from "@pb/core/load";

type RoutePayload = {
  bytes: number;
  chunkCount: number;
  manifestPath: string;
  chunks: string[];
};

type BaselineRoute = {
  bytes: number;
  chunkCount: number;
};

type RouteBudgetBaseline = {
  version: 1;
  generatedAt: string;
  routes: Record<string, BaselineRoute>;
  exceptions?: Record<
    string,
    {
      allowPercentOver?: number;
      allowBytesOver?: number;
      reason: string;
    }
  >;
};

type CurrentRoutePayload = {
  payload: RoutePayload;
  sourceRoute?: string;
};

function resolveNextDir(): string {
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

const NEXT_DIR = resolveNextDir();
const APP_SERVER_DIR = path.join(NEXT_DIR, "server", "app");
const BASELINE_PATH = path.join(process.cwd(), "scripts", "route-budget-baseline.json");

function walk(dir: string, out: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, out);
    else if (entry.isFile()) out.push(fullPath);
  }
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function normalizeRoute(routeLike: string): string {
  const normalized = routeLike.trim();
  if (normalized === "" || normalized === "page") return "/";
  let out = normalized;
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/+/g, "/");
  return out;
}

function routeFromManifestPath(manifestPath: string): string {
  const relativeFromApp = toPosix(path.relative(APP_SERVER_DIR, manifestPath));
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

function isPublicRoute(route: string): boolean {
  if (route.startsWith("/api")) return false;
  if (route.startsWith("/dev")) return false;
  if (route.startsWith("/_")) return false;
  if (route === "/favicon.ico") return false;
  if (route === "/sitemap.xml") return false;
  return true;
}

let discoveredContentRoutes: Set<string> | null = null;

async function getDiscoveredContentRoutes(): Promise<Set<string>> {
  if (discoveredContentRoutes) return discoveredContentRoutes;
  discoveredContentRoutes = new Set(
    (await discoverAllPages()).map(({ slugSegments }) => normalizeRoute(slugSegments.join("/")))
  );
  return discoveredContentRoutes;
}

async function getCurrentRoutePayload(
  route: string,
  payloads: Record<string, RoutePayload>
): Promise<CurrentRoutePayload | null> {
  const direct = payloads[route];
  if (direct) return { payload: direct };

  const catchAll = payloads["/[...slug]"];
  if (catchAll && (await getDiscoveredContentRoutes()).has(route)) {
    return { payload: catchAll, sourceRoute: "/[...slug]" };
  }

  return null;
}

function extractManifestObject(manifestContent: string): Record<string, unknown> | null {
  const context: {
    globalThis: {
      __RSC_MANIFEST?: Record<string, unknown>;
    };
  } = { globalThis: {} };

  try {
    vm.runInNewContext(manifestContent, context, {
      timeout: 2000,
      filename: "client-reference-manifest.js",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unexpected token") || message.includes("SyntaxError")) {
      process.stderr.write(`[route-budgets] Manifest format drift: ${message}\n`);
    }
    return null;
  }

  const map = context.globalThis.__RSC_MANIFEST;
  if (!map) return null;
  if (typeof map !== "object") {
    process.stderr.write(
      `[route-budgets] Manifest __RSC_MANIFEST is not an object — possible format drift.\n`
    );
    return null;
  }
  const values = Object.values(map);
  if (values.length === 0) return null;
  const first = values[0];
  if (first == null || typeof first !== "object") {
    process.stderr.write(
      `[route-budgets] Manifest first entry is not an object — possible format drift.\n`
    );
    return null;
  }
  return first as Record<string, unknown>;
}

function resolveChunkToFile(chunkPath: string): string {
  if (chunkPath.startsWith("/_next/")) {
    return path.join(NEXT_DIR, chunkPath.slice("/_next/".length));
  }
  if (chunkPath.startsWith("static/")) {
    return path.join(NEXT_DIR, chunkPath);
  }
  return path.join(NEXT_DIR, chunkPath.replace(/^\/+/, ""));
}

function collectChunkPaths(manifestData: Record<string, unknown>): string[] {
  const chunks = new Set<string>();

  const clientModules = manifestData.clientModules;
  if (clientModules && typeof clientModules === "object") {
    for (const value of Object.values(clientModules as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const moduleChunks = (value as { chunks?: unknown }).chunks;
      if (!Array.isArray(moduleChunks)) continue;
      for (const chunk of moduleChunks) {
        if (typeof chunk !== "string") continue;
        chunks.add(chunk);
      }
    }
  }

  const entryJSFiles = manifestData.entryJSFiles;
  if (entryJSFiles && typeof entryJSFiles === "object") {
    for (const files of Object.values(entryJSFiles as Record<string, unknown>)) {
      if (!Array.isArray(files)) continue;
      for (const file of files) {
        if (typeof file !== "string") continue;
        chunks.add(file.startsWith("/") ? file : `/_next/${file}`);
      }
    }
  }

  return Array.from(chunks);
}

function computeRoutePayloads(): Record<string, RoutePayload> {
  if (!fs.existsSync(APP_SERVER_DIR)) {
    throw new Error(`Missing build output directory: ${APP_SERVER_DIR}`);
  }

  const files: string[] = [];
  walk(APP_SERVER_DIR, files);

  const manifestFiles = files.filter((file) => file.endsWith("_client-reference-manifest.js"));
  const payloads: Record<string, RoutePayload> = {};

  for (const manifestPath of manifestFiles) {
    const route = routeFromManifestPath(manifestPath);
    if (!isPublicRoute(route)) continue;

    const content = fs.readFileSync(manifestPath, "utf8");
    const manifestData = extractManifestObject(content);
    if (!manifestData) continue;

    const rawChunks = collectChunkPaths(manifestData);
    const resolvedChunks = new Set<string>();
    let bytes = 0;

    for (const chunk of rawChunks) {
      const chunkFile = resolveChunkToFile(chunk);
      if (!fs.existsSync(chunkFile)) continue;
      const relChunkFile = toPosix(path.relative(process.cwd(), chunkFile));
      if (resolvedChunks.has(relChunkFile)) continue;
      resolvedChunks.add(relChunkFile);
      bytes += fs.statSync(chunkFile).size;
    }

    const previous = payloads[route];
    if (!previous || bytes > previous.bytes) {
      payloads[route] = {
        bytes,
        chunkCount: resolvedChunks.size,
        manifestPath: toPosix(path.relative(process.cwd(), manifestPath)),
        chunks: Array.from(resolvedChunks).sort(),
      };
    }
  }

  return payloads;
}

function loadBaseline(): RouteBudgetBaseline {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(
      `Missing baseline file at ${toPosix(path.relative(process.cwd(), BASELINE_PATH))}. Run with --write-baseline first.`
    );
  }

  const raw = fs.readFileSync(BASELINE_PATH, "utf8");
  let parsed: RouteBudgetBaseline;
  try {
    parsed = JSON.parse(raw) as RouteBudgetBaseline;
  } catch {
    throw new Error(
      `Route budget baseline at ${toPosix(path.relative(process.cwd(), BASELINE_PATH))} is not valid JSON.`
    );
  }
  if (!parsed || typeof parsed !== "object" || parsed.version !== 1 || !parsed.routes) {
    throw new Error("Invalid route-budget baseline format.");
  }
  return parsed;
}

function writeBaseline(payloads: Record<string, RoutePayload>): void {
  const baseline: RouteBudgetBaseline = {
    version: 1,
    generatedAt: new Date().toISOString(),
    routes: Object.fromEntries(
      Object.entries(payloads)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([route, payload]) => [
          route,
          { bytes: payload.bytes, chunkCount: payload.chunkCount },
        ])
    ),
    exceptions: {},
  };

  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function compareAgainstBaseline(
  payloads: Record<string, RoutePayload>,
  baseline: RouteBudgetBaseline
): Promise<{ failed: boolean; report: Record<string, unknown> }> {
  const comparisons: Array<Record<string, unknown>> = [];
  let failed = false;

  const allRoutes = new Set([...Object.keys(payloads), ...Object.keys(baseline.routes)]);
  const sortedRoutes = Array.from(allRoutes).sort((a, b) => a.localeCompare(b));

  for (const route of sortedRoutes) {
    const currentRoute = await getCurrentRoutePayload(route, payloads);
    const current = currentRoute?.payload;
    const base = baseline.routes[route];
    const exception = baseline.exceptions?.[route];

    if (!base) {
      comparisons.push({
        route,
        status: "new-route-no-baseline",
        currentBytes: current?.bytes ?? null,
        currentHuman: current ? formatBytes(current.bytes) : null,
      });
      failed = true;
      continue;
    }

    if (!current) {
      comparisons.push({
        route,
        status: "missing-in-current-build",
        baselineBytes: base.bytes,
        baselineHuman: formatBytes(base.bytes),
      });
      failed = true;
      continue;
    }

    const deltaBytes = current.bytes - base.bytes;
    const deltaPercent =
      base.bytes === 0 ? (current.bytes === 0 ? 0 : 100) : (deltaBytes / base.bytes) * 100;
    const allowPercentOver = exception?.allowPercentOver ?? 5;
    const allowBytesOver = exception?.allowBytesOver ?? 0;
    const maxBytes = base.bytes * (1 + allowPercentOver / 100) + allowBytesOver;
    const withinBudget = current.bytes <= maxBytes;

    comparisons.push({
      route,
      status: withinBudget ? "pass" : "fail",
      baselineBytes: base.bytes,
      baselineHuman: formatBytes(base.bytes),
      currentBytes: current.bytes,
      currentHuman: formatBytes(current.bytes),
      deltaBytes,
      deltaPercent: Number(deltaPercent.toFixed(2)),
      budgetLimitBytes: Math.round(maxBytes),
      budgetLimitHuman: formatBytes(Math.round(maxBytes)),
      allowPercentOver,
      allowBytesOver,
      allowBytesOverHuman: formatBytes(allowBytesOver),
      exceptionReason: exception?.reason,
      sourceRoute: currentRoute.sourceRoute,
      manifestPath: current.manifestPath,
      chunkCount: current.chunkCount,
    });

    if (!withinBudget) failed = true;
  }

  return {
    failed,
    report: {
      status: failed ? "fail" : "pass",
      routeCount: sortedRoutes.length,
      comparisons,
    },
  };
}

async function run(): Promise<number> {
  const args = new Set(process.argv.slice(2));
  const writeOnly = args.has("--write-baseline");

  const payloads = computeRoutePayloads();

  if (writeOnly) {
    writeBaseline(payloads);
    console.log(
      JSON.stringify(
        {
          status: "baseline-written",
          baselinePath: toPosix(path.relative(process.cwd(), BASELINE_PATH)),
          routeCount: Object.keys(payloads).length,
        },
        null,
        2
      )
    );
    return 0;
  }

  const baseline = loadBaseline();
  const { failed, report } = await compareAgainstBaseline(payloads, baseline);
  console.log(JSON.stringify(report, null, 2));
  return failed ? 1 : 0;
}

void run()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ status: "error", message }, null, 2));
    process.exit(1);
  });
