import fs from "node:fs";
import path from "node:path";
import { isRecord } from "@pb/core";
export { isRecord };

export function findPagesDir(): string | null {
  const candidate = path.join(process.cwd(), "content/pages");
  return fs.existsSync(candidate) ? candidate : null;
}

export function findOverlaysDir(): string | null {
  const candidate = path.join(process.cwd(), "content/site/overlays");
  return fs.existsSync(candidate) ? candidate : null;
}

export function findPresetsDir(): string | null {
  const candidate = path.join(process.cwd(), "content/presets");
  return fs.existsSync(candidate) ? candidate : null;
}

export function findCapabilitiesDir(): string | null {
  const candidate = path.join(process.cwd(), "content/capabilities");
  return fs.existsSync(candidate) ? candidate : null;
}

export function walkPages(dir: string): Array<{ route: string; file: string }> {
  const results: Array<{ route: string; file: string }> = [];
  function walk(current: string, routePrefix: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      console.warn("[pb-cli] Failed to read page directory during walk", current, err);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(current, entry.name), `${routePrefix}/${entry.name}`);
      } else if (entry.isFile() && entry.name === "index.json") {
        // Only treat index.json files as routable pages. Other JSON files in a page
        // directory are sidecar section fragments, not standalone routes.
        const route = routePrefix || "/";
        results.push({ route, file: path.join(current, entry.name) });
      }
    }
  }
  walk(dir, "");
  return results.sort((a, b) => a.route.localeCompare(b.route));
}

export function findPageFile(pagesDir: string, route: string): string | null {
  const normalized = route.replace(/^\/+|\/+$/g, "") || "index";
  const candidates = [
    path.join(pagesDir, normalized, "index.json"),
    path.join(pagesDir, `${normalized}.json`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function routeToWritePath(pagesDir: string, route: string): string {
  const normalized = route.replace(/^\/+|\/+$/g, "") || "index";
  return path.join(pagesDir, normalized, "index.json");
}

export function readPageJson(
  file: string
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: "Page is not a JSON object" };
    }
    return { ok: true, data: data as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function walkAllPages(
  pagesDir: string
): Array<{ route: string; file: string; data: Record<string, unknown> }> {
  const pages = walkPages(pagesDir);
  const result: Array<{ route: string; file: string; data: Record<string, unknown> }> = [];
  for (const { route, file } of pages) {
    const r = readPageJson(file);
    if (r.ok) result.push({ route, file, data: r.data });
  }
  return result;
}
