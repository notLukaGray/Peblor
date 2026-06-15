#!/usr/bin/env npx tsx

import fs from "fs";
import path from "path";
import vm from "vm";

type RouteChunk = {
  path: string;
  bytes: number;
};

type RouteMeasurement = {
  route: string;
  sourceRoute?: string;
  manifestPath: string;
  totalBytes: number;
  totalHuman: string;
  chunkCount: number;
  firstLoadPackageMarkers: Record<string, boolean>;
  chunks: RouteChunk[];
};

type RoutePayload = {
  route: string;
  manifestPath: string;
  chunks: RouteChunk[];
};

const PACKAGE_MARKERS = {
  zod: ["zod", "$Zod", "ZodError"],
  three: ["three", "THREE", "WebGLRenderer"],
  "hls.js": ["hls.js", "Hls.isSupported", "HlsEvents"],
  "@rive-app": ["@rive-app", "RiveCanvas", "RiveFile"],
  "framer-motion": ["framer-motion", "MotionConfig", "useMotionValue"],
} satisfies Record<string, string[]>;

function resolveNextDir(): string {
  const cwd = process.cwd();
  const override = process.env.MEASURE_CLIENT_NEXT_DIR;
  if (override) return path.resolve(cwd, override);

  const candidates = [path.join(cwd, "apps", "web", ".next"), path.join(cwd, ".next")];
  const valid = candidates
    .filter((candidate) => fs.existsSync(path.join(candidate, "server", "app")))
    .map((candidate) => {
      const buildIdPath = path.join(candidate, "BUILD_ID");
      const statPath = fs.existsSync(buildIdPath)
        ? buildIdPath
        : path.join(candidate, "server", "app");
      return { candidate, mtimeMs: fs.statSync(statPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return valid[0]?.candidate ?? path.join(cwd, "apps", "web", ".next");
}

const NEXT_DIR = resolveNextDir();
const APP_SERVER_DIR = path.join(NEXT_DIR, "server", "app");
const STATIC_CHUNKS_DIR = path.join(NEXT_DIR, "static", "chunks");

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeRoute(routeLike: string): string {
  const normalized = routeLike.trim();
  if (normalized === "" || normalized === "page") return "/";
  let out = normalized;
  if (!out.startsWith("/")) out = `/${out}`;
  return out.replace(/\/+$/g, "").replace(/\/+/g, "/") || "/";
}

function routeFromManifestPath(manifestPath: string): string {
  const relativeFromApp = toPosix(path.relative(APP_SERVER_DIR, manifestPath));
  const withoutSuffix = relativeFromApp.replace(/_client-reference-manifest\.js$/, "");
  if (withoutSuffix === "page") return "/";
  if (withoutSuffix.endsWith("/page"))
    return normalizeRoute(withoutSuffix.slice(0, -"/page".length));
  if (withoutSuffix.endsWith("/route"))
    return normalizeRoute(withoutSuffix.slice(0, -"/route".length));
  return normalizeRoute(withoutSuffix);
}

function extractManifestObject(manifestContent: string): Record<string, unknown> | null {
  const context: { globalThis: { __RSC_MANIFEST?: Record<string, unknown> } } = { globalThis: {} };
  try {
    vm.runInNewContext(manifestContent, context, {
      timeout: 2000,
      filename: "client-reference-manifest.js",
    });
  } catch {
    return null;
  }

  const map = context.globalThis.__RSC_MANIFEST;
  if (!map) return null;
  const first = Object.values(map)[0];
  return first != null && typeof first === "object" ? (first as Record<string, unknown>) : null;
}

function resolveChunkToFile(chunkPath: string): string {
  if (chunkPath.startsWith("/_next/"))
    return path.join(NEXT_DIR, chunkPath.slice("/_next/".length));
  if (chunkPath.startsWith("static/")) return path.join(NEXT_DIR, chunkPath);
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
        if (typeof chunk === "string") chunks.add(chunk);
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
    throw new Error(
      `Missing build output directory: ${APP_SERVER_DIR}. Run \`npm run build\` before \`npm run measure:client\`.`
    );
  }

  const files: string[] = [];
  walk(APP_SERVER_DIR, files);

  const payloads: Record<string, RoutePayload> = {};
  const manifestFiles = files.filter((file) => file.endsWith("_client-reference-manifest.js"));

  for (const manifestPath of manifestFiles) {
    const manifestData = extractManifestObject(fs.readFileSync(manifestPath, "utf8"));
    if (!manifestData) continue;

    const chunks = new Map<string, RouteChunk>();
    for (const chunk of collectChunkPaths(manifestData)) {
      const chunkFile = resolveChunkToFile(chunk);
      if (!fs.existsSync(chunkFile)) continue;
      const relPath = toPosix(path.relative(process.cwd(), chunkFile));
      if (chunks.has(relPath)) continue;
      chunks.set(relPath, { path: relPath, bytes: fs.statSync(chunkFile).size });
    }

    const route = routeFromManifestPath(manifestPath);
    payloads[route] = {
      route,
      manifestPath: toPosix(path.relative(process.cwd(), manifestPath)),
      chunks: Array.from(chunks.values()).sort((a, b) => b.bytes - a.bytes),
    };
  }

  return payloads;
}

function packageMarkersForChunks(chunks: RouteChunk[]): Record<string, boolean> {
  const result = Object.fromEntries(
    Object.keys(PACKAGE_MARKERS).map((name) => [name, false])
  ) as Record<string, boolean>;

  for (const chunk of chunks) {
    if (Object.values(result).every(Boolean)) break;
    const absPath = path.join(process.cwd(), chunk.path);
    if (!fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, "utf8");
    for (const [packageName, markers] of Object.entries(PACKAGE_MARKERS)) {
      if (result[packageName]) continue;
      result[packageName] = markers.some((marker) => content.includes(marker));
    }
  }

  return result;
}

function routeMeasurement(
  route: string,
  payload: RoutePayload,
  sourceRoute?: string
): RouteMeasurement {
  const totalBytes = payload.chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
  return {
    route,
    sourceRoute,
    manifestPath: payload.manifestPath,
    totalBytes,
    totalHuman: formatBytes(totalBytes),
    chunkCount: payload.chunks.length,
    firstLoadPackageMarkers: packageMarkersForChunks(payload.chunks),
    chunks: payload.chunks,
  };
}

function selectRoutes(payloads: Record<string, RoutePayload>): RouteMeasurement[] {
  const measurements: RouteMeasurement[] = [];
  const added = new Set<string>();

  for (const route of ["/", "/[...slug]"]) {
    const payload = payloads[route];
    if (!payload) continue;
    measurements.push(routeMeasurement(route, payload));
    added.add(route);
  }

  for (const route of Object.keys(payloads).sort()) {
    if (added.has(route) || !route.startsWith("/work/")) continue;
    measurements.push(routeMeasurement(route, payloads[route]!));
    added.add(route);
  }

  const catchAll = payloads["/[...slug]"];
  if (catchAll && !measurements.some((measurement) => measurement.route.startsWith("/work/"))) {
    measurements.push(routeMeasurement("/work/*", catchAll, "/[...slug]"));
  }

  return measurements;
}

function largestStaticChunks(limit: number): RouteChunk[] {
  if (!fs.existsSync(STATIC_CHUNKS_DIR)) return [];

  const files: string[] = [];
  walk(STATIC_CHUNKS_DIR, files);
  return files
    .filter((file) => file.endsWith(".js"))
    .map((file) => ({
      path: toPosix(path.relative(process.cwd(), file)),
      bytes: fs.statSync(file).size,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limit);
}

function run(): void {
  const payloads = computeRoutePayloads();
  const routes = selectRoutes(payloads);
  const allReferencedChunks = new Map<string, RouteChunk>();

  for (const measurement of routes) {
    for (const chunk of measurement.chunks) allReferencedChunks.set(chunk.path, chunk);
  }

  const totalReferencedRouteClientBytes = Array.from(allReferencedChunks.values()).reduce(
    (sum, chunk) => sum + chunk.bytes,
    0
  );

  console.log(
    JSON.stringify(
      {
        status: "ok",
        nextDir: toPosix(path.relative(process.cwd(), NEXT_DIR)) || ".",
        generatedAt: new Date().toISOString(),
        routeCount: routes.length,
        totalReferencedRouteClientBytes,
        totalReferencedRouteClientHuman: formatBytes(totalReferencedRouteClientBytes),
        routes,
        largestClientChunks: largestStaticChunks(20).map((chunk) => ({
          ...chunk,
          human: formatBytes(chunk.bytes),
        })),
      },
      null,
      2
    )
  );
}

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ status: "error", message }, null, 2));
  process.exit(1);
}
