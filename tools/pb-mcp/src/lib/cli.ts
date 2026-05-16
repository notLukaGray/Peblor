import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CLI_ENTRY, PEBLOR_ROOT } from "./paths.js";

const execFileAsync = promisify(execFile);

export async function runCli(args: string[]): Promise<unknown> {
  try {
    const { stdout } = await execFileAsync("npx", ["tsx", CLI_ENTRY, ...args, "--json"], {
      cwd: PEBLOR_ROOT,
    });
    return JSON.parse(stdout.trim());
  } catch (err: unknown) {
    if (err && typeof err === "object" && "stdout" in err) {
      const stdout = (err as { stdout: string }).stdout.trim();
      if (stdout) return JSON.parse(stdout);
    }
    throw err;
  }
}
