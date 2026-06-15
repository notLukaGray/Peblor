import fs from "fs";
import path from "path";

import { findRepoRoot, inferRouteFromUrl, inferSitenameFromUrl } from "./paths.js";
import { buildPass1Pre, buildPass2Pre, buildPass3Pre } from "./prompts-pre.js";
import { buildPass4Generate } from "./prompts-generate.js";
import { buildPass5Post, passPrereqFiles, suggestedPassFor } from "./prompts-post.js";

import type { CommandIo } from "../types.js";

type StealPageArgs = {
  url?: string;
  route?: string;
  pass?: number;
  dryRun: boolean;
  asJson: boolean;
  help: boolean;
};

function parseStealPageArgs(args: string[]): StealPageArgs {
  const asJson = args.includes("--json");
  const dryRun = args.includes("--dry-run");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const route = flag("--route");
  const passStr = flag("--pass");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--dry-run", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  const pass = passStr ? parseInt(passStr, 10) : undefined;
  return { url: positional[0], route, pass, dryRun, asJson, help };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export async function runStealPage(args: string[], io: CommandIo): Promise<number> {
  const { url, route: routeArg, pass, dryRun, asJson, help } = parseStealPageArgs(args);

  if (help) {
    io.printText("Usage: pb-cli steal <url> [--route /path] [--pass N] [--dry-run] [--json]");
    io.printText("");
    io.printText(
      "5-pass steal pipeline. Pre scripts (1-3) extract data. Pass 4 is AI generation. Post (5) validates."
    );
    io.printText("  --pass 1   Pre: Layout map (DOM structure, sections, nav, footer)");
    io.printText("  --pass 2   Pre: Media harvest (images, SVG logos, asset manifest)");
    io.printText("  --pass 3   Pre: Typography + colors (fonts, weights, fills)");
    io.printText("  --pass 4   Generate: AI reasons about DOM→Peblor mapping (DEFAULT)");
    io.printText("  --pass 5   Post: Visual diff + patch");
    io.printText("");
    io.printText("State files written to: content/pages/<route>/stealState/");
    io.printText("--dry-run: show prompt without writing");
    return 0;
  }

  if (!url) {
    io.printErrorText("Error: URL is required.");
    io.printText("Usage: pb-cli steal <url> [--route /path] [--pass N] [--dry-run] [--json]");
    return 2;
  }

  const route = routeArg ?? inferRouteFromUrl(url);
  const sitename = inferSitenameFromUrl(url);
  const passNum = pass ?? 4; // default to Pass 4 (AI generation)

  const repoRoot = findRepoRoot();
  const stateDir = path.join(repoRoot, "content/pages", route, "stealState");
  const missingPrereqs = passPrereqFiles(passNum, repoRoot, route, stateDir).filter(
    (f) => !fs.existsSync(f)
  );
  if (missingPrereqs.length > 0 && !dryRun) {
    const suggestedPass = suggestedPassFor(passNum);
    const blocked = {
      status: "blocked",
      pass: passNum,
      route,
      reason: `Pass ${passNum} requires output files from earlier passes that don't exist yet.`,
      missingPrereqs,
      suggestedPass,
      suggestion: `Run \`pb-cli steal ${url} --route ${route} --pass ${suggestedPass}\` first (and any passes between ${suggestedPass} and ${passNum}), then retry pass ${passNum}.`,
    };
    if (asJson) {
      io.printJson(blocked);
    } else {
      io.printText(JSON.stringify(blocked, null, 2));
    }
    return 1;
  }

  const shared = { url, route, sitename };

  let result: Record<string, unknown>;
  switch (passNum) {
    case 1:
      result = buildPass1Pre(shared);
      break;
    case 2:
      result = buildPass2Pre(shared);
      break;
    case 3:
      result = buildPass3Pre(shared);
      break;
    case 4:
      result = buildPass4Generate(shared);
      break;
    case 5:
      result = buildPass5Post(shared);
      break;
    default:
      io.printErrorText(`Error: invalid pass ${passNum}. Must be 1-5.`);
      return 2;
  }

  if (dryRun) {
    result["dryRun"] = true;
  }

  if (asJson) {
    io.printJson(result);
  } else {
    io.printText(JSON.stringify(result, null, 2));
  }

  return 0;
}
