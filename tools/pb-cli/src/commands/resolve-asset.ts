import { getSignedCdnUrl } from "@pb/core/lib/cdn-asset-server";
import type { CommandIo } from "./types.js";

type ResolveAssetArgs = {
  assetPath?: string;
  width?: string;
  height?: string;
  quality?: string;
  format?: string;
  asJson: boolean;
  help: boolean;
};

function parseResolveAssetArgs(args: string[]): ResolveAssetArgs {
  const asJson = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const width = flag("--width");
  const height = flag("--height");
  const quality = flag("--quality");
  const format = flag("--format");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { assetPath: positional[0], width, height, quality, format, asJson, help };
}

export async function runResolveAsset(args: string[], io: CommandIo): Promise<number> {
  const { assetPath, width, height, quality, format, asJson, help } = parseResolveAssetArgs(args);

  if (help) {
    io.printText(
      "Usage: pb-cli resolve-asset <path> [--width n] [--height n] [--quality n] [--format webp] [--json]"
    );
    io.printText("");
    io.printText("Resolves a raw CDN asset path to a fully signed URL.");
    return 0;
  }

  if (!assetPath) {
    io.printErrorText("Error: asset path is required.");
    io.printText(
      "Usage: pb-cli resolve-asset <path> [--width n] [--height n] [--format webp] [--json]"
    );
    return 2;
  }

  try {
    const extraParams: Record<string, string> = {};
    if (width) extraParams["width"] = width;
    if (height) extraParams["height"] = height;
    if (quality) extraParams["quality"] = quality;
    if (format) extraParams["format"] = format;

    const url = getSignedCdnUrl(
      assetPath,
      Object.keys(extraParams).length > 0 ? extraParams : undefined
    );

    if (asJson) {
      io.printJson({
        command: "resolve-asset",
        status: "ok",
        input: assetPath,
        url,
        ...(Object.keys(extraParams).length > 0 ? { params: extraParams } : {}),
      });
    } else {
      io.printText(url);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (asJson) io.printErrorJson({ command: "resolve-asset", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }
}
