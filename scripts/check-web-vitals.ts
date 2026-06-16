#!/usr/bin/env npx tsx
/**
 * check-web-vitals.ts
 *
 * Asserts basic JS size budgets for all routes using the Next.js build output.
 * This is a lightweight, browser-less alternative to Lighthouse CI that can
 * run in CI without a browser environment. It checks:
 *
 *   - Per-route JS payload does not exceed MAX_JS_PER_ROUTE (default 500 KB)
 *   - Total JS across all routes does not exceed MAX_TOTAL_JS (default 2 MB)
 *   - Each public route has a build manifest (no zero-byte orphans)
 *   - Prerender manifest exists and contains expected static routes (non-empty)
 *   - Build manifest exists and lists static page entries
 *   - Self-hosted font woff2 files are each <50 KB
 *
 * The existing check:route-budgets script handles baseline-relative budgets.
 * This script provides absolute hard limits.
 *
 * Usage:
 *   npm run build
 *   npx tsx scripts/check-web-vitals.ts
 *
 * Gracefully skips if no build output is found (usable in pre-push without build).
 */

import fs from "fs";
import path from "path";
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

// ── Budget thresholds ──────────────────────────────────────────────────────
const MAX_JS_PER_ROUTE = 500 * 1024; // 500 KB — adjust as needed
const MAX_TOTAL_JS = 2 * 1024 * 1024; // 2 MB
const MAX_FONT_FILE_SIZE = 50 * 1024; // 50 KB per woff2

