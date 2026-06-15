import fs from "fs/promises";
import path from "path";
import os from "os";
import { devApiDisabledResponse, isDevApiEnabled } from "@/core/lib/dev-api-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DirEntry = {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
};

type BrowseResult = {
  path: string;
  entries: DirEntry[];
  parent: string | null;
};

const ROOTS = (() => {
  const cwd = process.cwd();
  const candidates = [path.resolve(cwd, "../.."), cwd, os.homedir(), "/"];
  return [...new Set(candidates)];
})();

const MAX_DIR_ENTRIES = 500;

async function listDirectory(
  dirPath: string
): Promise<BrowseResult | { error: string; status: number }> {
  const normalized = path.normalize(dirPath);

  let stat: ReturnType<typeof fs.stat> extends Promise<infer T> ? T : never;
  try {
    stat = await fs.stat(normalized);
  } catch (err) {
    console.warn("[studio] Failed to stat local browse path", normalized, err);
    return { error: "Directory not found", status: 404 };
  }

  if (!stat.isDirectory()) {
    return { error: "Path is not a directory", status: 400 };
  }

  let names: string[];
  try {
    names = await fs.readdir(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Permission denied";
    return { error: message, status: 403 };
  }

  // Sort: dotfiles first, directories first, then alphabetically
  const sorted = names
    .filter((n) => {
      // Filter out system junk
      if (n === "$RECYCLE.BIN" || n === "System Volume Information") return false;
      return true;
    })
    .sort((a, b) => {
      const aDot = a.startsWith(".");
      const bDot = b.startsWith(".");
      if (aDot !== bDot) return aDot ? -1 : 1;
      return a.localeCompare(b, "en", { sensitivity: "base" });
    })
    .slice(0, MAX_DIR_ENTRIES);

  const entries: DirEntry[] = [];
  for (const name of sorted) {
    const entryPath = path.join(normalized, name);
    let isDirectory = false;
    let isFile = false;
    let size = 0;
    try {
      const entryStat = await fs.stat(entryPath);
      isDirectory = entryStat.isDirectory();
      isFile = entryStat.isFile();
      size = entryStat.size;
    } catch (err) {
      console.warn("[studio] Failed to stat directory entry during local browse", entryPath, err);
      continue;
    }
    if (isDirectory || isFile) {
      entries.push({ name, isDirectory, isFile, size });
    }
  }

  // Separate directories and files for proper ordering
  const dirs = entries.filter((e) => e.isDirectory);
  const files = entries.filter((e) => e.isFile);
  const ordered = [...dirs, ...files];

  const parentPath = path.dirname(normalized);
  const parent = parentPath !== normalized ? parentPath : null;

  return { path: normalized, entries: ordered, parent };
}

export async function GET(request: Request) {
  if (!isDevApiEnabled()) {
    return devApiDisabledResponse();
  }

  const url = new URL(request.url);
  const dirParam = url.searchParams.get("dir")?.trim();

  // If no dir specified, return the root options
  if (!dirParam) {
    return Response.json({ roots: ROOTS });
  }

  const result = await listDirectory(dirParam);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(result);
}
