import { spawn } from "child_process";
import { devApiDisabledResponse, isDevApiEnabled } from "@/core/lib/dev-api-enabled";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DialogRequest = {
  mode?: unknown;
};

function runOsascript(script: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn("osascript", ["-e", script], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ stdout: "", stderr: error.message, code: 1 });
    });
    child.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

export async function POST(request: Request) {
  if (!isDevApiEnabled()) {
    return devApiDisabledResponse();
  }

  if (process.platform !== "darwin") {
    return Response.json(
      { error: "Native path picker is only available on macOS in this dev tool." },
      { status: 400 }
    );
  }

  let body: DialogRequest;
  try {
    body = (await request.json()) as DialogRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode === "folder" ? "folder" : body.mode === "file" ? "file" : null;
  if (!mode) {
    return Response.json({ error: "Dialog mode must be file or folder." }, { status: 400 });
  }

  const script =
    mode === "file"
      ? 'POSIX path of (choose file with prompt "Select source video")'
      : 'POSIX path of (choose folder with prompt "Select HLS output folder")';
  const result = await runOsascript(script);

  if (result.code === 0) {
    return Response.json({ path: result.stdout.trim() });
  }

  if (result.stderr.includes("-128")) {
    return Response.json({ cancelled: true });
  }

  return Response.json({ error: result.stderr.trim() || "Dialog failed." }, { status: 500 });
}
