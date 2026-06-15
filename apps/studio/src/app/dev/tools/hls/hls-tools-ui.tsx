export const DEFAULT_HEIGHTS = ["2160", "1080", "720", "480", "360"];
export const DEFAULT_CODECS = ["vp9", "x264"] as const;

export type HlsCodec = "vp9" | "x265" | "x264";

export const HLS_CODEC_OPTIONS: Array<{
  value: HlsCodec;
  label: string;
  detail: string;
}> = [
  { value: "vp9", label: "VP9", detail: "Primary when supported, WebM DASH" },
  { value: "x265", label: "x265", detail: "HEVC option, fMP4 HLS" },
  { value: "x264", label: "x264", detail: "Compatibility fallback, TS HLS" },
];

export const BITRATE_PROFILES = [
  { value: "small", label: "Smaller files (0.62×)" },
  { value: "balanced", label: "Balanced (1.0×)" },
  { value: "high", label: "Higher quality (1.4×)" },
] as const;

export const ENCODER_SPEEDS = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
] as const;

export const SEGMENT_SECONDS_OPTIONS = ["2", "4", "6", "8", "10", "12"] as const;

export const TUNE_OPTIONS = [
  { value: "", label: "None" },
  { value: "film", label: "Film — live action, low noise (x264 only)" },
  { value: "animation", label: "Animation — flat areas, high contrast" },
  { value: "grain", label: "Grain — preserve original film grain" },
] as const;

export function controlClassName(): string {
  return "rounded border border-border bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring";
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-mono uppercase tracking-wide">{label}</span>
      {children}
      {hint ? (
        <span className="text-[11px] leading-relaxed text-muted-foreground/70">{hint}</span>
      ) : null}
    </label>
  );
}
