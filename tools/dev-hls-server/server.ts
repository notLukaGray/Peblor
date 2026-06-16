import { execSync, spawn, type ChildProcess } from "child_process";
import fs from "fs/promises";
import http from "http";
import net from "net";
import path from "path";

const PORT = Number(process.env.DEV_HLS_PORT ?? 4319);
const HOST = "127.0.0.1";
const HLS_CONVERT_PATH = "/tools/hls/convert";
const HLS_POSTER_PATH = "/tools/hls/poster";
const LEGACY_HLS_CONVERT_PATH = "/convert";

const MEDIA_ROOT = path.resolve(process.env.DEV_HLS_MEDIA_ROOT ?? process.cwd());
const DEV_TOKEN = (process.env.DEV_HLS_TOKEN ?? "").trim();
const ALLOWED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

/** ffmpeg / ffprobe children started by this process (for SIGINT/SIGTERM cleanup). */
const trackedMediaChildren = new Set<ChildProcess>();

/** Per-output-directory lock to prevent poster extraction racing with active conversion. */
const conversionLocks = new Map<string, Promise<void>>();

async function waitForConversion(outputDir: string): Promise<void> {
  const lock = conversionLocks.get(outputDir);
  if (lock) await lock;
}

function trackMediaChild(child: ChildProcess): void {
  trackedMediaChildren.add(child);
  child.once("close", () => {
    trackedMediaChildren.delete(child);
  });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Dev-Hls-Token",
} as const;

type HlsConvertRequest = {
  inputPath?: unknown;
  outputDir?: unknown;
  heights?: unknown;
  codecs?: unknown;
  segmentSeconds?: unknown;
  preset?: unknown;
  qualityPreset?: unknown;
  tune?: unknown;
};

type HlsPosterRequest = {
  outputDir?: unknown;
  posterSecond?: unknown;
};

type HlsCodec = "vp9" | "x265" | "x264";

type Variant = {
  height: number;
  bitrate: string;
  maxrate: string;
  bufsize: string;
  audioBitrate: string;
};

const VARIANTS: Variant[] = [
  { height: 2160, bitrate: "16000k", maxrate: "17120k", bufsize: "24000k", audioBitrate: "192k" },
  { height: 1080, bitrate: "5000k", maxrate: "5350k", bufsize: "7500k", audioBitrate: "128k" },
  { height: 720, bitrate: "2800k", maxrate: "2996k", bufsize: "4200k", audioBitrate: "128k" },
  { height: 480, bitrate: "1400k", maxrate: "1498k", bufsize: "2100k", audioBitrate: "96k" },
  { height: 360, bitrate: "800k", maxrate: "856k", bufsize: "1200k", audioBitrate: "96k" },
];

const PRESETS = new Set(["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow"]);
const QUALITY_MULTIPLIERS = {
  small: 0.62,
  balanced: 1,
  high: 1.4,
} as const;

const CODEC_ORDER: HlsCodec[] = ["vp9", "x265", "x264"];
const CODEC_LABELS: Record<HlsCodec, string> = {
  vp9: "VP9 WebM DASH",
  x265: "x265 fMP4 HLS",
  x264: "x264 TS HLS",
};
const CODEC_RATE_MULTIPLIERS: Record<HlsCodec, number> = {
  vp9: 0.62,
  x265: 0.58,
  x264: 1,
};

const X264_TUNES = new Set(["film", "animation", "grain", "stillimage"]);
const X265_TUNES = new Set(["animation", "grain"]);

type QualityPreset = keyof typeof QUALITY_MULTIPLIERS;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Dev-server diagnostics: include stack when the value is an Error with a stack. */
function errorMessageLine(error: unknown): string {
  return error instanceof Error ? error.message || "Error" : String(error);
}

function errorStackSuffix(error: unknown): string {
  return error instanceof Error && error.stack ? `\n${error.stack}` : "";
}

