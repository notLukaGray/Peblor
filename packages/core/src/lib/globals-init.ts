import fs from "fs";
import path from "path";
import { configureCoreGlobals } from "./globals";
import { resolveContentDir as resolveContentDirFromConfig } from "./peblor-config";

function resolveContentDir(): string | null {
  const resolved = resolveContentDirFromConfig();
  return fs.existsSync(resolved) ? resolved : null;
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function initCoreGlobalsFromContent(): void {
  const contentDir = resolveContentDir();
  if (!contentDir) return;

  const patch: Record<string, unknown> = {};

  const personConfig = readJsonFile(path.join(contentDir, "site", "person.json"));
  if (personConfig && typeof personConfig.assetBaseUrl === "string") {
    patch.assetBaseUrl = personConfig.assetBaseUrl;
  }

  const cdnConfig = readJsonFile(path.join(contentDir, "config", "cdn.json"));
  if (cdnConfig) {
    if (typeof cdnConfig.cdnBase === "string") {
      patch.cdnBase = cdnConfig.cdnBase;
    }

    const cdn = cdnConfig.cdn as Record<string, unknown> | undefined;
    if (cdn) {
      if (typeof cdn.tokenExpiryDays === "number") {
        patch.cdnTokenExpiryDays = cdn.tokenExpiryDays;
      }
      if (
        Array.isArray(cdn.allowedExtensions) &&
        cdn.allowedExtensions.every((e: unknown) => typeof e === "string")
      ) {
        patch.cdnAllowedExtensions = [...cdn.allowedExtensions];
      }

      const images = cdn.images as Record<string, unknown> | undefined;
      if (images) {
        if (typeof images.defaultWidth === "number") patch.imageDefaultWidth = images.defaultWidth;
        if (typeof images.defaultPosterWidth === "number")
          patch.imageDefaultPosterWidth = images.defaultPosterWidth;
        if (typeof images.posterWidth === "number") patch.imagePosterWidth = images.posterWidth;
        if (typeof images.mobileMaxWidth === "number")
          patch.imageMobileMaxWidth = images.mobileMaxWidth;
        if (typeof images.mobileMaxWidth2x === "number")
          patch.imageMobileMaxWidth2x = images.mobileMaxWidth2x;
        if (typeof images.defaultQuality === "number")
          patch.imageDefaultQuality = images.defaultQuality;
        if (typeof images.posterQuality === "number")
          patch.imagePosterQuality = images.posterQuality;
        if (typeof images.defaultFormat === "string")
          patch.imageDefaultFormat = images.defaultFormat;
        if (images.defaultAspectRatio != null && typeof images.defaultAspectRatio === "string") {
          patch.imageDefaultAspectRatio = images.defaultAspectRatio;
        }
        if (images.posterAspectRatio != null && typeof images.posterAspectRatio === "string") {
          patch.imagePosterAspectRatio = images.posterAspectRatio;
        }
        if (images.class != null && typeof images.class === "string") {
          patch.imageClass = images.class;
        }
        if (images.posterClass != null && typeof images.posterClass === "string") {
          patch.imagePosterClass = images.posterClass;
        }
      }
    }
  }

  if (Object.keys(patch).length > 0) {
    configureCoreGlobals(patch as Parameters<typeof configureCoreGlobals>[0]);
  }
}
