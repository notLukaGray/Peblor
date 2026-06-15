/**
 * Downloads variable webfont files from Google Fonts at build time
 * and saves them locally so they're served from Vercel's edge.
 *
 * Google Fonts (fonts.gstatic.com) serves true variable woff2 files
 * when requested with a browser User-Agent. Bunny CDN only serves
 * individual weight files, so we fetch CSS from Google Fonts directly.
 *
 * Run before `next build` / `next dev` — idempotent: skips if already downloaded.
 *
 * Generated CSS:
 *   Each variable font file gets TWO @font-face rules for font-display
 *   optimization:
 *     - Body weights (100-699) → font-display: optional (no FOUT)
 *     - Heading weights (700-900) → font-display: swap (critical for LCP)
 *   The browser downloads each file only once even with multiple
 *   @font-face declarations pointing to the same src URL.
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
import { getVariableWghtRange } from "../apps/web/src/app/fonts/webfont";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FONT_OUT_DIR = path.join(ROOT, "apps/web/public/font/self-hosted");
const FLAG_FILE = path.join(ROOT, "apps/web/src/app/fonts/self-hosted-flag.ts");
const CSS_FILE = path.join(ROOT, "apps/web/src/app/fonts/webfonts.css");
const MANIFEST_FILE = path.join(ROOT, "apps/web/src/app/fonts/webfont-manifest.json");

const FONT_STYLESHEET_BASE = "https://fonts.googleapis.com/css2?family=";
/**
 * Browser User-Agent — required by Google Fonts API to return variable
 * woff2 files. Without it, Google returns TTF or individual weights.
 */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface FontFaceDescriptor {
  family: string;
  style: string;
  fontWeight: string;
  src: string;
  unicodeRange: string;
}

/** Download with retries, returns ArrayBuffer. */
async function download(
  url: string,
  retries = 2
): Promise<{ buffer: ArrayBuffer; contentType: string | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": BROWSER_UA },
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
  throw new Error("unreachable");
}