function extractManifestObject(manifestContent: string): Record<string, unknown> | null {
  // Next.js 16 switched from `__RSC_MANIFEST = {...}` to per-route
  // `globalThis.__RSC_MANIFEST["/route"] = {...}`. Try the new format
  // first, then fall back to the old single-object format.
  const newFormatMatch = manifestContent.match(
    /globalThis\.__RSC_MANIFEST\["[^"]*"\]\s*=\s*(\{[\s\S]*?\});/
  );
  if (newFormatMatch && newFormatMatch[1]) {
    try {
      return JSON.parse(newFormatMatch[1]) as Record<string, unknown>;
    } catch {
      // fall through to old format
    }
  }

  const match = manifestContent.match(/__RSC_MANIFEST\s*=\s*(\{[\s\S]*?\});/);
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveChunkToFile(chunkPath: string, nextDir: string): string {
  if (chunkPath.startsWith("/_next/")) {
    return path.join(nextDir, chunkPath.slice("/_next/".length));
  }
  if (chunkPath.startsWith("static/")) {
    return path.join(nextDir, chunkPath);
  }
  return path.join(nextDir, chunkPath.replace(/^\/+/, ""));
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

function computeRoutePayloads(nextDir: string): Record<string, RoutePayload> {
  const appServerDir = path.join(nextDir, "server", "app");
  if (!fs.existsSync(appServerDir)) {
    throw new Error(`Missing build output directory: ${appServerDir}`);
  }

  const files: string[] = [];
  walk(appServerDir, files);

  const manifestFiles = files.filter((file) => file.endsWith("_client-reference-manifest.js"));
  const payloads: Record<string, RoutePayload> = {};

  for (const manifestPath of manifestFiles) {
    const route = routeFromManifestPath(manifestPath, appServerDir);
    if (!isPublicRoute(route)) continue;

    const content = fs.readFileSync(manifestPath, "utf8");
    const manifestData = extractManifestObject(content);
    if (!manifestData) continue;

    const rawChunks = collectChunkPaths(manifestData);
    const resolvedChunks = new Set<string>();
    let bytes = 0;

    for (const chunk of rawChunks) {
      const chunkFile = resolveChunkToFile(chunk, nextDir);
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

// ── Prerender manifest checks ──────────────────────────────────────────────

function checkPrerenderManifest(nextDir: string): boolean {
  const manifestPath = path.join(nextDir, "prerender-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`[web-vitals] FAIL: prerender-manifest.json not found at ${manifestPath}`);
    return false;
  }

  let manifest: { routes?: Record<string, unknown>; dynamicRoutes?: Record<string, unknown> };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      routes?: Record<string, unknown>;
      dynamicRoutes?: Record<string, unknown>;
    };
  } catch (err) {
    console.error(`[web-vitals] FAIL: prerender-manifest.json is not valid JSON: ${err}`);
    return false;
  }

  const routeCount = manifest.routes ? Object.keys(manifest.routes).length : 0;
  const dynamicCount = manifest.dynamicRoutes ? Object.keys(manifest.dynamicRoutes).length : 0;

  if (routeCount === 0) {
    console.error(`[web-vitals] FAIL: prerender-manifest.json has no static routes`);
    return false;
  }

  console.error(
    `[web-vitals] prerender-manifest: ${routeCount} static routes, ${dynamicCount} dynamic routes`
  );

  return true;
}

// ── Build manifest checks ───────────────────────────────────────────────────

function checkBuildManifest(nextDir: string): boolean {
  const manifestPath = path.join(nextDir, "build-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`[web-vitals] FAIL: build-manifest.json not found at ${manifestPath}`);
    return false;
  }

  let manifest: {
    pages?: Record<string, unknown>;
    __NEXT_BUILD_MANIFEST?: Record<string, unknown>;
  };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      pages?: Record<string, unknown>;
      __NEXT_BUILD_MANIFEST?: Record<string, unknown>;
    };
  } catch (err) {
    console.error(`[web-vitals] FAIL: build-manifest.json is not valid JSON: ${err}`);
    return false;
  }

  const pageCount = manifest.pages ? Object.keys(manifest.pages).length : 0;
  if (pageCount === 0) {
    console.error(`[web-vitals] FAIL: build-manifest.json has no pages`);
    return false;
  }

  // Check for expected pages
  const expectedPages = ["/", "/404", "/unlock"];
  const pages = manifest.pages ?? {};
  const missingPages = expectedPages.filter(
    (p) => !pages[p] && !Object.keys(pages).some((k) => k === p)
  );

  if (missingPages.length > 0) {
    console.error(
      `[web-vitals] WARN: build-manifest missing expected pages: ${missingPages.join(", ")}`
    );
    // This is just a warning since catch-all routes handle dynamic pages
  }

  console.error(`[web-vitals] build-manifest: ${pageCount} page entries`);
  return true;
}

// ── Font file size checks ───────────────────────────────────────────────────

function checkFontFiles(): boolean {
  const candidates = [
    path.join(process.cwd(), "apps", "web", "public", "font", "self-hosted"),
    path.join(process.cwd(), "public", "font", "self-hosted"),
  ];

  const fontDir = candidates.find((dir) => fs.existsSync(dir));
  if (!fontDir) {
    console.error(
      `[web-vitals] No self-hosted font directory found — using CDN fonts, skipping check`
    );
    return true;
  }

  let failed = false;
  const entries = fs.readdirSync(fontDir);
  const fontFiles = entries.filter((e) => e.endsWith(".woff2"));

  if (fontFiles.length === 0) {
    console.error(`[web-vitals] WARN: No woff2 files found in ${fontDir}`);
    return true;
  }

  for (const file of fontFiles) {
    const filePath = path.join(fontDir, file);
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FONT_FILE_SIZE) {
      console.error(
        `[web-vitals] FAIL: Font ${file} is ${formatBytes(stat.size)} — exceeds ${formatBytes(MAX_FONT_FILE_SIZE)}`
      );
      failed = true;
    } else {
      console.error(
        `[web-vitals] PASS: Font ${file} is ${formatBytes(stat.size)} (limit ${formatBytes(MAX_FONT_FILE_SIZE)})`
      );
    }
  }

  if (failed) {
    console.error(
      `\n[web-vitals] FAILED: Some font files exceed the ${formatBytes(MAX_FONT_FILE_SIZE)} size budget.`
    );
  }

  return !failed;
}

