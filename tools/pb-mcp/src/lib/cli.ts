import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CLI_ENTRY, PEBLOR_ROOT } from "./paths.js";

const execFileAsync = promisify(execFile);

/** Default timeout for CLI subprocesses (30 seconds). */
const CLI_TIMEOUT_MS = 30_000;

/** Check whether NODE_ENV or the DEBUG env var indicates a dev/verbose session. */
function isDev(): boolean {
  return process.env.NODE_ENV === "development" || process.env.DEBUG != null;
}

/**
 * Run a pb-cli command and return its JSON result.
 *
 * The CLI writes success payloads to stdout and error/diagnostic payloads to stderr
 * (via printErrorJson). Both are valid structured JSON — we try stdout first, then
 * stderr, so that structured failure diagnostics are never silently dropped.
 */
export async function runCli(args: string[]): Promise<unknown> {
  const cmd = ["tsx", CLI_ENTRY, ...args, "--json"];
  const cmdDisplay = `npx ${cmd.join(" ")}`;

  if (isDev()) {
    process.stderr.write(`[pb-mcp] Spawning subprocess (slow path): ${cmdDisplay}\n`);
  }

  try {
    const { stdout } = await execFileAsync("npx", cmd, {
      cwd: PEBLOR_ROOT,
      timeout: CLI_TIMEOUT_MS,
      env: { ...process.env, PB_NO_COLOR: "1" },
    });
    return JSON.parse(stdout.trim());
  } catch (err: unknown) {
    if (err && typeof err === "object") {
      // Try stdout first (some CLI paths emit JSON to stdout even on non-zero exit).
      const stdout = ("stdout" in err ? (err as { stdout: string }).stdout : "").trim();
      if (stdout) {
        try {
          return JSON.parse(stdout);
        } catch (err) {
          console.warn("[pb-mcp] Failed to parse CLI stdout as JSON", err);
        }
      }

      // Try stderr: the CLI emits structured diagnostics here via printErrorJson.
      const stderr = ("stderr" in err ? (err as { stderr: string }).stderr : "").trim();
      if (stderr) {
        try {
          return JSON.parse(stderr);
        } catch (err) {
          console.warn("[pb-mcp] Failed to parse CLI stderr as JSON", err);
        }
      }

      // Augment the error message with the command that failed.
      const execError = err as Error;
      if (
        execError.name === "TimeoutError" ||
        ("killed" in execError && (execError as { killed?: boolean }).killed)
      ) {
        execError.message = `Command timed out after ${CLI_TIMEOUT_MS}ms: ${cmdDisplay}`;
      } else if (!execError.message.includes(cmdDisplay)) {
        execError.message = `Command failed: ${cmdDisplay} — ${execError.message}`;
      }
    }
    throw err;
  }
}
