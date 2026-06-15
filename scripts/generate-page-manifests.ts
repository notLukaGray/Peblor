import fs from "node:fs";
import path from "node:path";
import { isRecord } from "@pb/core";

const PAGES_DIR = path.join(process.cwd(), "content/pages");
const OUT_DIR = path.join(process.cwd(), "apps/web/public/manifests");

type PageManifest = {
  route: string;
  tier: "static" | "mixed" | "client";
  protected: boolean;
  criticalAssets: string[];
};

function tierFromPage(data: Record<string, unknown>): PageManifest["tier"] {
  const defs = isRecord(data.definitions) ? data.definitions : {};
  const bgKey = typeof data.bgKey === "string" ? data.bgKey : null;
  if (bgKey) {
    const bg = defs[bgKey];
    if (isRecord(bg)) {
      if (bg.type === "backgroundVideo") return "client";
      if (bg.type === "backgroundVariable" && Array.isArray(bg.layers)) {
        if (
          bg.layers.some(
            (l) => isRecord(l) && Array.isArray(l.motion) && (l.motion as unknown[]).length > 0
          )
        )
          return "client";
      }
    }
  }
  const CLIENT_TYPES = new Set([
    "elementVideo",
    "elementAudio",
    "elementModel3D",
    "elementRive",
    "elementButton",
  ]);
  for (const def of Object.values(defs)) {
    if (!isRecord(def)) continue;
    if (typeof def.type === "string" && CLIENT_TYPES.has(def.type)) return "mixed";
    if (isRecord(def.definitions)) {
      for (const inner of Object.values(def.definitions)) {
        if (isRecord(inner) && typeof inner.type === "string" && CLIENT_TYPES.has(inner.type))
          return "mixed";
      }
    }
  }
  return "static";
}

function isPageProtected(data: Record<string, unknown>): boolean {
  if (data.passwordProtected === true) return true;
  if (data.visibility === "protected") return true;
  return false;
}

function collectCriticalAssets(data: Record<string, unknown>): string[] {
  const assets: string[] = [];
  const defs = isRecord(data.definitions) ? data.definitions : {};
  const bgKey = typeof data.bgKey === "string" ? data.bgKey : null;
  if (bgKey) {
    const bg = defs[bgKey];
    if (isRecord(bg)) {
      if (typeof bg.video === "string") assets.push(bg.video);
      if (typeof bg.src === "string") assets.push(bg.src);
    }
  }
  const firstSectionKey = Array.isArray(data.sectionOrder)
    ? (data.sectionOrder as string[])[0]
    : null;
  if (firstSectionKey) {
    const sec = defs[firstSectionKey];
    if (isRecord(sec) && isRecord(sec.definitions)) {
      for (const el of Object.values(sec.definitions)) {
        if (!isRecord(el)) continue;
        if (typeof el.src === "string") assets.push(el.src);
        if (typeof el.video === "string") assets.push(el.video);
      }
    }
  }
  return [...new Set(assets)];
}

function walk(dir: string, routePrefix: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const routePath = `${routePrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name), routePath);
    } else if (entry.name === "index.json") {
      const data = JSON.parse(fs.readFileSync(path.join(dir, entry.name), "utf8")) as Record<
        string,
        unknown
      >;
      const route = routePrefix || "/";
      const manifest: PageManifest = {
        route,
        tier: tierFromPage(data),
        protected: isPageProtected(data),
        criticalAssets: collectCriticalAssets(data),
      };
      const slug = routePrefix || "root";
      const outPath = path.join(OUT_DIR, `${slug}.json`);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
    }
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
walk(PAGES_DIR, "");
console.log("Manifests written to public/manifests/");
