import fs from "fs";
import path from "path";

export function inferRouteFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const pathname = u.pathname.replace(/\/$/, "") || "/";
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "/stolen/home";
    const last = segments[segments.length - 1]!.replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-]/gi, "-")
      .toLowerCase()
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `/stolen/${last || "page"}`;
  } catch (err) {
    console.warn("[pb-cli] Failed to infer route from URL", url, err);
    return "/stolen/page";
  }
}

export function inferSitenameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").replace(/\./g, "-");
  } catch (err) {
    console.warn("[pb-cli] Failed to infer sitename from URL", url, err);
    return "site";
  }
}

// Walk up from cwd looking for the repo root — the directory that contains both
// `content/pages` and `apps/web`. `stateDir`/`pageDir` MUST be anchored to this
// absolute path (not naive relative strings): the workflow JSON they're baked into
// is executed by a *separate* agent, in its own session, from whatever cwd it
// happens to be in — a relative `content/pages/<route>/stealState` resolves to a
// different (wrong) location depending on that cwd, which is exactly how an
// earlier steal ended up with state files split across three directories
// (see agents/steal-page-refinement/audit-02-pipeline-orchestration.md §a).
export function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (
      fs.existsSync(path.join(dir, "content/pages")) &&
      fs.existsSync(path.join(dir, "apps/web"))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}
