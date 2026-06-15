import path from "path";
import chokidar, { type FSWatcher } from "chokidar";

export const runtime = "nodejs";
import { regenerateProtectedSlugsFile } from "@/core/lib/generate-protected-slugs";
import { devApiDisabledResponse, isDevApiEnabled } from "@/core/lib/dev-api-enabled";

/** Timestamp when any file under content last changed; updated by watcher. */
let lastContentChange = 0;

let watcherInitialized = false;
let watcher: FSWatcher | null = null;
let slugRegenTimer: ReturnType<typeof setTimeout> | null = null;

function initWatcher(abortSignal?: AbortSignal) {
  if (watcherInitialized) return;
  watcherInitialized = true;

  const contentDir = path.join(process.cwd(), "../../content");
  watcher = chokidar.watch(contentDir, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50,
    },
  });

  const bump = () => {
    lastContentChange = Date.now();
    scheduleSlugRegen();
  };

  watcher.on("add", bump);
  watcher.on("change", bump);
  watcher.on("unlink", bump);

  abortSignal?.addEventListener(
    "abort",
    () => {
      void watcher?.close();
      watcher = null;
      watcherInitialized = false;
    },
    { once: true }
  );
}

function scheduleSlugRegen() {
  if (slugRegenTimer) clearTimeout(slugRegenTimer);
  slugRegenTimer = setTimeout(() => {
    void regenerateProtectedSlugsFile().catch((err) => {
      console.warn("[web] Failed to regenerate protected slugs file (dev-only convenience)", err);
    });
  }, 1000);
}

export async function GET(request: Request) {
  if (!isDevApiEnabled()) {
    return devApiDisabledResponse();
  }

  initWatcher(request.signal);

  return Response.json({ lastContentChange });
}
