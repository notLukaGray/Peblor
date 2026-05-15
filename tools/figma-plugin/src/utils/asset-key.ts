/**
 * CDN asset key generation utilities.
 * Shared by converters/image.ts and converters/fills.ts.
 */

import type { ConversionContext } from "../types/figma-plugin";

/**
 * Sanitises a raw layer name into a valid CDN asset key segment.
 * - Lowercases
 * - Collapses spaces to hyphens
 * - Strips any character that isn't alphanumeric, `/`, `-`, `_`, or `.`
 * - Collapses consecutive hyphens/slashes
 */
function sanitizeAssetName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9/\-_.]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^[/\-]+|[/\-]+$/g, "");
  return normalizeSafePathSegments(sanitized);
}

function normalizeSafePathSegments(input: string): string {
  const out: string[] = [];
  for (const rawSegment of input.split("/")) {
    const segment = rawSegment.trim();
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (out.length > 0) out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.join("/");
}

function ensureSafeZipFilename(cdnKey: string): string {
  const normalized = normalizeSafePathSegments(cdnKey.replace(/\\/g, "/"));
  return `assets/${normalized || "image.png"}`;
}

/**
 * Returns the file extension of a path string (including the dot), or "" if none.
 * Only recognises extensions up to 10 chars like ".png", ".jpg", ".webp", ".svg".
 */
function fileExtension(name: string): string {
  const match = name.match(/(\.[a-z0-9]{1,10})$/i);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Builds a unique CDN asset key from a layer name and the context's cdnPrefix.
 * Applies the convention:
 *   - sanitize the name
 *   - append `.png` (or the provided `ext`) if no extension is already present
 *   - prepend cdnPrefix
 *   - check against context.usedAssetKeys; append -2/-3/... on collision
 *
 * Returns both:
 *   - `cdnKey`  — the JSON ref emitted in output (e.g. `work/project/hero/banner.png`)
 *   - `filename` — the full ZIP path          (e.g. `assets/work/project/hero/banner.png`)
 */
export function buildAssetKey(
  rawName: string,
  ctx: ConversionContext,
  ext = ".png"
): { cdnKey: string; filename: string } {
  const sanitized = sanitizeAssetName(rawName);
  const base = sanitized || "image";
  const hasExt = fileExtension(base) !== "";
  const baseWithExt = hasExt ? base : `${base}${ext}`;
  const prefixedRaw = ctx.cdnPrefix ? `${ctx.cdnPrefix}${baseWithExt}` : baseWithExt;
  const prefixed = normalizeSafePathSegments(prefixedRaw) || "image.png";

  // Collision detection — split off extension to append counter before it
  const dotIdx = prefixed.lastIndexOf(".");
  const stem = dotIdx > -1 ? prefixed.slice(0, dotIdx) : prefixed;
  const extension = dotIdx > -1 ? prefixed.slice(dotIdx) : "";

  let candidate = prefixed;
  if (ctx.usedAssetKeys.has(candidate)) {
    let counter = 2;
    do {
      candidate = `${stem}-${counter}${extension}`;
      counter++;
    } while (ctx.usedAssetKeys.has(candidate));
  }

  ctx.usedAssetKeys.add(candidate);
  return { cdnKey: candidate, filename: ensureSafeZipFilename(candidate) };
}
