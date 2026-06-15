import type { HlsCodec } from "./hls-tools-ui";

const CODEC_ORDER: HlsCodec[] = ["vp9", "x265", "x264"];

const SOURCE_TYPES: Record<HlsCodec, string> = {
  vp9: 'video/webm; codecs="vp09.00.51.08"',
  x265: 'application/vnd.apple.mpegurl; codecs="hvc1.1.6.L123.B0,mp4a.40.2"',
  x264: 'application/vnd.apple.mpegurl; codecs="avc1.64001f,mp4a.40.2"',
};

const SOURCE_LABELS: Record<HlsCodec, string> = {
  vp9: "VP9 DASH",
  x265: "x265 HLS",
  x264: "x264 HLS fallback",
};

function orderedCodecs(codecs: HlsCodec[]): HlsCodec[] {
  const selected = new Set(codecs);
  return CODEC_ORDER.filter((codec) => selected.has(codec));
}

function folderValue(assetFolder: string): string {
  return assetFolder.trim().replace(/^\/+|\/+$/g, "");
}

export function buildSrcSnippet(assetFolder: string, codecs: HlsCodec[]): string {
  const folder = folderValue(assetFolder);
  const primaryCodec = orderedCodecs(codecs)[0] ?? "vp9";
  const manifest = primaryCodec === "vp9" ? "manifest.mpd" : "master.m3u8";
  return folder ? `${folder}/${primaryCodec}/${manifest}` : "";
}

export function buildElementSnippet(assetFolder: string, codecs: HlsCodec[]): string {
  const folder = assetFolder.trim().replace(/^\/+|\/+$/g, "");
  if (!folder) return "";

  const sources = orderedCodecs(codecs).map((codec) => ({
    src: `${folder}/${codec}/${codec === "vp9" ? "manifest.mpd" : "master.m3u8"}`,
    type: SOURCE_TYPES[codec],
    label: SOURCE_LABELS[codec],
  }));
  const primary = sources[0]?.src ?? `${folder}/vp9/manifest.mpd`;

  return JSON.stringify(
    {
      type: "elementVideo",
      src: primary,
      sources,
      poster: `${folder}/poster.webp`,
      module: "video-player",
    },
    null,
    2
  );
}

export function conversionSucceeded(log: string): boolean {
  return log.includes("Done. Outputs:");
}

export function fallbackText(value: string, fallback: string): string {
  return value || fallback;
}

export function conversionButtonLabel(isRunning: boolean): string {
  return isRunning ? "Converting..." : "Run HLS conversion";
}

export function canRunConversion({
  isRunning,
  selectedCodecCount,
  selectedHeightCount,
  inputPath,
  outputDir,
}: {
  isRunning: boolean;
  selectedCodecCount: number;
  selectedHeightCount: number;
  inputPath: string;
  outputDir: string;
}): boolean {
  return (
    !isRunning &&
    selectedCodecCount > 0 &&
    selectedHeightCount > 0 &&
    inputPath.trim() !== "" &&
    outputDir.trim() !== ""
  );
}

export async function streamTextResponse(
  response: Response,
  onText: (text: string) => void
): Promise<string> {
  if (!response.body) return `Request failed: ${response.status} ${response.statusText}`;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }

  text += decoder.decode();
  onText(text);
  return text;
}

export async function requestLocalPath(mode: "file" | "folder"): Promise<string | null> {
  const response = await fetch("/api/dev/local-dialog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  const data = (await response.json()) as {
    path?: string;
    cancelled?: boolean;
    error?: string;
  };

  if (data.path) return data.path;
  if (data.cancelled) return null;
  throw new Error(data.error || "Path picker failed.");
}
