/**
 * Load project-root .env into process.env early, before any other module reads
 * process.env. Next.js 16 Turbopack does not reliably inherit shell-sourced env
 * vars into API route / middleware workers, so we parse the file explicitly.
 *
 * Call this once at the top of every entry-point module that reads env vars
 * (proxy.ts, route handlers, etc.). It is idempotent and fast after first call.
 */

import fs from "fs";
import path from "path";

let loaded = false;

function findProjectRoot(): string | null {
  let dir = path.resolve(process.cwd());
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "peblor.config.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;

    if (key in process.env) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    const commentIdx = value.indexOf(" #");
    if (commentIdx !== -1) value = value.slice(0, commentIdx).trim();

    process.env[key] = value;
  }
}

export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;

  const projectRoot = findProjectRoot();
  if (projectRoot) {
    loadEnvFile(path.join(projectRoot, ".env"));
  }
}
