import {
  DEFAULT_HEIGHTS,
  Field,
  HLS_CODEC_OPTIONS,
  BITRATE_PROFILES,
  ENCODER_SPEEDS,
  SEGMENT_SECONDS_OPTIONS,
  TUNE_OPTIONS,
  controlClassName,
  type HlsCodec,
} from "./hls-tools-ui";

type PathSectionProps = {
  inputPath: string;
  outputDir: string;
  onPickInput: () => void;
  onPickOutput: () => void;
  onInputPathChange: (value: string) => void;
  onOutputDirChange: (value: string) => void;
};

type ConversionOptionsProps = {
  selectedCodecs: HlsCodec[];
  selectedHeights: string[];
  segmentSeconds: string;
  preset: string;
  qualityPreset: string;
  tune: string;
  onToggleCodec: (codec: HlsCodec) => void;
  onToggleHeight: (height: string) => void;
  onSegmentSecondsChange: (value: string) => void;
  onPresetChange: (value: string) => void;
  onQualityPresetChange: (value: string) => void;
  onTuneChange: (value: string) => void;
};

function pickerButtonClassName(): string {
  return "rounded border border-foreground/30 bg-foreground px-3 py-2 text-[12px] font-mono text-background transition-colors hover:opacity-90";
}

export function HlsPathSection({
  inputPath,
  outputDir,
  onPickInput,
  onPickOutput,
  onInputPathChange,
  onOutputDirChange,
}: PathSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card/20 p-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Source video
          </p>
          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)]">
            <button type="button" onClick={onPickInput} className={pickerButtonClassName()}>
              Select video
            </button>
            <input
              value={inputPath}
              onChange={(event) => onInputPathChange(event.target.value)}
              placeholder="No source video selected."
              className={controlClassName()}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Output folder
          </p>
          <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)]">
            <button type="button" onClick={onPickOutput} className={pickerButtonClassName()}>
              Select folder
            </button>
            <input
              value={outputDir}
              onChange={(event) => onOutputDirChange(event.target.value)}
              placeholder="No output folder selected."
              className={controlClassName()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HlsConversionOptions({
  selectedCodecs,
  selectedHeights,
  segmentSeconds,
  preset,
  qualityPreset,
  tune,
  onToggleCodec,
  onToggleHeight,
  onSegmentSecondsChange,
  onPresetChange,
  onQualityPresetChange,
  onTuneChange,
}: ConversionOptionsProps) {
  return (
    <section className="rounded-lg border border-border bg-card/20 p-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Codec outputs
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {HLS_CODEC_OPTIONS.map((codec) => (
              <label
                key={codec.value}
                className="grid cursor-pointer gap-1 rounded border border-border px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <span className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCodecs.includes(codec.value)}
                    onChange={() => onToggleCodec(codec.value)}
                  />
                  <span className="font-mono">{codec.label}</span>
                </span>
                <span className="leading-relaxed text-muted-foreground/70">{codec.detail}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            Playback order: VP9 → x265 → x264. The runtime picks the first source the browser
            supports. VP9 exports as WebM DASH; x265 and x264 as HLS.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Bitrate profile">
            <select
              value={qualityPreset}
              onChange={(e) => onQualityPresetChange(e.target.value)}
              className={controlClassName()}
            >
              {BITRATE_PROFILES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Encoder speed">
            <select
              value={preset}
              onChange={(e) => onPresetChange(e.target.value)}
              className={controlClassName()}
            >
              {ENCODER_SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {speed}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Segment duration">
            <select
              value={segmentSeconds}
              onChange={(e) => onSegmentSecondsChange(e.target.value)}
              className={controlClassName()}
            >
              {SEGMENT_SECONDS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tune">
            <select
              value={tune}
              onChange={(e) => onTuneChange(e.target.value)}
              className={controlClassName()}
            >
              {TUNE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          Encoder speed applies to x264 and x265 only — VP9 uses its own fixed setting. Film and
          grain tunes apply to x264 only; animation applies to both.
        </p>

        <div className="grid gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Renditions
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_HEIGHTS.map((height) => (
              <label
                key={height}
                className="inline-flex cursor-pointer items-center gap-2 rounded border border-border px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedHeights.includes(height)}
                  onChange={() => onToggleHeight(height)}
                />
                <span className="font-mono">{height}p</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
