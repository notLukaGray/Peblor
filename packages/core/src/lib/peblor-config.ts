import fs from "fs";
import path from "path";

export interface PeblorConfig {
  contentDir?: string;
  validatePagesBaseRef?: string;
  enableDevApi?: boolean;
  rateLimitMemoryMax?: number;
  rateLimitCookieSameSite?: "Lax" | "Strict";
}

const CONFIG_FILE = "peblor.config.json";

function findConfigFile(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, CONFIG_FILE);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadConfig(configPath: string): PeblorConfig | null {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as PeblorConfig;
  } catch (err) {
    console.warn("[pb-core] Failed to parse config file", configPath, err);
    return null;
  }
}

export function readPeblorConfig(cwd?: string): PeblorConfig | null {
  const configPath = findConfigFile(cwd ?? process.cwd());
  if (!configPath) return null;
  return loadConfig(configPath);
}

export function resolveContentDir(cwd?: string): string {
  const startDir = cwd ?? process.cwd();

  // 1. peblor.config.json
  const configPath = findConfigFile(startDir);
  if (configPath) {
    const config = loadConfig(configPath);
    if (config?.contentDir && typeof config.contentDir === "string") {
      const resolved = path.resolve(path.dirname(configPath), config.contentDir);
      if (fs.existsSync(resolved)) return resolved;
    }
  }

  // 2. PB_CONTENT_DIR env var
  const envPath = process.env.PB_CONTENT_DIR;
  if (typeof envPath === "string" && envPath.trim().length > 0) {
    const explicit = path.isAbsolute(envPath) ? envPath : path.resolve(envPath);
    if (fs.existsSync(explicit)) return explicit;
  }

  // 3. Default candidates
  const candidates = [path.join(startDir, "content"), path.join(startDir, "src/content")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // 4. Fallback
  return path.join(startDir, "content");
}
