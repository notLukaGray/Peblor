#!/usr/bin/env npx tsx

import fs from "fs";
import path from "path";
import vm from "vm";
import {
  type RoutePayload,
  resolveNextDir,
  walk,
  toPosix,
  routeFromManifestPath,
  isPublicRoute,
  getDiscoveredContentRoutes,
  formatBytes,
} from "./lib/next-build-utils";

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

const NEXT_DIR = resolveNextDir();
const APP_SERVER_DIR = path.join(NEXT_DIR, "server", "app");
const BASELINE_PATH = path.join(process.cwd(), "scripts", "route-budget-baseline.json");

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
    const route = routeFromManifestPath(manifestPath, APP_SERVER_DIR);
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
