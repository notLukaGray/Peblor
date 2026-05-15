export type CoreGlobals = {
  assetBaseUrl: string;
  cdnBase: string;
  cdnTokenExpiryDays: number;
  cdnAllowedExtensions: string[];
  imageDefaultWidth: number;
  imageDefaultPosterWidth: number;
  imagePosterWidth: number;
  imageMobileMaxWidth: number;
  imageMobileMaxWidth2x: number;
  imageDefaultQuality: number;
  imagePosterQuality: number;
  imageDefaultFormat: string;
  imageDefaultAspectRatio: string | null;
  imagePosterAspectRatio: string | null;
  imageClass: string | null;
  imagePosterClass: string | null;
};

const DEFAULT_CORE_GLOBALS: CoreGlobals = {
  assetBaseUrl: "",
  cdnBase: "",
  cdnTokenExpiryDays: 7,
  cdnAllowedExtensions: [
    ".webm",
    ".mp4",
    ".webp",
    ".jpg",
    ".jpeg",
    ".png",
    ".avif",
    ".glb",
    ".gltf",
    ".exr",
    ".hdr",
    ".mpd",
    ".m3u8",
    ".ts",
    ".m4s",
    ".m4a",
    ".aac",
  ],
  imageDefaultWidth: 1200,
  imageDefaultPosterWidth: 1920,
  imagePosterWidth: 1280,
  imageMobileMaxWidth: 768,
  imageMobileMaxWidth2x: 1536,
  imageDefaultQuality: 75,
  imagePosterQuality: 60,
  imageDefaultFormat: "webp",
  imageDefaultAspectRatio: null,
  imagePosterAspectRatio: "16/9",
  imageClass: null,
  imagePosterClass: null,
};

let coreGlobals: CoreGlobals = { ...DEFAULT_CORE_GLOBALS };

export function getCoreGlobals(): CoreGlobals {
  return coreGlobals;
}

export function configureCoreGlobals(patch: Partial<CoreGlobals>): void {
  coreGlobals = {
    ...coreGlobals,
    ...patch,
    cdnAllowedExtensions: patch.cdnAllowedExtensions
      ? [...patch.cdnAllowedExtensions]
      : coreGlobals.cdnAllowedExtensions,
  };
}

export function resetCoreGlobals(): void {
  coreGlobals = { ...DEFAULT_CORE_GLOBALS };
}
