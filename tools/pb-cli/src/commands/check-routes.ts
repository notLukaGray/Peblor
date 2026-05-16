import { findPagesDir, walkPages, readPageJson, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type CheckRoutesArgs = {
  asJson: boolean;
  help: boolean;
};

type BrokenLink = {
  sourceRoute: string;
  href: string;
  path: string;
};

function parseArgs(args: string[]): CheckRoutesArgs {
  return {
    asJson: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function collectHrefs(
  node: unknown,
  segments: string[],
  results: Array<{ href: string; path: string }>
): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectHrefs(item, [...segments, String(i)], results));
    return;
  }
  if (!isRecord(node)) return;

  for (const [key, value] of Object.entries(node)) {
    const childPath = [...segments, key];
    if (key === "href" && typeof value === "string" && value.startsWith("/")) {
      results.push({ href: value, path: childPath.join(".") });
    }
    // navigate action payload
    if (
      key === "type" &&
      value === "navigate" &&
      isRecord(node.payload) &&
      typeof (node.payload as Record<string, unknown>).href === "string"
    ) {
      const href = (node.payload as Record<string, unknown>).href as string;
      if (href.startsWith("/")) {
        results.push({ href, path: [...segments, "payload", "href"].join(".") });
      }
    }
    collectHrefs(value, childPath, results);
  }
}

export async function runCheckRoutes(args: string[], io: CommandIo): Promise<number> {
  const { asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli check-routes [--json]");
    io.printText("\nValidates all internal navigation targets against the known page route list.");
    return 0;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "check-routes", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const allPageEntries = walkPages(pagesDir);
  const knownRoutes = new Set(allPageEntries.map((p) => p.route.replace(/\/$/, "") || "/"));
  const broken: BrokenLink[] = [];
  let totalLinksChecked = 0;

  for (const { route, file } of allPageEntries) {
    const read = readPageJson(file);
    if (!read.ok) continue;
    const found: Array<{ href: string; path: string }> = [];
    collectHrefs(read.data, [], found);
    for (const { href, path } of found) {
      const normalized = href.replace(/\/$/, "").split("?")[0]!.replace(/\/$/, "") || "/";
      totalLinksChecked++;
      if (!knownRoutes.has(normalized)) {
        broken.push({ sourceRoute: route, href, path });
      }
    }
  }

  if (asJson) {
    const payload = {
      command: "check-routes",
      totalLinksChecked,
      brokenCount: broken.length,
      broken,
    };
    if (broken.length > 0) io.printErrorJson(payload);
    else io.printJson(payload);
  } else {
    io.printText(
      `check-routes: ${totalLinksChecked} internal link(s) checked, ${broken.length} broken`
    );
    if (broken.length > 0) {
      io.printText("");
      for (const b of broken) {
        io.printText(`  ${b.sourceRoute} @ ${b.path} → ${b.href}  (no matching page)`);
      }
    }
  }

  return broken.length > 0 ? 1 : 0;
}
