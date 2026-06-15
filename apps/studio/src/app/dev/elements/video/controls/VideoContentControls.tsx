import { useRef, useState } from "react";
import {
  hasAllowedFileExtension,
  useObjectUrlRegistry,
} from "@/app/dev/elements/_shared/asset-input-utils";
import { VIDEO_MODULE_PRESET_OPTIONS } from "../constants";
import type { VideoVariantDefaults } from "../types";
import type { VideoElementDevController } from "../useVideoElementDevController";

function linkRef(link: { ref?: string } | undefined): string {
  return typeof link?.ref === "string" ? link.ref : "";
}

function resolveModuleSelectValue(moduleKey: string | undefined): string {
  if (!moduleKey) return "";
  const isPreset = VIDEO_MODULE_PRESET_OPTIONS.some((option) => option.key === moduleKey);
  return isPreset ? moduleKey : "__custom__";
}

export function VideoContentControls({ controller }: { controller: VideoElementDevController }) {
  const { active, activeVariant, setVariantPatch, setVariantExact, normalizeVariant } = controller;
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const posterFileInputRef = useRef<HTMLInputElement | null>(null);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const { replaceTrackedObjectUrl, revokeTrackedObjectUrl } = useObjectUrlRegistry();

  const applyNormalizedPatch = (patch: Partial<VideoVariantDefaults>) => {
    const next = normalizeVariant(active, patch);
    setVariantExact(activeVariant, next);
  };

  const handleVideoUpload = (file: File | null) => {
    if (!file) return;
    const validFile =
      file.type.startsWith("video/") ||
      hasAllowedFileExtension(file.name, [".mp4", ".webm", ".mov", ".m4v", ".ogg"]);
    if (!validFile) {
      setAssetError("Invalid file type. Upload .mp4, .webm, .mov, .m4v, or .ogg.");
      setAssetMessage(null);
      return;
    }
    const nextSrc = replaceTrackedObjectUrl(active.src, file);
    applyNormalizedPatch({ src: nextSrc });
    setAssetError(null);
    setAssetMessage(`Uploaded video: ${file.name}`);
  };

  const handlePosterUpload = (file: File | null) => {
    if (!file) return;
    const validFile =
      file.type.startsWith("image/") ||
      hasAllowedFileExtension(file.name, [".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);
    if (!validFile) {
      setAssetError("Invalid poster file type. Upload an image file.");
      setAssetMessage(null);
      return;
    }
    const nextPoster = replaceTrackedObjectUrl(active.poster, file);
    applyNormalizedPatch({ poster: nextPoster });
    setAssetError(null);
    setAssetMessage(`Uploaded poster: ${file.name}`);
  };

  return (
    <>
      <div className="sm:col-span-2 rounded border border-border/60 bg-muted/20 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Content
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Source, poster, accessibility, and optional link/module wiring. Maps to{" "}
          <code>elementVideo</code> content fields.
        </p>
      </div>

      <div className="sm:col-span-2 space-y-2 rounded border border-border/60 bg-muted/10 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Asset Input
        </p>

        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Upload
          </span>
          <div className="flex flex-wrap gap-2">
            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.m4v,.ogg"
              className="sr-only"
              onChange={(event) => {
                handleVideoUpload(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <input
              ref={posterFileInputRef}
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.avif,.gif"
              className="sr-only"
              onChange={(event) => {
                handlePosterUpload(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
              onClick={() => videoFileInputRef.current?.click()}
            >
              Upload Video
            </button>
            <button
              type="button"
              className="rounded border border-border px-2 py-1 text-[10px] font-mono text-foreground hover:bg-muted"
              onClick={() => posterFileInputRef.current?.click()}
            >
              Upload Poster
            </button>
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Paste
          </span>
          <p className="text-[10px] text-muted-foreground">
            Paste direct URLs into Video source and Poster below when upload is not available.
          </p>
        </label>

        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Apply
          </span>
          <p className="text-[10px] text-muted-foreground">
            Uploads patch only <code>src</code> and <code>poster</code>; fit, aspect, and animation
            settings stay unchanged.
          </p>
        </label>

        {assetError ? <p className="text-[10px] text-rose-300">{assetError}</p> : null}
        {assetMessage ? <p className="text-[10px] text-muted-foreground">{assetMessage}</p> : null}
      </div>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Video source
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.src ?? ""}
          onChange={(e) => {
            revokeTrackedObjectUrl(active.src);
            applyNormalizedPatch({ src: e.target.value || undefined });
          }}
          placeholder="Bunny asset key or URL"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Poster
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.poster ?? ""}
          onChange={(e) => {
            revokeTrackedObjectUrl(active.poster);
            applyNormalizedPatch({ poster: e.target.value || undefined });
          }}
          placeholder="Poster URL (optional in dev preview)"
        />
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Aria label
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.ariaLabel ?? ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, { ariaLabel: e.target.value || undefined })
          }
          placeholder="Video"
        />
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Link ref
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={linkRef(active.link)}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              link: e.target.value
                ? { ref: e.target.value, external: active.link?.external ?? false }
                : undefined,
            })
          }
          placeholder="/work/reel or #anchor"
        />
      </label>

      <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground">
        <input
          type="checkbox"
          checked={active.link?.external === true}
          onChange={(e) =>
            setVariantPatch(activeVariant, {
              link: active.link?.ref
                ? { ref: active.link.ref, external: e.target.checked }
                : undefined,
            })
          }
        />
        Link is external
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Module preset
        </span>
        <select
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={resolveModuleSelectValue(active.module)}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "__custom__") return;
            setVariantPatch(activeVariant, { module: next || undefined });
          }}
        >
          <option value="">No module overlay</option>
          {VIDEO_MODULE_PRESET_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
          <option value="__custom__">Custom key (use field below)</option>
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Module key
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={active.module ?? ""}
          onChange={(e) => setVariantPatch(activeVariant, { module: e.target.value || undefined })}
          placeholder="Optional module id (e.g. video-player)"
        />
      </label>
    </>
  );
}
