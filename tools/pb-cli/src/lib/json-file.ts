import fs from "node:fs";
import path from "node:path";
import { isRecord } from "@pb/core";
export { isRecord };

export function resolveInputPath(inputPath: string): string {
  return path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
}

export function readJsonFile(
  filePath: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  const absolute = resolveInputPath(filePath);
  if (!fs.existsSync(absolute)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }

  try {
    const content = fs.readFileSync(absolute, "utf8");
    return { ok: true, value: JSON.parse(content) as unknown };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to read/parse JSON: ${filePath} (${error instanceof Error ? error.message : String(error)})`,
    };
  }
}
