/**
 * Downloads webfont CSS + font files from fonts.bunny.net at build time
 * and saves them locally so they're served from Vercel's edge.
 *
 * Run before `next build` / `next dev` — idempotent: skips if already downloaded.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// Import font config from the app — tsx resolves TypeScript imports natively.
import {
  primaryFontConfig,
  secondaryFontConfig,
  monoFontConfig,
  type FontSlotConfig,
} from "../apps/web/src/app/fonts/config";
import {
  buildBunnyFontUrl,
  type BuildBunnyFontUrlOptions,
} from "../apps/web/src/app/fonts/webfont";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FONT_OUT_DIR = path.join(ROOT, "apps/web/public/font/self-hosted");
const FLAG_FILE = path.join(ROOT, "apps/web/src/app/fonts/self-hosted-flag.ts");
const CSS_FILE = path.join(ROOT, "apps/web/src/app/fonts/webfonts.css");
const MANIFEST_FILE = path.join(ROOT, "apps/web/src/app/fonts/webfont-manifest.json");

interface FontFaceDescriptor {
  family: string;
  style: string;
  fontWeight: string;
  src: string;
  unicodeRange: string;
  fontDisplay: string;
}

/** Download with retries, returns ArrayBuffer. */
async function download(
  url: string,
  retries = 2
): Promise<{ buffer: ArrayBuffer; contentType: string | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PeblorBot/1.0)",
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${url}`);
      }
      return {
        buffer: await res.arrayBuffer(),
        contentType: res.headers.get("content-type"),
      };
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  Retry ${attempt + 1}/${retries} for ${url}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`unreachable`);
}

/** Parse @font-face rules from CSS text. */
function parseFontFaces(css: string): FontFaceDescriptor[] {
  const results: FontFaceDescriptor[] = [];
  // Match @font-face blocks
  const blockRe = /@font-face\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(css)) !== null) {
    const body = match[1];
    const desc: Record<string, string> = {};
    // Match individual properties
    const propRe = /\s*([\w-]+)\s*:\s*([^;]+)\s*;?/g;
    let propMatch: RegExpExecArray | null;
    while ((propMatch = propRe.exec(body)) !== null) {
      desc[propMatch[1].trim()] = propMatch[2].trim();
    }
    // Extract URL from src
    const srcMatch = /url\(([^)]+)\)/.exec(desc.src ?? "");
    if (srcMatch) {
      const url = srcMatch[1].replace(/['"]/g, "");
      results.push({
        family: (desc["font-family"] ?? "").replace(/['"]/g, ""),
        style: desc["font-style"] ?? "normal",
        fontWeight: desc["font-weight"] ?? "400",
        src: url,
        unicodeRange: desc["unicode-range"] ?? "",
        fontDisplay: desc["font-display"] ?? "swap",
      });
    }
  }
  return results;
}

/** Extract filename from a URL path. */
function urlFilename(url: string): string {
  try {
    return path.basename(new URL(url).pathname);
  } catch {
    return path.basename(url);
  }
}

async function main(): Promise<void> {
  // ── Idempotency check via config hash ──────────────────────────────────
  const configHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ primaryFontConfig, secondaryFontConfig, monoFontConfig }))
    .digest("hex")
    .slice(0, 16);

  if (fs.existsSync(FLAG_FILE) && fs.existsSync(CSS_FILE)) {
    const flag = fs.readFileSync(FLAG_FILE, "utf-8");
    if (flag.includes(`SELF_HOSTED = true`) && flag.includes(configHash)) {
      // Verify font files actually exist on disk (they may be missing on Vercel
      // since public/font/self-hosted/ is gitignored).
      let hasFontFiles = false;
      try {
        const entries = fs.readdirSync(FONT_OUT_DIR);
        hasFontFiles = entries.some((e) => e.endsWith(".woff2"));
      } catch {
        // Directory doesn't exist — need to re-download.
      }
      if (hasFontFiles) {
        console.log(
          "[download-webfonts] Fonts already self-hosted (config hash unchanged) — skipping."
        );
        return;
      }
      console.log(
        "[download-webfonts] Config hash unchanged but font files missing — re-downloading."
      );
    }
  }

  console.log("[download-webfonts] Downloading webfonts from fonts.bunny.net…");

  // ── Collect all webfont slots ─────────────────────────────────────────
  const slots: {
    config: FontSlotConfig;
    label: string;
    opts?: BuildBunnyFontUrlOptions;
  }[] = [];
  if (primaryFontConfig.source === "webfont")
    slots.push({ config: primaryFontConfig, label: "primary" });
  if (secondaryFontConfig.source === "webfont")
    slots.push({ config: secondaryFontConfig, label: "secondary" });
  if (monoFontConfig.source === "webfont") slots.push({ config: monoFontConfig, label: "mono" });

  if (slots.length === 0) {
    console.log("[download-webfonts] No webfont slots configured — nothing to do.");
    writeFlag(false);
    fs.mkdirSync(path.dirname(CSS_FILE), { recursive: true });
    fs.writeFileSync(CSS_FILE, "");
    fs.writeFileSync(MANIFEST_FILE, "[]\n");
    return;
  }

  // ── Prepare output dirs ───────────────────────────────────────────────
  fs.mkdirSync(FONT_OUT_DIR, { recursive: true });

  // ── Fetch CSS for each slot (all weights + italics) ──────────────────
  const allCssParts: string[] = [];
  const manifestEntries: { family: string; path: string; weight: number; style: string }[] = [];
  // Map source URL → local path so every @font-face rule pointing to the
  // same file gets the same rewritten URL.
  const urlToLocalPath = new Map<string, string>();

  for (const slot of slots) {
    const family = slot.config.webfont.family;
    const familySlug = family.toLowerCase().replace(/\s+/g, "-");
    const url = buildBunnyFontUrl(family, slot.config.weights, slot.config.italic, slot.opts);
    console.log(`  Fetching CSS: ${family}`);
    const { buffer: cssBuf } = await download(url);
    let css = new TextDecoder().decode(cssBuf);

    const faces = parseFontFaces(css);

    // ── Download each font file, rewrite URLs ──────────────────────────
    for (const face of faces) {
      const srcUrl = face.src;

      // Already seen this URL → reuse the same local path.
      if (!urlToLocalPath.has(srcUrl)) {
        const originalName = urlFilename(srcUrl);
        const localFile = `${familySlug}-${originalName}`;
        console.log(`    Downloading: ${originalName}`);
        const { buffer: fontBuf } = await download(srcUrl);
        fs.writeFileSync(path.join(FONT_OUT_DIR, localFile), Buffer.from(fontBuf));
        urlToLocalPath.set(srcUrl, `/font/self-hosted/${localFile}`);
      }

      // Rewrite CSS src URL using the consistent local path.
      const localPath = urlToLocalPath.get(srcUrl)!;
      css = css.replace(srcUrl, localPath);

      // Build manifest entry for critical weights
      const weight = parseInt(face.fontWeight) || 400;
      const isNormal = face.style === "normal" || face.style === "Regular";
      const isLatin =
        face.unicodeRange.includes("U+0000-00FF") || face.unicodeRange.includes("U+0000");
      if (isNormal && isLatin) {
        manifestEntries.push({
          family: face.family || family,
          path: localPath,
          weight,
          style: "normal",
        });
      }
    }

    allCssParts.push(`/* ${family} */\n${css}`);
  }

  // ── Write combined CSS ────────────────────────────────────────────────
  const combinedCss = allCssParts.join("\n\n");
  fs.writeFileSync(CSS_FILE, combinedCss);
  console.log(`  Wrote: ${CSS_FILE} (${combinedCss.length} bytes)`);

  // ── Write font manifest (Latin-normal subset for preload links) ──────
  const criticalWeights = new Set([400, 500, 700, 900]);
  const criticalManifest = manifestEntries.filter((e) => criticalWeights.has(e.weight));
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(criticalManifest, null, 2));
  console.log(`  Wrote: ${MANIFEST_FILE} (${criticalManifest.length} entries)`);

  // ── Write flag ────────────────────────────────────────────────────────
  writeFlag(true);

  console.log(
    `[download-webfonts] Done — ${urlToLocalPath.size} font files downloaded to ${FONT_OUT_DIR}`
  );
}

function writeFlag(value: boolean): void {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ primaryFontConfig, secondaryFontConfig, monoFontConfig }))
    .digest("hex")
    .slice(0, 16);
  const content = `// Auto-generated by scripts/download-webfonts.ts
// When true, layout.tsx uses self-hosted font files instead of fonts.bunny.net.
// Config hash: ${hash} — regenerated when font config or source URLs change.
export const SELF_HOSTED = ${value};\n`;
  fs.mkdirSync(path.dirname(FLAG_FILE), { recursive: true });
  fs.writeFileSync(FLAG_FILE, content);
}

main().catch((err) => {
  console.error("[download-webfonts] Failed:", err);
  // Write a flag saying fonts are NOT self-hosted so the build continues
  // using bunny.net as fallback.
  writeFlag(false);
  fs.mkdirSync(path.dirname(CSS_FILE), { recursive: true });
  fs.writeFileSync(CSS_FILE, "");
  fs.writeFileSync(MANIFEST_FILE, "[]\n");
  process.exitCode = 1;
});