function jsonErrorBody(error: unknown): string {
  const payload: Record<string, unknown> = { error: errorMessageLine(error) };
  if (error instanceof Error && error.stack) payload.stack = error.stack;
  return JSON.stringify(payload);
}

function resolveLocalPath(value: string): string {
  const resolved = path.isAbsolute(value) ? path.normalize(value) : path.resolve(MEDIA_ROOT, value);
  const rel = path.relative(MEDIA_ROOT, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path must be inside media root: ${MEDIA_ROOT}`);
  }
  return resolved;
}

/** Reject when output would live inside the input file's directory tree (footgun for ffmpeg). */
function isUnsafeHlsOutputVsInput(inputPath: string, outputDir: string): boolean {
  const resolvedInput = path.resolve(inputPath);
  const resolvedOut = path.resolve(outputDir);
  if (resolvedOut === resolvedInput) return true;
  const inputDir = path.dirname(resolvedInput);
  const rel = path.relative(inputDir, resolvedOut);
  if (rel === "") return true;
  return !rel.startsWith("..");
}

function getAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function scaledRate(rate: string, multiplier: number): string {
  const kbps = Number(rate.replace(/k$/i, ""));
  if (!Number.isFinite(kbps)) return rate;
  return `${Math.max(96, Math.round(kbps * multiplier))}k`;
}

function parseCodecs(value: unknown): HlsCodec[] {
  const requested = Array.isArray(value)
    ? value.filter((entry): entry is HlsCodec => CODEC_ORDER.includes(entry as HlsCodec))
    : [];
  const deduped = new Set(requested);
  return CODEC_ORDER.filter((codec) => deduped.has(codec));
}

function posterArgs(masterPath: string, outputDir: string, posterSecond: number): string[] {
  return [
    "-hide_banner",
    "-y",
    "-ss",
    String(posterSecond),
    "-i",
    masterPath,
    "-frames:v",
    "1",
    "-vf",
    "scale='min(1920,iw)':-2",
    "-q:v",
    "72",
    path.join(outputDir, "poster.webp"),
  ];
}

async function findPosterSourceMaster(outputDir: string): Promise<string | null> {
  for (const relativePath of [
    path.join("x264", "master.m3u8"),
    path.join("x265", "master.m3u8"),
    path.join("vp9", "manifest.mpd"),
    "master.m3u8",
  ]) {
    const masterPath = path.join(outputDir, relativePath);
    const stat = await fs.stat(masterPath).catch((err) => {
      console.warn("[dev-hls] Failed to stat master playlist", masterPath, err);
      return null;
    });
    if (stat?.isFile()) return masterPath;
  }
  return null;
}

function runCapture(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    trackMediaChild(child);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 1_000_000) stdout = stdout.slice(-1_000_000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 1_000_000) stderr = stderr.slice(-1_000_000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

function parseFrameRate(rFrameRate: string | undefined): number {
  if (!rFrameRate) return 30;
  const [num, den] = rFrameRate.split("/").map(Number);
  if (!num || !den || den === 0) return 30;
  return num / den;
}

async function probeVideo(inputPath: string): Promise<{
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  audioChannels: number;
  fps: number;
}> {
  const { stdout } = await runCapture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_type,width,height,r_frame_rate,channels",
    "-of",
    "json",
    inputPath,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: Array<{
      codec_type?: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
      channels?: number;
    }>;
  };
  const streams = parsed.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.find((stream) => stream.codec_type === "audio");
  const rawChannels = audio?.channels ?? 0;
  return {
    width: typeof video?.width === "number" ? video.width : null,
    height: typeof video?.height === "number" ? video.height : null,
    hasAudio: rawChannels > 0,
    audioChannels: Math.min(rawChannels > 0 ? rawChannels : 2, 2),
    fps: parseFrameRate(video?.r_frame_rate),
  };
}

function buildVp9DashArgs({
  inputPath,
  outputDir,
  variants,
  hasAudio,
  audioChannels,
  segmentSeconds,
  qualityPreset,
  fps,
  sourceWidth,
  sourceHeight,
}: {
  inputPath: string;
  outputDir: string;
  variants: Variant[];
  hasAudio: boolean;
  audioChannels: number;
  segmentSeconds: number;
  qualityPreset: QualityPreset;
  fps: number;
  sourceWidth: number | null;
  sourceHeight: number | null;
}): string[] {
  const args = ["-hide_banner", "-y", "-i", inputPath];
  const qualityMultiplier = QUALITY_MULTIPLIERS[qualityPreset] * CODEC_RATE_MULTIPLIERS.vp9;

  variants.forEach(() => {
    args.push("-map", "0:v:0");
  });
  if (hasAudio) args.push("-map", "0:a:0");

  variants.forEach((variant, index) => {
    args.push(
      `-filter:v:${index}`,
      sourceWidth != null && sourceHeight != null
        ? `scale=-2:${variant.height},setdar=${sourceWidth}/${sourceHeight}`
        : `scale=-2:${variant.height}`,
      `-c:v:${index}`,
      "libvpx-vp9",
      `-b:v:${index}`,
      scaledRate(variant.bitrate, qualityMultiplier),
      `-maxrate:v:${index}`,
      scaledRate(variant.maxrate, qualityMultiplier),
      `-bufsize:v:${index}`,
      scaledRate(variant.bufsize, qualityMultiplier),
      `-pix_fmt:v:${index}`,
      "yuv420p"
    );
  });

  args.push("-deadline", "good", "-cpu-used", "4");

  if (hasAudio) {
    const audioBitrate = variants[0]?.audioBitrate ?? "128k";
    args.push(
      "-c:a:0",
      "libopus",
      "-b:a:0",
      scaledRate(audioBitrate, qualityPreset === "small" ? 0.75 : 1),
      "-ac:a:0",
      String(audioChannels)
    );
  }

  const videoStreams = variants.map((_variant, index) => String(index)).join(",");
  const adaptationSets = hasAudio
    ? `id=0,streams=${videoStreams} id=1,streams=${variants.length}`
    : `id=0,streams=${videoStreams}`;

  args.push(
    "-g",
    String(Math.round(segmentSeconds * fps)),
    "-f",
    "dash",
    "-seg_duration",
    String(segmentSeconds),
    "-use_template",
    "1",
    "-use_timeline",
    "1",
    "-dash_segment_type",
    "webm",
    "-adaptation_sets",
    adaptationSets,
    "-init_seg_name",
    "init-$RepresentationID$.webm",
    "-media_seg_name",
    "chunk-$RepresentationID$-$Number%05d$.webm",
    path.join(outputDir, "manifest.mpd")
  );

  return args;
}

function buildHlsArgs({
  inputPath,
  outputDir,
  codec,
  variants,
  hasAudio,
  audioChannels,
  segmentSeconds,
  preset,
  qualityPreset,
  tune,
}: {
  inputPath: string;
  outputDir: string;
  codec: Exclude<HlsCodec, "vp9">;
  variants: Variant[];
  hasAudio: boolean;
  audioChannels: number;
  segmentSeconds: number;
  preset: string;
  qualityPreset: QualityPreset;
  tune: string | null;
}): string[] {
  const args = ["-hide_banner", "-y", "-i", inputPath];
  const qualityMultiplier = QUALITY_MULTIPLIERS[qualityPreset] * CODEC_RATE_MULTIPLIERS[codec];

  for (let index = 0; index < variants.length; index += 1) {
    args.push("-map", "0:v:0");
    if (hasAudio) args.push("-map", "0:a:0");
  }

  variants.forEach((variant, index) => {
    args.push(
      `-filter:v:${index}`,
      `scale=-2:${variant.height}`,
      `-c:v:${index}`,
      codec === "x265" ? "libx265" : "libx264",
      `-b:v:${index}`,
      scaledRate(variant.bitrate, qualityMultiplier),
      `-maxrate:v:${index}`,
      scaledRate(variant.maxrate, qualityMultiplier),
      `-bufsize:v:${index}`,
      scaledRate(variant.bufsize, qualityMultiplier),
      `-pix_fmt:v:${index}`,
      "yuv420p"
    );
    args.push(`-preset:v:${index}`, preset, `-profile:v:${index}`, "main");
    if (tune && codec === "x264" && X264_TUNES.has(tune)) args.push(`-tune:v:${index}`, tune);
    if (tune && codec === "x265" && X265_TUNES.has(tune)) args.push(`-tune:v:${index}`, tune);
    if (codec === "x265") args.push(`-tag:v:${index}`, "hvc1");
    if (hasAudio) {
      args.push(
        `-c:a:${index}`,
        "aac",
        `-b:a:${index}`,
        scaledRate(variant.audioBitrate, qualityPreset === "small" ? 0.75 : 1),
        `-ac:a:${index}`,
        String(audioChannels)
      );
    }
  });

  const streamMap = variants
    .map((variant, index) =>
      hasAudio
        ? `v:${index},a:${index},name:${variant.height}p`
        : `v:${index},name:${variant.height}p`
    )
    .join(" ");

  args.push(
    "-f",
    "hls",
    "-hls_time",
    String(segmentSeconds),
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-force_key_frames",
    `expr:gte(t,n_forced*${segmentSeconds})`,
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    streamMap
  );

  if (codec === "x264") {
    args.push("-hls_segment_filename", path.join(outputDir, "%v", "seg_%05d.ts"));
  } else {
    args.push(
      "-hls_segment_type",
      "fmp4",
      "-hls_fmp4_init_filename",
      "init.mp4",
      "-hls_segment_filename",
      path.join(outputDir, "%v", "seg_%05d.m4s")
    );
  }

  args.push(path.join(outputDir, "%v", "index.m3u8"));

  return args;
}

async function handleConvert(body: HlsConvertRequest): Promise<{
  status: number;
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array> | string;
}> {
  const inputPathRaw = asTrimmedString(body.inputPath);
  const outputDirRaw = asTrimmedString(body.outputDir);
  const requestedHeights = Array.isArray(body.heights)
    ? body.heights.filter((height): height is number => typeof height === "number")
    : [];
  const selectedCodecs = parseCodecs(body.codecs);
  const segmentSeconds =
    typeof body.segmentSeconds === "number" && Number.isFinite(body.segmentSeconds)
      ? Math.max(2, Math.min(12, Math.round(body.segmentSeconds)))
      : 4;
  const presetRaw = asTrimmedString(body.preset);
  const preset = PRESETS.has(presetRaw) ? presetRaw : "veryfast";
  const qualityPreset =
    body.qualityPreset === "small" || body.qualityPreset === "high"
      ? body.qualityPreset
      : "balanced";
  const tuneRaw = asTrimmedString(body.tune);
  const tune = X264_TUNES.has(tuneRaw) ? tuneRaw : null;

  if (!inputPathRaw || !outputDirRaw) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Input path and output folder are required." }),
    };
  }

  if (selectedCodecs.length === 0) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "At least one codec output is required." }),
    };
  }

  const inputPath = resolveLocalPath(inputPathRaw);
  const outputDir = resolveLocalPath(outputDirRaw);

  if (isUnsafeHlsOutputVsInput(inputPath, outputDir)) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error:
          "Output folder must not be the input file path or sit inside the input file's folder. Choose a sibling directory or another path outside the source directory.",
      }),
    };
  }

  let done: () => void = () => {};
  conversionLocks.set(
    outputDir,
    new Promise<void>((resolve) => {
      done = resolve;
    })
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (text: string) => {
        controller.enqueue(new TextEncoder().encode(text));
      };

      try {
        enqueue(`Input: ${inputPath}\n`);
        enqueue(`Output: ${outputDir}\n\n`);

        const inputStat = await fs.stat(inputPath).catch((err) => {
          console.warn("[dev-hls] Failed to stat input path", inputPath, err);
          return null;
        });
        if (!inputStat || !inputStat.isFile()) {
          enqueue("Input path does not point to a readable file.\n");
          controller.close();
          return;
        }

        await fs.mkdir(outputDir, { recursive: true });

        enqueue("Probing source video...\n");
        const probe = await probeVideo(inputPath);
        enqueue(
          `Source height: ${probe.height ?? "unknown"}; fps: ${probe.fps.toFixed(3)}; audio: ${probe.hasAudio ? `yes (${probe.audioChannels}ch)` : "no"}\n`
        );

        const selectedVariants = VARIANTS.filter((variant) => {
          const requested =
            requestedHeights.length === 0 || requestedHeights.includes(variant.height);
          const notUpscaled = probe.height == null || variant.height <= probe.height;
          return requested && notUpscaled;
        });

        if (selectedVariants.length === 0) {
          enqueue("No renditions selected at or below the source height.\n");
          controller.close();
          return;
        }

        enqueue(
          `Renditions: ${selectedVariants.map((variant) => `${variant.height}p`).join(", ")}\n`
        );
        enqueue(
          `Codec outputs: ${selectedCodecs.map((codec) => CODEC_LABELS[codec]).join(", ")}\n`
        );
        enqueue(`Quality preset: ${qualityPreset}${tune ? `; tune: ${tune}` : ""}\n`);
        enqueue(`Segment length: ${segmentSeconds}s\n\n`);

        const completed: string[] = [];
        for (const codec of selectedCodecs) {
          const codecOutputDir = path.join(outputDir, codec);
          await fs.mkdir(codecOutputDir, { recursive: true });
          const args =
            codec === "vp9"
              ? buildVp9DashArgs({
                  inputPath,
                  outputDir: codecOutputDir,
                  variants: selectedVariants,
                  hasAudio: probe.hasAudio,
                  audioChannels: probe.audioChannels,
                  segmentSeconds,
                  qualityPreset,
                  fps: probe.fps,
                  sourceWidth: probe.width,
                  sourceHeight: probe.height,
                })
              : buildHlsArgs({
                  inputPath,
                  outputDir: codecOutputDir,
                  codec,
                  variants: selectedVariants,
                  hasAudio: probe.hasAudio,
                  audioChannels: probe.audioChannels,
                  segmentSeconds,
                  preset,
                  qualityPreset,
                  tune,
                });

          enqueue(`\n[${CODEC_LABELS[codec]}]\n`);
          enqueue(`Running: ffmpeg ${args.map((arg) => JSON.stringify(arg)).join(" ")}\n\n`);

          const code = await new Promise<number | null>((resolve) => {
            const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
            trackMediaChild(child);

            child.stdout.on("data", (chunk) => enqueue(chunk.toString()));
            child.stderr.on("data", (chunk) => enqueue(chunk.toString()));
            child.on("error", (error) => {
              enqueue(
                `\nFailed to start ffmpeg: ${errorMessageLine(error)}${errorStackSuffix(error)}\n`
              );
              resolve(null);
            });
            child.on("close", (nextCode) => {
              resolve(nextCode);
            });
          });

          if (code !== 0) {
            enqueue(`\n${CODEC_LABELS[codec]} exited with code ${code ?? "unknown"}.\n`);
            controller.close();
            return;
          }

          completed.push(
            `${CODEC_LABELS[codec]}: ${
              codec === "vp9"
                ? path.join(codecOutputDir, "manifest.mpd")
                : path.join(codecOutputDir, "master.m3u8")
            }`
          );
        }

        enqueue("\nDone. Outputs:\n");
        for (const output of completed) enqueue(`- ${output}\n`);

        controller.close();
      } catch (error) {
        enqueue(`\n${errorMessageLine(error) || "Conversion failed."}${errorStackSuffix(error)}\n`);
        controller.close();
      } finally {
        conversionLocks.delete(outputDir);
        done();
      }
    },
  });

  return {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: stream,
  };
}

async function handlePoster(body: HlsPosterRequest): Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
}> {
  const outputDirRaw = asTrimmedString(body.outputDir);
  const posterSecond =
    typeof body.posterSecond === "number" && Number.isFinite(body.posterSecond)
      ? Math.max(0, Math.min(3600, body.posterSecond))
      : 0;

  if (!outputDirRaw) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Output folder is required." }),
    };
  }

  const outputDir = resolveLocalPath(outputDirRaw);
  await waitForConversion(outputDir);
  const masterPath = await findPosterSourceMaster(outputDir);
  if (!masterPath) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Run conversion first. master.m3u8 was not found." }),
    };
  }

  const args = posterArgs(masterPath, outputDir, posterSecond);

  const result = await new Promise<{ status: number; body: string }>((resolve) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    trackMediaChild(child);
    let output = `Extracting poster from ${masterPath} at ${posterSecond.toFixed(2)}s\n\n`;

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        status: 500,
        body: `${output}\nFailed to start ffmpeg: ${errorMessageLine(error)}${errorStackSuffix(error)}\n`,
      });
    });
    child.on("close", (code) => {
      if (code === 0) {
        output += `\nPoster: ${path.join(outputDir, "poster.webp")}\n`;
        resolve({ status: 200, body: output });
      } else {
        output += `\nPoster extraction exited with code ${code ?? "unknown"}.\n`;
        resolve({ status: 500, body: output });
      }
    });
  });

  return {
    status: result.status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: result.body,
  };
}

async function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const maxBodyBytes = 1_000_000;
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBodyBytes) {
      throw new Error(`Request body too large (max ${maxBodyBytes} bytes).`);
    }
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw);
}

function applyCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): string | null {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const allowedOrigin = getAllowedOrigin(origin);
  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", CORS_HEADERS["Access-Control-Allow-Methods"]);
  res.setHeader("Access-Control-Allow-Headers", CORS_HEADERS["Access-Control-Allow-Headers"]);
  return allowedOrigin;
}

function isAuthorized(req: http.IncomingMessage): boolean {
  if (!DEV_TOKEN) return true;
  const tokenHeader = req.headers["x-dev-hls-token"];
  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
  return typeof token === "string" && token === DEV_TOKEN;
}

const server = http.createServer(async (req, res) => {
  // Local-only development helper. Do not deploy this service to public infrastructure.
  const isHlsConvertRoute = req.url === HLS_CONVERT_PATH || req.url === LEGACY_HLS_CONVERT_PATH;
  const isHlsPosterRoute = req.url === HLS_POSTER_PATH;

  if ((isHlsConvertRoute || isHlsPosterRoute) && req.method === "OPTIONS") {
    const allowedOrigin = applyCorsHeaders(req, res);
    if (req.headers.origin && !allowedOrigin) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Origin not allowed." }));
      return;
    }
    res.writeHead(204, {
      "Access-Control-Max-Age": "600",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && isHlsConvertRoute) {
    const allowedOrigin = applyCorsHeaders(req, res);
    if (req.headers.origin && !allowedOrigin) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Origin not allowed." }));
      return;
    }
    if (!isAuthorized(req)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid dev token." }));
      return;
    }
    try {
      const body = (await parseJsonBody(req)) as HlsConvertRequest;
      const result = await handleConvert(body);

      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }

      if (typeof result.body === "string") {
        res.writeHead(result.status);
        res.end(result.body);
      } else {
        res.writeHead(result.status);
        const reader = result.body.getReader();
        async function pump(): Promise<void> {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(value);
          return pump();
        }
        await pump();
      }
    } catch (error) {
      res.writeHead(400, {
        "Content-Type": "application/json",
      });
      res.end(jsonErrorBody(error));
    }
  } else if (req.method === "POST" && isHlsPosterRoute) {
    const allowedOrigin = applyCorsHeaders(req, res);
    if (req.headers.origin && !allowedOrigin) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Origin not allowed." }));
      return;
    }
    if (!isAuthorized(req)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid dev token." }));
      return;
    }
    try {
      const body = (await parseJsonBody(req)) as HlsPosterRequest;
      const result = await handlePoster(body);
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }
      res.writeHead(result.status);
      res.end(result.body);
    } catch (error) {
      res.writeHead(400, {
        "Content-Type": "application/json",
      });
      res.end(jsonErrorBody(error));
    }
  } else if (req.method === "GET" && req.url === "/health") {
    applyCorsHeaders(req, res);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "dev-tools-server" }));
  } else {
    applyCorsHeaders(req, res);
    res.writeHead(404, {});
    res.end("Not found");
  }
});

server.on("error", (err) => {
  console.error("[dev-tools-server] server error:", err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});

let shutdownStarted = false;

function shutdownMediaServer(signal: NodeJS.Signals): void {
  if (shutdownStarted) return;
  shutdownStarted = true;
  console.log(`[dev-tools-server] ${signal} received, stopping…`);
  for (const child of Array.from(trackedMediaChildren)) {
    try {
      child.kill("SIGTERM");
    } catch (err) {
      console.warn("[dev-hls] Failed to kill media child process", err);
    }
  }
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[dev-tools-server] exit after shutdown timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.once("SIGINT", () => shutdownMediaServer("SIGINT"));
process.once("SIGTERM", () => shutdownMediaServer("SIGTERM"));

/** Kill any stale process already bound to PORT so the dev server can start cleanly. */
function reclaimPort(): void {
  try {
    const pid = execSync(`lsof -ti :${PORT}`, { encoding: "utf8" }).trim();
    if (!pid) return;
    // lsof can return multiple PIDs (e.g. a child of the same server); kill all.
    const pids = pid.split("\n").filter(Boolean);
    for (const id of pids) {
      // Never kill our own process.
      if (Number(id) === process.pid) continue;
      console.log(`[dev-tools-server] Port ${PORT} held by PID ${id} — reclaiming…`);
      execSync(`kill -9 ${id}`, { stdio: "ignore" });
    }
  } catch {
    // lsof exits non-zero when nothing is on the port — that's fine.
  }
}

/** Probe whether PORT is free by briefly trying to listen on it. */
function probePortFree(): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });
    probe.listen(PORT, HOST);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listenWithReclaim(): Promise<void> {
  if (await probePortFree()) {
    // Port is free — start immediately.
    server.listen(PORT, HOST, () => logStartup());
    return;
  }

  console.log(`[dev-tools-server] Port ${PORT} is in use — reclaiming stale process…`);
  reclaimPort();

  // Wait up to 3 seconds for the OS to release the port.
  for (let i = 0; i < 15; i++) {
    await delay(200);
    if (await probePortFree()) {
      server.listen(PORT, HOST, () => logStartup());
      return;
    }
  }

  console.error(`[dev-tools-server] Port ${PORT} still in use after reclaim attempt. Giving up.`);
  process.exit(1);
}

function logStartup(): void {
  console.log(`[dev-tools-server] Listening on http://${HOST}:${PORT}`);
  console.log(`[dev-tools-server] Media root: ${MEDIA_ROOT}`);
  console.log(`[dev-tools-server] HLS convert: POST ${HLS_CONVERT_PATH}`);
  console.log(`[dev-tools-server] HLS poster: POST ${HLS_POSTER_PATH}`);
}

listenWithReclaim();