/** Parse @font-face rules from CSS text. */
function parseFontFaces(css: string): FontFaceDescriptor[] {
  const results: FontFaceDescriptor[] = [];
  const blockRe = /@font-face\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(css)) !== null) {
    const body = match[1]!;
    const desc: Record<string, string> = {};
    const propRe = /\s*([\w-]+)\s*:\s*([^;]+)\s*;?/g;
    let propMatch: RegExpExecArray | null;
    while ((propMatch = propRe.exec(body)) !== null) {
      if (propMatch[1] && propMatch[2]) {
        desc[propMatch[1].trim()] = propMatch[2].trim();
      }
    }
    const srcMatch = /url\(([^)]+)\)/.exec(desc.src ?? "");
    if (srcMatch?.[1]) {
      const url = srcMatch[1].replace(/['"]/g, "");
      results.push({
        family: (desc["font-family"] ?? "").replace(/['"]/g, ""),
        style: desc["font-style"] ?? "normal",
        fontWeight: desc["font-weight"] ?? "400",
        src: url,
        unicodeRange: desc["unicode-range"] ?? "",
      });
    }
  }
  return results;
}

/** Build a Google Fonts CSS2 URL for a variable font family and weight range. */
function buildGoogleFontUrl(family: string, weightMin: number, weightMax: number): string {
  // Google Fonts CSS2 API uses the original family name with spaces as +,
  // not a lowercase kebab-case slug. Urbanist ≠ urbanist.
  const encoded = family.replace(/\s+/g, "+");
  return `${FONT_STYLESHEET_BASE}${encoded}:wght@${weightMin}..${weightMax}&display=swap`;
}

/**
 * Check if a unicode range is wanted for this family.
 * We keep Latin, Latin Extended, and Intel One Mono symbols2.
 * Drops Greek, Cyrillic, Cyrillic-Ext, Vietnamese.
 */
function isWantedSubset(unicodeRange: string, family: string): boolean {
  if (unicodeRange.includes("U+0000-00FF") || unicodeRange.startsWith("U+0000")) return true;
  if (unicodeRange.includes("U+0100-02BA")) return true;
  if (
    family.toLowerCase().includes("intel one mono") &&
    (unicodeRange.includes("U+2500-259F") || unicodeRange.includes("U+23B8"))
  ) {
    return true;
  }
  return false;
}

/**
 * Generate the body-weight @font-face rule for a variable font.
 * Body weights get font-display: optional to avoid FOUT.
 */
function generateBodyFontFace(face: FontFaceDescriptor, localPath: string): string {
  // Split the weight range at 699 for body
  const raw = face.fontWeight; // e.g. "100 900" or "300 700"
  const parts = raw.split(" ");
  const min = parts[0]!;
  const bodyMax = Math.min(Number(parts[1] ?? min), 699);

  return [
    `@font-face {`,
    `  font-family: '${face.family}';`,
    `  font-style: ${face.style};`,
    `  font-weight: ${min} ${bodyMax};`,
    `  font-display: optional;`,
    `  src: url(${localPath}) format("woff2");`,
    face.unicodeRange ? `  unicode-range: ${face.unicodeRange};` : "",
    `}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generate the heading-weight @font-face rule for a variable font.
 * Heading weights (>= 700) get font-display: swap for LCP.
 */
function generateHeadingFontFace(face: FontFaceDescriptor, localPath: string): string | null {
  const raw = face.fontWeight;
  const parts = raw.split(" ");
  const max = Number(parts[1] ?? parts[0]!);

  // Skip if the range doesn't include any heading weights
  if (max < 700) return null;

  const headingMin = 700;
  const headingMax = max;
  const display = "swap";

  return [
    `@font-face {`,
    `  font-family: '${face.family}';`,
    `  font-style: ${face.style};`,
    `  font-weight: ${headingMin} ${headingMax};`,
    `  font-display: ${display};`,
    `  src: url(${localPath}) format("woff2");`,
    face.unicodeRange ? `  unicode-range: ${face.unicodeRange};` : "",
    `}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function main(): Promise<void> {
  // ── Idempotency check via config hash ──────────────────────────────────
  const configHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ primaryFontConfig, secondaryFontConfig, monoFontConfig }))
    .digest("hex")
    .slice(0, 16);

  if (fs.existsSync(FLAG_FILE) && fs.existsSync(CSS_FILE) && fs.existsSync(MANIFEST_FILE)) {
    const flag = fs.readFileSync(FLAG_FILE, "utf-8");
    if (flag.includes(`SELF_HOSTED = true`) && flag.includes(configHash)) {
      // Verify the exact font files listed in the manifest exist on disk.
      // A simple "any .woff2?" check can be fooled by stale files from a
      // previous download (e.g. per-weight files left over after switching
      // to variable fonts).  Walk the manifest and confirm every entry.
      let manifestOk = false;
      try {
        const manifestRaw = fs.readFileSync(MANIFEST_FILE, "utf-8");
        const manifest = JSON.parse(manifestRaw) as { path: string }[];
        manifestOk =
          manifest.length > 0 &&
          manifest.every((entry) => {
            const abs = path.join(ROOT, "apps/web/public", entry.path);
            return fs.existsSync(abs);
          });
      } catch {
        // Corrupt or missing manifest — re-download.
      }
      if (manifestOk) {
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

  console.log("[download-webfonts] Downloading variable webfonts from Google Fonts…");

  // ── Collect webfont slots with variable ranges ─────────────────────────
  const slots: {
    config: FontSlotConfig;
    label: string;
    range: { min: number; max: number };
  }[] = [];
  if (primaryFontConfig.source === "webfont") {
    const range = getVariableWghtRange(primaryFontConfig);
    if (range) slots.push({ config: primaryFontConfig, label: "primary", range });
  }
  if (secondaryFontConfig.source === "webfont") {
    const range = getVariableWghtRange(secondaryFontConfig);
    if (range) slots.push({ config: secondaryFontConfig, label: "secondary", range });
  }
  if (monoFontConfig.source === "webfont") {
    const range = getVariableWghtRange(monoFontConfig);
    if (range) slots.push({ config: monoFontConfig, label: "mono", range });
  }

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

  // ── Fetch CSS for each slot ───────────────────────────────────────────
  const allCssParts: string[] = [];
  const manifestEntries: { family: string; path: string; weight: number; style: string }[] = [];
  // Map Google Fonts CDN URL → local path (deduplicates shared files)
  const urlToLocalPath = new Map<string, string>();

  for (const slot of slots) {
    const family = slot.config.webfont.family;
    const familySlug = family.toLowerCase().replace(/\s+/g, "-");

    // Fetch variable font CSS from Google Fonts
    const gfUrl = buildGoogleFontUrl(family, slot.range.min, slot.range.max);
    console.log(`  Fetching CSS: ${family}`);
    const { buffer: cssBuf } = await download(gfUrl);
    const css = new TextDecoder().decode(cssBuf);

    const faces = parseFontFaces(css);

    // Filter to only wanted subsets (Latin, Latin-Ext, Mono symbols2)
    const wantedFaces = faces.filter((face) => isWantedSubset(face.unicodeRange, family));

    if (wantedFaces.length === 0) {
      console.warn(`    No wanted subsets found for ${family}`);
      continue;
    }

    // ── Download each unique font file ───────────────────────────────────
    // For variable fonts, each unicode range has ONE file.
    const faceCssParts: string[] = [];

    for (const face of wantedFaces) {
      const srcUrl = face.src;

      if (!urlToLocalPath.has(srcUrl)) {
        const { buffer: fontBuf } = await download(srcUrl);
        // Content hash for cache busting
        const hash = crypto
          .createHash("md5")
          .update(Buffer.from(fontBuf))
          .digest("hex")
          .slice(0, 8);
        // Derive readable filename from the subset name
        const subset = face.unicodeRange.includes("U+2500-259F") ? "symbols2" : "";
        const subsetLabel =
          subset || (face.unicodeRange.includes("U+0100-02BA") ? "latin-ext" : "latin");
        const localFile = `${familySlug}-${subsetLabel}-variable.${hash}.woff2`;
        console.log(`    Downloading: ${localFile}`);
        fs.writeFileSync(path.join(FONT_OUT_DIR, localFile), Buffer.from(fontBuf));
        urlToLocalPath.set(srcUrl, `/font/self-hosted/${localFile}`);
      }

      const localPath = urlToLocalPath.get(srcUrl)!;

      // Generate two @font-face rules: body (optional) + heading (swap)
      const bodyRule = generateBodyFontFace(face, localPath);
      const headingRule = generateHeadingFontFace(face, localPath);

      faceCssParts.push(bodyRule);
      if (headingRule) {
        faceCssParts.push(headingRule);
      }

      // Build manifest entry for variable font (weight === 0 signals variable).
      // Record ALL downloaded files so the idempotency check can verify
      // every font file exists on disk — not just latin subsets.
      const isNormal = face.style === "normal" || face.style === "Regular";
      if (isNormal) {
        manifestEntries.push({
          family: face.family || family,
          path: localPath,
          weight: 0,
          style: "normal",
        });
      }
    }

    allCssParts.push(`/* ${family} */\n${faceCssParts.join("\n\n")}`);
  }

  // ── Write combined CSS ────────────────────────────────────────────────
  const combinedCss = allCssParts.join("\n\n");
  fs.writeFileSync(CSS_FILE, combinedCss);
  console.log(`  Wrote: ${CSS_FILE} (${combinedCss.length} bytes)`);

  // ── Write font manifest — variable font entries (weight === 0) ────────
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifestEntries, null, 2));
  console.log(`  Wrote: ${MANIFEST_FILE} (${manifestEntries.length} entries)`);

  // ── Write flag ────────────────────────────────────────────────────────
  writeFlag(true);

  console.log(
    `[download-webfonts] Done — ${urlToLocalPath.size} variable font files downloaded to ${FONT_OUT_DIR}`
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