// ── Main ────────────────────────────────────────────────────────────────────

interface VitalsResult {
  route: string;
  bytes: number;
  human: string;
  status: "pass" | "fail";
  reason?: string;
}

async function run(): Promise<number> {
  const nextDir = resolveNextDir();
  const appServerDir = path.join(nextDir, "server", "app");

  // Graceful skip: no build output yet (e.g., running in pre-push without build)
  if (!fs.existsSync(appServerDir)) {
    console.error(
      "[web-vitals] No build output found — skipping. Build first with `npm run build`."
    );
    return 0;
  }

  console.error(`[web-vitals] Using Next.js build: ${nextDir}`);

  // ── Prerender manifest check ──────────────────────────────────────────────
  let allPassed = true;
  if (!checkPrerenderManifest(nextDir)) {
    allPassed = false;
  }

  // ── Build manifest check ──────────────────────────────────────────────────
  if (!checkBuildManifest(nextDir)) {
    allPassed = false;
  }

  // ── Font file size check ──────────────────────────────────────────────────
  if (!checkFontFiles()) {
    allPassed = false;
  }

  // ── Route payload checks ──────────────────────────────────────────────────
  const payloads = computeRoutePayloads(nextDir);
  const routeKeys = Object.keys(payloads).sort();
  const results: VitalsResult[] = [];
  let routeBudgetFailed = false;
  let totalBytes = 0;

  for (const route of routeKeys) {
    const payload = payloads[route];
    if (!payload) continue;

    totalBytes += payload.bytes;
    const human = formatBytes(payload.bytes);

    if (payload.bytes === 0) {
      results.push({ route, bytes: 0, human, status: "fail", reason: "zero-byte payload" });
      routeBudgetFailed = true;
      continue;
    }

    if (payload.bytes > MAX_JS_PER_ROUTE) {
      results.push({
        route,
        bytes: payload.bytes,
        human,
        status: "fail",
        reason: `exceeds max ${formatBytes(MAX_JS_PER_ROUTE)}`,
      });
      routeBudgetFailed = true;
      continue;
    }

    results.push({ route, bytes: payload.bytes, human, status: "pass" });
  }

  // Check total JS across all routes
  if (totalBytes > MAX_TOTAL_JS) {
    console.error(
      `[web-vitals] FAIL: Total JS ${formatBytes(totalBytes)} exceeds max ${formatBytes(MAX_TOTAL_JS)}`
    );
    routeBudgetFailed = true;
  } else {
    console.error(
      `[web-vitals] Total JS across ${routeKeys.length} routes: ${formatBytes(totalBytes)}`
    );
  }

  // Report per-route results
  for (const r of results) {
    const icon = r.status === "pass" ? "PASS" : "FAIL";
    console.error(`[web-vitals] ${icon} ${r.route}: ${r.human}${r.reason ? ` — ${r.reason}` : ""}`);
  }

  // Also check discovered content routes have manifests
  const contentRoutes = await getDiscoveredContentRoutes();
  let orphanCount = 0;
  for (const contentRoute of contentRoutes) {
    if (!payloads[contentRoute]) {
      // Route matches catch-all — fine, skip check
      const catchAll = payloads["/[...slug]"];
      if (catchAll) continue;
      console.error(`[web-vitals] WARN: content route ${contentRoute} has no build manifest`);
      orphanCount++;
    }
  }

  if (routeBudgetFailed) {
    console.error("\n[web-vitals] FAILED: Some routes exceed JS size budgets.");
    allPassed = false;
  }

  if (orphanCount > 0) {
    console.error(
      `\n[web-vitals] FAILED: ${orphanCount} content route(s) missing build manifests.`
    );
    allPassed = false;
  }

  if (!allPassed) {
    process.exit(1);
  }

  console.error("\n[web-vitals] PASSED: All checks within budgets.");
  return 0;
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[web-vitals] ERROR: ${message}`);
  process.exit(1);
});
