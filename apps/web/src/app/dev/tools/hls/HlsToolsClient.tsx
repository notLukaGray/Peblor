"use client";

/* eslint-disable max-lines */

import { useMemo, useRef, useState } from "react";

const DEV_TOOLS_BASE_URL = process.env.NEXT_PUBLIC_DEV_TOOLS_URL ?? "http://localhost:4319";
const DEV_HLS_URL =
  process.env.NEXT_PUBLIC_DEV_HLS_URL ?? `${DEV_TOOLS_BASE_URL}/tools/hls/convert`;
const DEV_HLS_POSTER_URL = `${DEV_TOOLS_BASE_URL}/tools/hls/poster`;
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import {
  DEFAULT_CODECS,
  DEFAULT_HEIGHTS,
  Field,
  controlClassName,
  type HlsCodec,
} from "./hls-tools-ui";
import { HlsConversionOptions, HlsPathSection } from "./HlsToolSections";
import { HlsPosterSection } from "./HlsPosterSection";
import {
  buildElementSnippet,
  buildSrcSnippet,
  canRunConversion,
  conversionSucceeded,
  conversionButtonLabel,
  fallbackText,
  requestLocalPath,
  streamTextResponse,
} from "./hls-tools-client-helpers";

export function HlsToolsClient() {
  const [inputPath, setInputPath] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [assetFolder, setAssetFolder] = useState("work/project-demo/hls");
  const [segmentSeconds, setSegmentSeconds] = useState("4");
  const [preset, setPreset] = useState("fast");
  const [qualityPreset, setQualityPreset] = useState("balanced");
  const [tune, setTune] = useState("");
  const [posterSecond, setPosterSecond] = useState("1");
  const [pickerStatus, setPickerStatus] = useState("");
  const [selectedCodecs, setSelectedCodecs] = useState<HlsCodec[]>([...DEFAULT_CODECS]);
  const [selectedHeights, setSelectedHeights] = useState<string[]>(
    DEFAULT_HEIGHTS.filter((h) => h !== "360")
  );
  const [log, setLog] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [isExtractingPoster, setIsExtractingPoster] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const srcSnippet = useMemo(
    () => buildSrcSnippet(assetFolder, selectedCodecs),
    [assetFolder, selectedCodecs]
  );
  const elementSnippet = useMemo(
    () => buildElementSnippet(assetFolder, selectedCodecs),
    [assetFolder, selectedCodecs]
  );
  const canConvert = canRunConversion({
    isRunning,
    selectedCodecCount: selectedCodecs.length,
    selectedHeightCount: selectedHeights.length,
    inputPath,
    outputDir,
  });

  function toggleCodec(codec: HlsCodec) {
    setSelectedCodecs((current) =>
      current.includes(codec) ? current.filter((entry) => entry !== codec) : [...current, codec]
    );
  }

  function toggleHeight(height: string) {
    setSelectedHeights((current) =>
      current.includes(height) ? current.filter((entry) => entry !== height) : [...current, height]
    );
  }

  async function pickLocalPath(mode: "file" | "folder") {
    setPickerStatus(mode === "file" ? "Opening video picker..." : "Opening folder picker...");
    try {
      const selectedPath = await requestLocalPath(mode);
      if (selectedPath && mode === "file") setInputPath(selectedPath);
      if (selectedPath && mode === "folder") setOutputDir(selectedPath);
      setPickerStatus("");
    } catch (error) {
      setPickerStatus((error as Error).message || "Path picker failed.");
    }
  }

  async function runConversion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning) return;

    setIsRunning(true);
    setLog("");
    setConversionComplete(false);
    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch(DEV_HLS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputPath,
          outputDir,
          heights: selectedHeights.map((height) => Number(height)),
          segmentSeconds: Number(segmentSeconds),
          preset,
          qualityPreset,
          tune: tune || undefined,
          codecs: selectedCodecs,
        }),
        signal: abortController.signal,
      });

      const nextLog = await streamTextResponse(response, setLog);
      setConversionComplete(response.ok && conversionSucceeded(nextLog));
    } catch (error) {
      const msg = (error as { name?: string; message?: string }).message || "Conversion failed.";
      if ((error as { name?: string }).name === "AbortError") {
        setLog((current) => `${current}\nConversion cancelled.`);
      } else if (/Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED/.test(msg)) {
        setLog("HLS side-server not running.\n\nStart: npm run dev:hls\n\nThen retry.");
      } else {
        setLog(msg);
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }

  function cancelConversion() {
    abortRef.current?.abort();
  }

  async function extractPoster() {
    setIsExtractingPoster(true);
    try {
      const response = await fetch(DEV_HLS_POSTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputDir,
          posterSecond: Number(posterSecond),
        }),
      });
      const text = await response.text();
      setLog((current) => `${current}\n${text}`);
    } catch (error) {
      const msg = (error as { message?: string }).message || "Poster extraction failed.";
      if (/Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED/.test(msg)) {
        setLog("HLS side-server not running.\n\nStart: npm run dev:tools\n\nThen retry.");
      } else {
        setLog((current) => `${current}\n${msg}`);
      }
    } finally {
      setIsExtractingPoster(false);
    }
  }

  return (
    <DevWorkbenchPageShell nav={<DevWorkbenchNav />}>
      <DevWorkbenchPageHeader
        eyebrow="Dev · Tools"
        title="HLS Converter"
        description="Run a local HLS conversion from a source video into a folder for Bunny Storage/CDN."
        affects="local files via ffmpeg/ffprobe on this machine"
        meta="Requires ffmpeg and ffprobe on your PATH. Does not upload files or modify content JSON."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
        <form onSubmit={runConversion} className="space-y-5">
          <HlsPathSection
            inputPath={inputPath}
            outputDir={outputDir}
            onPickInput={() => pickLocalPath("file")}
            onPickOutput={() => pickLocalPath("folder")}
            onInputPathChange={setInputPath}
            onOutputDirChange={setOutputDir}
          />
          <p className="min-h-4 font-mono text-[11px] text-muted-foreground">{pickerStatus}</p>

          <HlsConversionOptions
            selectedCodecs={selectedCodecs}
            selectedHeights={selectedHeights}
            segmentSeconds={segmentSeconds}
            preset={preset}
            qualityPreset={qualityPreset}
            tune={tune}
            onToggleCodec={toggleCodec}
            onToggleHeight={toggleHeight}
            onSegmentSecondsChange={setSegmentSeconds}
            onPresetChange={setPreset}
            onQualityPresetChange={setQualityPreset}
            onTuneChange={setTune}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={!canConvert}
              className="rounded border border-foreground/30 bg-foreground px-4 py-2 text-[12px] font-mono text-background transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {conversionButtonLabel(isRunning)}
            </button>
            <button
              type="button"
              onClick={cancelConversion}
              disabled={!isRunning}
              className="rounded border border-border px-4 py-2 text-[12px] font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
          </div>

          <HlsPosterSection
            outputDir={outputDir}
            selectedCodecs={selectedCodecs}
            conversionComplete={conversionComplete}
            isExtracting={isExtractingPoster}
            posterSecond={posterSecond}
            onPosterSecondChange={setPosterSecond}
            onExtractPoster={extractPoster}
          />

          <section className="rounded-lg border border-border bg-card/20 p-4">
            <div className="grid gap-4">
              <Field
                label="Bunny asset folder"
                hint="Use after uploading output to same path on Bunny."
              >
                <input
                  value={assetFolder}
                  onChange={(e) => setAssetFolder(e.target.value)}
                  placeholder="work/project-demo/hls"
                  className={controlClassName()}
                />
              </Field>
              <div className="rounded border border-border bg-background p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  elementVideo src
                </p>
                <code className="break-all font-mono text-[12px] text-foreground">
                  {srcSnippet || "Set an asset folder to build the source path."}
                </code>
              </div>
            </div>
          </section>
        </form>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card/20 p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Suggested JSON
            </p>
            <pre className="max-h-64 overflow-auto rounded border border-border bg-background p-3 text-[11px] leading-5 text-muted-foreground">
              {fallbackText(elementSnippet, "Set an asset folder first.")}
            </pre>
          </section>
          <section className="rounded-lg border border-border bg-card/20 p-4">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Conversion log
            </p>
            <pre className="min-h-[26rem] max-h-[42rem] overflow-auto whitespace-pre-wrap rounded border border-border bg-background p-3 font-mono text-[11px] leading-5 text-muted-foreground">
              {fallbackText(log, "Ready.")}
            </pre>
          </section>
        </aside>
      </div>
    </DevWorkbenchPageShell>
  );
}
