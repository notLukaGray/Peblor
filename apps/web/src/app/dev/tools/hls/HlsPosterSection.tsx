import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type Hls from "hls.js";
import { Field, controlClassName, type HlsCodec } from "./hls-tools-ui";

const HLS_PREVIEW_ORDER: HlsCodec[] = ["x264", "x265"];

type PosterSectionProps = {
  outputDir: string;
  selectedCodecs: HlsCodec[];
  conversionComplete: boolean;
  isExtracting: boolean;
  posterSecond: string;
  onPosterSecondChange: (value: string) => void;
  onExtractPoster: () => void;
};

function HlsPreviewVideo({
  src,
  videoRef,
}: {
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;
    let hls: Hls | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled) return;
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(video);
        } else {
          video.src = src;
        }
      })
      .catch(() => {
        if (!cancelled) video.src = src;
      });

    return () => {
      cancelled = true;
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, videoRef]);

  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      className="w-full rounded border border-border bg-black"
    />
  );
}

export function HlsPosterSection({
  outputDir,
  selectedCodecs,
  conversionComplete,
  isExtracting,
  posterSecond,
  onPosterSecondChange,
  onExtractPoster,
}: PosterSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewSrc = useMemo(() => {
    if (!outputDir) return "";
    const selected = new Set(selectedCodecs);
    const previewCodec = HLS_PREVIEW_ORDER.find((codec) => selected.has(codec));
    if (!previewCodec) return "";
    const params = new URLSearchParams({ dir: outputDir, file: `${previewCodec}/master.m3u8` });
    return `/api/dev/local-hls-preview?${params.toString()}`;
  }, [outputDir, selectedCodecs]);
  const hasPreview = conversionComplete && previewSrc !== "";

  function useCurrentFrame() {
    const currentTime = videoRef.current?.currentTime ?? 0;
    onPosterSecondChange(currentTime.toFixed(2));
  }

  return (
    <section className="rounded-lg border border-border bg-card/20 p-4">
      <div className="grid gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Poster frame
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">
            Convert first, then scrub the converted HLS preview and extract poster.webp from the
            generated master.m3u8.
          </p>
        </div>

        {hasPreview ? (
          <HlsPreviewVideo key={previewSrc} src={previewSrc} videoRef={videoRef} />
        ) : (
          <div className="rounded border border-dashed border-border bg-background p-4 text-[11px] text-muted-foreground">
            {conversionComplete
              ? "Poster preview needs an HLS fallback output. Extract poster still works from VP9 DASH."
              : "Poster selection appears after a successful conversion."}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <Field label="Poster second">
            <input
              value={posterSecond}
              onChange={(event) => onPosterSecondChange(event.target.value)}
              inputMode="decimal"
              className={controlClassName()}
            />
          </Field>
          <button
            type="button"
            onClick={useCurrentFrame}
            disabled={!hasPreview}
            className="rounded border border-border px-3 py-2 text-[12px] font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Use current frame
          </button>
          <button
            type="button"
            onClick={onExtractPoster}
            disabled={!conversionComplete || isExtracting}
            className="rounded border border-foreground/30 bg-foreground px-3 py-2 text-[12px] font-mono text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExtracting ? "Extracting..." : "Extract poster"}
          </button>
        </div>
      </div>
    </section>
  );
}
