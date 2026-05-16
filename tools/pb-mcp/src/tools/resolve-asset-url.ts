import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";

export const resolveAssetUrl: Tool = {
  def: {
    name: "resolve_asset_url",
    description:
      "Given a raw CDN asset path, return the fully signed Bunny CDN URL. Optionally specify image transform params.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Raw asset path (e.g. 'images/hero.jpg')" },
        width: { type: "number", description: "Image width transform" },
        height: { type: "number", description: "Image height transform" },
        quality: { type: "number", description: "Image quality (1-100)" },
        format: {
          type: "string",
          enum: ["webp", "avif", "jpeg", "png"],
          description: "Image format transform",
        },
      },
      required: ["path"],
    },
  },
  run: async (args) => {
    const {
      path: assetPath,
      width,
      height,
      quality,
      format,
    } = args as {
      path: string;
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    };
    const cliArgs = ["resolve-asset", assetPath];
    if (width) cliArgs.push("--width", String(width));
    if (height) cliArgs.push("--height", String(height));
    if (quality) cliArgs.push("--quality", String(quality));
    if (format) cliArgs.push("--format", format);
    return runCli(cliArgs);
  },
};
